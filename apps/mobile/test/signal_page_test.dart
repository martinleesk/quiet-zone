import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/src/signal/signal_controller.dart";
import "package:quiet_zone/src/signal/signal_page.dart";

Map<String, dynamic> _playView() {
  return {
    "phase": "play",
    "phaseLabel": "出牌",
    "coach": "一武一道，可裝防",
    "banner": "第 1 節點",
    "secondsLeft": 45,
    "secondsTotal": 45,
    "events": ["夜靜。"],
    "log": ["封鎖夜開始。"],
    "you": {
      "seatId": "s1",
      "name": "夜歸人",
      "connected": true,
      "acted": false,
      "voted": false,
      "factionLabel": "燈塔網",
      "roleName": "守頻員",
      "goal": "表決揪走全部干擾源",
      "skillName": "穩頻錨",
      "skillText": "表決時發動。",
      "skillWindow": "vote",
      "skillNeedsTarget": false,
      "skillUsed": false,
      "skillReady": false,
      "hand": [
        {
          "uid": "guard-1",
          "id": "quiet_shell",
          "name": "靜默罩",
          "kind": "guard",
          "kindLabel": "防",
          "text": "擋下一次打你嘅武。",
          "needsTarget": false,
        },
      ],
      "strike": null,
      "guard": null,
      "notes": [],
      "pending": null,
      "canStrike": true,
      "canFire": false,
      "canArm": true,
      "canTool": true,
      "canGuard": true,
      "quotas": {"strike": "0/1", "tool": "0/1", "guard": "0/1"},
    },
    "seats": [
      {"id": "s1", "name": "夜歸人", "ai": false, "connected": true, "acted": false, "marks": 0, "isYou": true, "guard": null},
      {"id": "s2", "name": "霧港燈", "ai": true, "connected": true, "acted": true, "marks": 1, "isYou": false, "guard": null},
    ],
    "winner": null,
    "tally": null,
  };
}

Map<String, dynamic> _voteView() {
  final view = _playView();
  view["phase"] = "vote";
  view["phaseLabel"] = "表決";
  view["coach"] = "斷邊個線";
  view["secondsLeft"] = 30;
  return view;
}

void main() {
  testWidgets("play can equip a guard", (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 460));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final controller = SignalController(preview: _playView());
    await tester.pumpWidget(MaterialApp(home: SignalPage(controller: controller)));
    expect(find.textContaining("出牌"), findsWidgets);
    expect(find.text("45"), findsOneWidget);
    await tester.tap(find.byKey(const Key("signal-card-guard-1")));
    await tester.pump();
    await tester.tap(find.byKey(const Key("signal-equip")));
    await tester.pump();
    expect(controller.sent.single["action"], "guard");
    expect(controller.sent.single["cardUid"], "guard-1");
    expect(tester.takeException(), isNull);
  });

  testWidgets("vote can pick a seat", (tester) async {
    await tester.binding.setSurfaceSize(const Size(844, 390));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    final controller = SignalController(preview: _voteView());
    await tester.pumpWidget(MaterialApp(home: SignalPage(controller: controller)));
    expect(find.textContaining("表決"), findsWidgets);
    await tester.tap(find.byKey(const Key("signal-vote-s2")));
    await tester.pump();
    expect(controller.sent.single["type"], "vote");
    expect(controller.sent.single["targetSeatId"], "s2");
    expect(tester.takeException(), isNull);
  });
}
