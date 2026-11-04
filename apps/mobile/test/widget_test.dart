import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/main.dart";
import "package:quiet_zone/src/game_controller.dart";
import "package:quiet_zone/src/protocol.dart";
import "package:quiet_zone/src/table_page.dart";

void main() {
  test("parser keeps composition and AI flag, and does not invent a role", () {
    final message = parseServerMessage({
      "type": "state",
      "public": {
        "code": "ABCD",
        "phase": "boot",
        "phaseLabel": "開局抽身分",
        "round": 0,
        "composition": {"lighthouse": 7, "silence": 3, "grey": 1},
        "seats": [
          {"id": "s1", "nickname": "夜歸人", "isAi": false, "alive": true, "sealed": false},
          {"id": "s2", "nickname": "霧港燈", "isAi": true, "alive": true, "sealed": false},
        ],
        "log": [
          {"text": "公開組成：燈塔網 ×7、消音組 ×3、灰頻 ×1。"},
        ],
        "disconnects": 0,
        "disconnectsToWin": 3,
        "winner": null,
      },
      "private": {
        "playerId": "p1",
        "seatId": "s1",
        "isHost": true,
        "role": {
          "id": "cover",
          "name": "掩護員",
          "faction": "lighthouse",
          "factionLabel": "燈塔網",
          "skill": "臨時掩護",
        },
      },
    });
    expect(message, isA<SnapshotMessage>());
    final snapshot = (message! as SnapshotMessage).snapshot;
    expect(snapshot.public.composition.silence, 3);
    expect(snapshot.public.seats[1].isAi, isTrue);
    expect(snapshot.private.role?.name, "掩護員");
    expect(snapshot.public.seats.every((seat) => seat.toString().contains("silencer")), isFalse);
  });

  testWidgets("home offers a private room", (tester) async {
    await tester.pumpWidget(const QuietZoneApp());
    expect(find.text("消音區"), findsOneWidget);
    expect(find.text("開私人房"), findsOneWidget);
    expect(find.text("用代碼加入"), findsOneWidget);
  });

  testWidgets("table shows the AI badge, vote, night action, and ending", (tester) async {
    await tester.binding.setSurfaceSize(const Size(1200, 2400));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      secondsLeft: 12,
      pins: const [PinItem(id: "pin1", text: "真釘", unverified: true)],
      skillActions: const [NightChoice(action: "pin", label: "釘選殘訊", needsTarget: false)],
      remnants: const [
        EchoRemnant(nickname: "甲", factionLabel: "燈塔網", text: "第一"),
        EchoRemnant(nickname: "乙", factionLabel: "消音組", text: "第二"),
      ],
    )));
    expect(find.text("剩餘 12 秒"), findsOneWidget);
    expect(find.text("甲 · 燈塔網"), findsOneWidget);
    expect(find.text("乙 · 消音組"), findsOneWidget);
    expect(find.text("AI"), findsOneWidget);
    expect(find.text("燈亮討論"), findsOneWidget);
    expect(find.text("掩護員 · 燈塔網"), findsOneWidget);
    expect(find.text("待核實｜真釘"), findsOneWidget);
    expect(find.text("釘選殘訊"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      muted: true,
      sealCard: "封口卡：你呢回合只可以投票。",
    )));
    expect(find.textContaining("封口卡"), findsOneWidget);
    expect(find.text("封口中：呢個階段只可以等投票，唔可以發言。"), findsOneWidget);
    expect(find.text("短句"), findsNothing);

    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      skillActions: const [NightChoice(action: "mark", label: "標記消音嫌疑", needsTarget: true)],
      marks: const ["s2"],
    )));
    expect(find.textContaining("私密標記"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(phase: "vote", phaseLabel: "投票隔離", anonymousVote: true)));
    await tester.pump();
    expect(find.text("確認投票"), findsOneWidget);
    expect(find.text("棄權"), findsOneWidget);
    expect(find.text("匿名票（每局一次）"), findsOneWidget);
    expect(find.text("AI"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(
      phase: "night",
      phaseLabel: "熄燈行動",
      nightActions: const [
        NightChoice(action: "cover", label: "臨時掩護", needsTarget: true),
        NightChoice(action: "skip", label: "跳過今夜", needsTarget: false),
      ],
    )));
    await tester.pump();
    expect(find.text("臨時掩護"), findsOneWidget);
    expect(find.text("提交行動"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(
      phase: "ended",
      phaseLabel: "終局",
      winner: const Winner(faction: "grey", factionLabel: "灰頻", reason: "灰頻獨贏：孤證客仍在場，正確消音標記達 2。", kind: "grey_marks"),
      reveal: const [SeatReveal(seatId: "s2", nickname: "霧港燈", alive: true, roleName: "消音手", factionLabel: "消音組")],
    )));
    await tester.pump();
    expect(find.text("灰頻"), findsWidgets);
    expect(find.textContaining("灰頻獨贏"), findsOneWidget);
    expect(find.textContaining("消音手"), findsOneWidget);
  });
}

Widget _app(GameSnapshot snapshot) {
  return MaterialApp(
    home: TablePage(controller: GameController(preview: snapshot)),
  );
}

GameSnapshot _snapshot({
  required String phase,
  required String phaseLabel,
  Winner? winner,
  List<NightChoice> nightActions = const [],
  List<NightChoice> skillActions = const [],
  List<PinItem> pins = const [],
  bool anonymousVote = false,
  bool muted = false,
  String? sealCard,
  List<String> marks = const [],
  int? secondsLeft,
  List<EchoRemnant> remnants = const [],
  List<SeatReveal> reveal = const [],
}) {
  return GameSnapshot(
    public: PublicView(
      code: "ABCD",
      phase: phase,
      phaseLabel: phaseLabel,
      round: 1,
      night: phase == "night" ? 1 : 0,
      banner: "測試橫額",
      composition: const Composition(lighthouse: 7, silence: 3, grey: 1),
      seats: const [
        PublicSeat(id: "s1", nickname: "夜歸人", isAi: false, alive: true, sealed: false),
        PublicSeat(id: "s2", nickname: "霧港燈", isAi: true, alive: true, sealed: false),
      ],
      log: const ["公開組成已廣播。"],
      pins: pins,
      disconnects: 0,
      disconnectsToWin: 3,
      winner: winner,
      secondsLeft: secondsLeft,
      reveal: reveal,
    ),
    private: PrivateView(
      playerId: "p1",
      seatId: "s1",
      isHost: true,
      alive: true,
      canSpeak: true,
      canVote: phase == "vote",
      ready: false,
      role: const PrivateRole(
        id: "cover",
        name: "掩護員",
        faction: "lighthouse",
        factionLabel: "燈塔網",
        skill: "臨時掩護：免疫該夜失聯。",
      ),
      teammates: const [],
      inbox: const [],
      nightActions: nightActions,
      skillActions: skillActions,
      anonymousVote: anonymousVote,
      muted: muted,
      sealCard: sealCard,
      marks: marks,
      remnants: remnants,
    ),
  );
}
