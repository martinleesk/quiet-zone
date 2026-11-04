import "dart:io";

import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/main.dart";
import "package:quiet_zone/src/game_controller.dart";
import "package:quiet_zone/src/game_link.dart";
import "package:quiet_zone/src/role_catalog.dart";

class _FakeLink implements GameLink {
  _FakeLink(this.onSend);

  final void Function(Map<String, dynamic> message) onSend;
  void Function(Map<String, dynamic> message)? _onMessage;

  @override
  Future<void> open(void Function(Map<String, dynamic> message) onMessage) async {
    _onMessage = onMessage;
  }

  @override
  void send(Map<String, dynamic> message) => onSend(message);

  @override
  Future<void> close() async {}

  void emit(Map<String, dynamic> message) => _onMessage?.call(message);
}

Map<String, dynamic> _seat(String id, String name, {bool ai = true}) => {
      "id": id,
      "nickname": name,
      "isAi": ai,
      "alive": true,
      "sealed": false,
      "lobbyReady": ai,
    };

Map<String, dynamic> _state({
  required String phase,
  required String phaseLabel,
  int round = 1,
  int night = 0,
  List<Map<String, dynamic>>? log,
  List<Map<String, dynamic>>? nightActions,
  bool canSpeak = false,
  bool canVote = false,
}) {
  return {
    "type": "state",
    "public": {
      "code": "TRIAL",
      "phase": phase,
      "phaseLabel": phaseLabel,
      "round": round,
      "night": night,
      "banner": "試玩",
      "composition": {"lighthouse": 7, "silence": 3, "grey": 1},
      "seats": [
        _seat("s1", "夜歸人", ai: false),
        for (var i = 2; i <= 11; i++) _seat("s$i", "席$i"),
      ],
      "log": log ?? [],
      "pins": [],
      "disconnects": 0,
      "disconnectsToWin": 3,
      "winner": null,
      "locked": phase != "lobby",
      "secondsLeft": 20,
      "reveal": null,
    },
    "private": {
      "playerId": "trial-human",
      "seatId": "s1",
      "isHost": true,
      "alive": true,
      "canSpeak": canSpeak,
      "canVote": canVote,
      "ready": phase == "lobby",
      "role": phase == "lobby"
          ? null
          : {
              "id": "cover",
              "name": "掩護員",
              "faction": "lighthouse",
              "factionLabel": "燈塔網",
              "skill": "臨時掩護：免疫該夜失聯。成功後下一夜唔可以再成功。",
            },
      "teammates": [],
      "inbox": [],
      "nightActions": nightActions ?? [],
      "skillActions": [],
      "anonymousVote": false,
      "fakeCharges": 0,
      "muted": false,
      "marks": [],
      "silenceChannel": [],
      "tips": [],
      "remnants": [],
    },
  };
}

void main() {
  testWidgets("trial home opens a local room of AI seats", (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 460));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final sent = <Map<String, dynamic>>[];
    final link = _FakeLink(sent.add);
    final controller = GameController(trial: true, link: link);
    await tester.pumpWidget(QuietZoneApp(controller: controller));

    expect(find.text("開試玩房"), findsOneWidget);
    expect(find.text("伺服器"), findsNothing);
    expect(find.text("封鎖夜 · 標準 Mode 試玩"), findsOneWidget);

    await tester.tap(find.byKey(const Key("trial-open")));
    await tester.pump();
    expect(sent.single["type"], "create_room");

    link.emit(_state(phase: "lobby", phaseLabel: "組席"));
    await tester.pump();
    expect(find.byKey(const Key("landscape-lobby")), findsOneWidget);
    expect(find.text("AI"), findsNWidgets(10));
    expect(find.text("開始封鎖（AI 補滿 11 席）"), findsOneWidget);
    controller.dispose();
  });

  testWidgets("trial day draft and night use the table art", (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 460));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final link = _FakeLink((_) {});
    final controller = GameController(trial: true, link: link);
    await tester.pumpWidget(QuietZoneApp(controller: controller));
    await tester.tap(find.byKey(const Key("trial-open")));
    await tester.pump();

    link.emit(_state(
      phase: "draft",
      phaseLabel: "私人草稿",
      canSpeak: true,
      log: [
        {"text": "草稿｜霧港燈：我跟多數票，唔追加指控。"},
      ],
    ));
    await tester.pump();
    expect(find.byKey(const Key("landscape-table")), findsOneWidget);
    expect(find.byKey(const Key("scene-draft")), findsOneWidget);
    expect(find.text("交草稿並準備"), findsOneWidget);
    await tester.enterText(find.byType(TextField), "試玩草稿：先聽完再隔離。");
    await tester.pump();
    expect(find.text("試玩草稿：先聽完再隔離。"), findsOneWidget);

    link.emit(_state(
      phase: "night",
      phaseLabel: "熄燈行動",
      night: 1,
      nightActions: [
        {"action": "cover", "label": "臨時掩護", "needsTarget": true},
        {"action": "skip", "label": "跳過今夜", "needsTarget": false},
      ],
    ));
    await tester.pump();
    expect(find.byKey(const Key("scene-night")), findsOneWidget);
    expect(find.text("臨時掩護"), findsOneWidget);
    expect(find.text("提交行動"), findsOneWidget);
    controller.dispose();
  });

  test("phone trial page keeps the public codex and the engine bundle", () {
    final html = File("../../docs/trial/index.html").readAsStringSync();
    final app = File("../../docs/trial/app.js").readAsStringSync();
    expect(html, contains("engine.js"));
    expect(html, contains("zh-Hant"));
    expect(File("../../docs/trial/engine.js").existsSync(), isTrue);
    for (final role in kStandardRoles) {
      expect(app, contains(role.name), reason: role.id);
      expect(app, contains(role.skill), reason: role.id);
    }
    expect(app, contains("消音組全部離場就解封。"));
    expect(app, contains("成功失聯 3 次，或者燈塔網已無法投票。"));
    expect(app, contains("孤證客仍在場，正確標記消音組達 2 即獨贏。"));
    expect(html, contains("../ui-demo/art/scenes/day_talk.jpg"));
    expect(html, contains("../ui-demo/art/scenes/night.jpg"));
  });
}
