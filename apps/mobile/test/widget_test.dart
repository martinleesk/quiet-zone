import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/main.dart";
import "package:quiet_zone/src/art.dart";
import "package:quiet_zone/src/game_controller.dart";
import "package:quiet_zone/src/lobby_page.dart";
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

  test("art catalog maps every standard role bust", () {
    expect(ArtCatalog.installed, isTrue);
    expect(ArtCatalog.roleBusts.keys.toSet(), {
      "warrant",
      "silencer",
      "tip",
      "cover",
      "decoy",
      "sweep",
      "echo",
      "link",
      "plant",
      "civilian",
    });
    expect(ArtCatalog.roleBusts["warrant"], ArtCatalog.warrant);
    expect(ArtCatalog.roleBusts["silencer"], ArtCatalog.silencer);
    expect(ArtCatalog.roleBusts["tip"], ArtCatalog.tip);
    expect(ArtCatalog.roleBusts["cover"], ArtCatalog.cover);
    expect(ArtCatalog.roleBusts["decoy"], ArtCatalog.decoy);
    expect(ArtCatalog.roleBusts["sweep"], ArtCatalog.sweep);
    expect(ArtCatalog.roleBusts["echo"], ArtCatalog.echo);
    expect(ArtCatalog.roleBusts["link"], ArtCatalog.link);
    expect(ArtCatalog.roleBusts["plant"], ArtCatalog.plant);
    expect(ArtCatalog.roleBusts["civilian"], ArtCatalog.civilianF);
    expect(ArtCatalog.bustFor("warrant"), ArtCatalog.warrant);
    expect(ArtCatalog.bustFor("silencer"), ArtCatalog.silencer);
    expect(ArtCatalog.bustFor("cover"), ArtCatalog.cover);
    expect(ArtCatalog.bustFor("civilian"), ArtCatalog.civilianF);
    expect(ArtCatalog.bustFor("civilian", seatId: "s1"), ArtCatalog.civilianF);
    expect(ArtCatalog.bustFor("civilian", seatId: "s2"), ArtCatalog.civilianM);
    expect(ArtCatalog.bustFor("nope"), isNull);
    expect(ArtCatalog.reservedScene("home"), ArtCatalog.dayTalk);
    expect(ArtCatalog.reservedScene("lobby"), ArtCatalog.dayTalk);
    expect(ArtCatalog.reservedScene("day_talk"), ArtCatalog.dayTalk);
    expect(ArtCatalog.reservedScene("draft"), ArtCatalog.dayTalk);
    expect(ArtCatalog.reservedScene("night"), ArtCatalog.night);
    expect(ArtCatalog.reservedScene("vote"), isNull);
    expect(ArtCatalog.reservedScene("boot"), isNull);
    expect(ArtCatalog.sceneFor("day_talk"), ArtCatalog.dayTalk);
    expect(ArtCatalog.sceneFor("draft"), ArtCatalog.dayTalk);
    expect(ArtCatalog.sceneFor("night"), ArtCatalog.night);
    expect(ArtCatalog.sceneFor("vote"), isNull);
    expect(ArtCatalog.showsBackdrop("day_talk"), isTrue);
    expect(ArtCatalog.showsBackdrop("draft"), isTrue);
    expect(ArtCatalog.showsBackdrop("night"), isTrue);
    expect(ArtCatalog.showsBackdrop("home"), isTrue);
    expect(ArtCatalog.showsBackdrop("vote"), isFalse);
    expect(ArtCatalog.showsBackdrop("boot"), isFalse);
    expect(ArtCatalog.showsBackdrop("ended"), isFalse);
    expect(ArtCatalog.factionColor("lighthouse"), ArtCatalog.lighthouse);
    expect(ArtCatalog.factionColor("silence"), ArtCatalog.silence);
    expect(ArtCatalog.factionColor("grey"), ArtCatalog.grey);
    expect(ArtCatalog.reservedFiles, contains(ArtCatalog.styleBoard));
    expect(ArtCatalog.reservedFiles, contains(ArtCatalog.civilianM));
  });

  testWidgets("locks the app to landscape orientations", (tester) async {
    final orientations = <String>[];
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, (call) async {
      if (call.method == "SystemChrome.setPreferredOrientations") {
        orientations.addAll((call.arguments as List).cast<String>());
      }
      return null;
    });
    addTearDown(() {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(SystemChannels.platform, null);
    });

    await lockQuietZoneLandscape();

    expect(orientations, [
      "DeviceOrientation.landscapeLeft",
      "DeviceOrientation.landscapeRight",
    ]);
  });

  testWidgets("home offers a private room", (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const QuietZoneApp());
    expect(find.text("消音區"), findsOneWidget);
    expect(find.text("開私人房"), findsOneWidget);
    expect(find.text("用代碼加入"), findsOneWidget);
    expect(find.byKey(const Key("scene-home")), findsOneWidget);
    expect(find.byKey(const Key("landscape-home")), findsNothing);
  });

  testWidgets("phone landscape home puts the day scene beside the room form", (tester) async {
    await tester.binding.setSurfaceSize(const Size(844, 390));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const QuietZoneApp());
    expect(find.byKey(const Key("landscape-home")), findsOneWidget);
    expect(find.byKey(const Key("scene-home")), findsOneWidget);
    expect(find.text("消音區"), findsOneWidget);
    expect(find.text("開私人房"), findsOneWidget);
    expect(find.text("用代碼加入"), findsOneWidget);
    expect(find.text("角色圖鑑"), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets("lobby keeps the room code on the day header", (tester) async {
    await tester.pumpWidget(MaterialApp(
      home: LobbyPage(controller: GameController(preview: _snapshot(phase: "lobby", phaseLabel: "組席"))),
    ));
    expect(find.byKey(const Key("scene-lobby")), findsOneWidget);
    expect(find.text("ABCD"), findsOneWidget);
    expect(find.text("準備好"), findsOneWidget);
    expect(find.text("開始封鎖（AI 補滿 11 席）"), findsOneWidget);
    expect(find.byKey(const Key("landscape-lobby")), findsOneWidget);
  });

  testWidgets("role reveal shows the 3D bust and keeps an unknown role on the faction circle", (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(_app(_snapshot(
      phase: "boot",
      phaseLabel: "開局抽身分",
      role: const PrivateRole(
        id: "warrant",
        name: "孤證客",
        faction: "grey",
        factionLabel: "灰頻",
        skill: "私密標記消音組。",
      ),
    )));
    expect(find.byKey(const Key("role-bust:${ArtCatalog.warrant}")), findsOneWidget);
    expect(find.byKey(const Key("role-placeholder")), findsNothing);
    expect(find.text("孤證客 · 灰頻"), findsOneWidget);
    expect(find.text("我睇完身分"), findsOneWidget);
    expect(find.byKey(const Key("scene-boot")), findsNothing);

    await tester.pumpWidget(_app(_snapshot(
      phase: "night",
      phaseLabel: "熄燈行動",
      role: const PrivateRole(
        id: "silencer",
        name: "消音手",
        faction: "silence",
        factionLabel: "消音組",
        skill: "執行失聯。",
      ),
    )));
    await tester.pump();
    expect(find.byKey(const Key("role-bust:${ArtCatalog.silencer}")), findsOneWidget);
    expect(find.byKey(const Key("scene-night")), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(phase: "day_talk", phaseLabel: "燈亮討論")));
    await tester.pump();
    expect(find.byKey(const Key("scene-day_talk")), findsOneWidget);
    expect(find.byKey(const Key("role-bust:${ArtCatalog.cover}")), findsOneWidget);
    expect(find.text("送出"), findsOneWidget);
    expect(find.text("掩護 · 燈塔網"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      role: const PrivateRole(
        id: "civilian",
        name: "燈塔閒職",
        faction: "lighthouse",
        factionLabel: "燈塔網",
        skill: "無主動技能。",
      ),
    )));
    await tester.pump();
    expect(find.byKey(const Key("role-bust:${ArtCatalog.civilianF}")), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(phase: "draft", phaseLabel: "私人草稿")));
    await tester.pump();
    expect(find.byKey(const Key("scene-draft")), findsOneWidget);
    expect(find.text("私人草稿。留空都得。"), findsOneWidget);

    await tester.pumpWidget(_app(_snapshot(
      phase: "vote",
      phaseLabel: "投票隔離",
      role: const PrivateRole(
        id: "ghost",
        name: "路人",
        faction: "lighthouse",
        factionLabel: "燈塔網",
        skill: "未有圖。",
      ),
    )));
    await tester.pump();
    expect(find.byKey(const Key("scene-vote")), findsNothing);
    expect(find.text("確認投票"), findsOneWidget);
    expect(find.byKey(const Key("role-placeholder")), findsOneWidget);
    expect(find.text("路"), findsOneWidget);
    _expectFaction(tester, ArtCatalog.lighthouse);
  });

  testWidgets("seat chips show a bust only for the viewer's own role or a public reveal", (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1600));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(_app(_snapshot(phase: "day_talk", phaseLabel: "燈亮討論")));
    expect(find.byKey(const Key("seat-bust:${ArtCatalog.cover}")), findsOneWidget);
    expect(find.byKey(const Key("seat-placeholder:s2")), findsOneWidget);
    expect(find.byKey(const Key("seat-bust:${ArtCatalog.silencer}")), findsNothing);
    expect(find.text("消音手"), findsNothing);

    await tester.pumpWidget(_app(_snapshot(
      phase: "ended",
      phaseLabel: "終局",
      reveal: const [
        SeatReveal(seatId: "s2", nickname: "霧港燈", alive: true, roleName: "消音手", factionLabel: "消音組"),
      ],
    )));
    await tester.pump();
    expect(find.byKey(const Key("seat-bust:${ArtCatalog.cover}")), findsOneWidget);
    expect(find.byKey(const Key("seat-bust:${ArtCatalog.silencer}")), findsOneWidget);
    expect(find.byKey(const Key("seat-placeholder:s2")), findsNothing);
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
    expect(find.byKey(const Key("phase-clock")), findsOneWidget);
    expect(find.text("12"), findsOneWidget);
    expect(find.text("甲 · 燈塔網"), findsOneWidget);
    expect(find.text("乙 · 消音組"), findsOneWidget);
    expect(find.text("AI"), findsOneWidget);
    expect(find.text("燈亮討論"), findsOneWidget);
    expect(find.text("掩護 · 燈塔網"), findsOneWidget);
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
    expect(find.text("發動"), findsOneWidget);

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

  testWidgets("phone landscape boot, day, and night use a wide stage", (tester) async {
    await tester.binding.setSurfaceSize(const Size(844, 390));
    addTearDown(() => tester.binding.setSurfaceSize(null));

    await tester.pumpWidget(_app(_snapshot(
      phase: "boot",
      phaseLabel: "開局抽身分",
      role: const PrivateRole(
        id: "warrant",
        name: "孤證客",
        faction: "grey",
        factionLabel: "灰頻",
        skill: "私密標記消音組。",
      ),
    )));
    expect(find.byKey(const Key("boot-reveal")), findsOneWidget);
    expect(find.byKey(const Key("role-bust:${ArtCatalog.warrant}")), findsOneWidget);
    expect(find.text("我睇完身分"), findsOneWidget);
    expect(find.text("孤證客 · 灰頻"), findsOneWidget);
    expect(find.byKey(const Key("scene-boot")), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(_app(_snapshot(phase: "day_talk", phaseLabel: "燈亮討論")));
    await tester.pump();
    expect(find.byKey(const Key("landscape-table")), findsOneWidget);
    expect(find.byKey(const Key("scene-day_talk")), findsOneWidget);
    expect(find.byKey(const Key("seat-ring")), findsOneWidget);
    expect(find.byKey(const Key("role-bust:${ArtCatalog.cover}")), findsOneWidget);
    expect(find.byKey(const Key("seat-bust:${ArtCatalog.cover}")), findsOneWidget);
    expect(find.byKey(const Key("seat-placeholder:s2")), findsOneWidget);
    expect(find.text("送出"), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(_app(_snapshot(
      phase: "night",
      phaseLabel: "熄燈行動",
      nightActions: const [
        NightChoice(action: "cover", label: "臨時掩護", needsTarget: true),
        NightChoice(action: "skip", label: "跳過今夜", needsTarget: false),
      ],
    )));
    await tester.pump();
    expect(find.byKey(const Key("scene-night")), findsOneWidget);
    expect(find.byKey(const Key("seat-ring")), findsOneWidget);
    expect(find.text("臨時掩護"), findsOneWidget);
    expect(find.text("發動"), findsOneWidget);
    expect(tester.takeException(), isNull);

    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      seats: const [
        PublicSeat(id: "s1", nickname: "夜歸人", isAi: false, alive: true, sealed: false),
        PublicSeat(id: "s2", nickname: "霧港燈", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s3", nickname: "潮聲", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s4", nickname: "北角", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s5", nickname: "深水", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s6", nickname: "啟德", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s7", nickname: "西環", isAi: true, alive: false, sealed: false),
        PublicSeat(id: "s8", nickname: "銅鑼", isAi: true, alive: true, sealed: true),
        PublicSeat(id: "s9", nickname: "紅磡", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s10", nickname: "荃灣", isAi: true, alive: true, sealed: false),
        PublicSeat(id: "s11", nickname: "沙田", isAi: true, alive: true, sealed: false),
      ],
    )));
    await tester.pump();
    expect(find.byKey(const Key("seat-ring")), findsOneWidget);
    expect(find.text("s11 沙田"), findsOneWidget);
    final seatLabel = tester.widget<Text>(find.text("s11 沙田"));
    expect(seatLabel.maxLines, isNull);
    expect(seatLabel.overflow, anyOf(isNull, TextOverflow.clip, TextOverflow.visible));
    expect(find.text("AI"), findsWidgets);
    expect(find.text("離場"), findsWidgets);
    expect(find.text("封口"), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets("phone landscape keeps critical copy fully on screen", (tester) async {
    await _usePhoneLandscape(tester);
    await tester.pumpWidget(const QuietZoneApp());
    expect(find.byKey(const Key("landscape-home")), findsOneWidget);
    _expectFullyVisible(tester, find.text("消音區"));
    _expectFullyVisible(tester, find.text("私人房 11 席。空位由 AI 補上，徽章會一直顯示。你只會收到自己嘅身分。"));
    _expectFullyVisible(tester, find.text("開私人房"));
    _expectFullyVisible(tester, find.text("用代碼加入"));
    _expectFullyVisible(tester, find.text("角色圖鑑"));
    expect(tester.takeException(), isNull);

    await tester.tap(find.text("角色圖鑑"));
    await tester.pumpAndSettle();
    _expectFullyVisible(
      tester,
      find.text("勝負次序：灰頻獨贏，然後消音組，然後燈塔網。11 席係燈塔網 7、消音組 3、灰頻 1。閒職會派兩席，圖鑑只列一次。"),
    );
    for (final name in const ["線報", "掃頻", "掩護", "回波", "通聯", "守燈", "消音手", "假訊", "影燈", "孤證"]) {
      _expectFullyVisible(tester, find.text(name));
    }
    expect(find.text("燈亮可以釘一句公開線報，唔佔你嘅發言。"), findsNothing);

    await tester.tap(find.byKey(const Key("codex-role:warrant")));
    await tester.pumpAndSettle();
    _expectFullyVisible(tester, find.text("暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。"));
    _expectFullyVisible(tester, find.text("孤證仍然在場，暗標中兩個消音就獨贏。"));
    _expectFullyVisible(tester, find.text("點贏"));
    expect(tester.takeException(), isNull);

    const coverSkill = "熄燈保一個人唔會被帶走。成功後下一夜唔可以再用。";
    await tester.pumpWidget(_app(_snapshot(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      role: const PrivateRole(
        id: "cover",
        name: "掩護",
        faction: "lighthouse",
        factionLabel: "燈塔網",
        skill: coverSkill,
      ),
    )));
    await tester.pumpAndSettle();
    _expectFullyVisible(tester, find.text("燈亮討論"));
    _expectFullyVisible(tester, find.text("測試橫額"));
    _expectFullyVisible(tester, find.text(coverSkill));
    _expectFullyVisible(tester, find.text("送出"));
    _expectFullyVisible(tester, find.text("準備好"));
    expect(tester.takeException(), isNull);

    const warrantSkill = "暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。";
    await tester.pumpWidget(_app(_snapshot(
      phase: "boot",
      phaseLabel: "開局抽身分",
      role: const PrivateRole(
        id: "warrant",
        name: "孤證客",
        faction: "grey",
        factionLabel: "灰頻",
        skill: warrantSkill,
      ),
    )));
    await tester.pumpAndSettle();
    _expectFullyVisible(tester, find.text("開局抽身分"));
    _expectFullyVisible(tester, find.text(warrantSkill));
    _expectFullyVisible(tester, find.text("我睇完身分"));
    expect(tester.takeException(), isNull);
  });
}

Future<void> _usePhoneLandscape(WidgetTester tester) async {
  await tester.binding.setSurfaceSize(const Size(844, 390));
  final pixelRatio = tester.view.devicePixelRatio;
  tester.view.viewPadding = FakeViewPadding(left: 47 * pixelRatio, top: 0, right: 0, bottom: 21 * pixelRatio);
  tester.view.padding = FakeViewPadding(left: 47 * pixelRatio, top: 0, right: 0, bottom: 21 * pixelRatio);
  addTearDown(() async {
    tester.view.resetViewPadding();
    tester.view.resetPadding();
    await tester.binding.setSurfaceSize(null);
  });
}

/// The string is inside the window, clear of the safe insets, and no ancestor cuts it.
void _expectFullyVisible(WidgetTester tester, Finder finder) {
  expect(finder, findsOneWidget);
  final rect = tester.getRect(finder);
  final pixelRatio = tester.view.devicePixelRatio;
  final padding = tester.view.padding;
  final inset = EdgeInsets.fromLTRB(
    padding.left / pixelRatio,
    padding.top / pixelRatio,
    padding.right / pixelRatio,
    padding.bottom / pixelRatio,
  );
  final screen = inset.deflateRect(Offset.zero & tester.binding.renderViews.single.size);
  expect(rect.width, greaterThan(0));
  expect(rect.height, greaterThan(0));
  expect(
    screen.inflate(1).contains(rect.topLeft) && screen.inflate(1).contains(rect.bottomRight),
    isTrue,
    reason: "$finder rect $rect outside $screen",
  );
  final element = tester.element(finder);
  element.visitAncestorElements((ancestor) {
    final render = ancestor.renderObject;
    if (render is RenderBox && render.hasSize) {
      final bounds = MatrixUtils.transformRect(render.getTransformTo(null), Offset.zero & render.size);
      final inside = bounds.inflate(1.5).contains(rect.topLeft) && bounds.inflate(1.5).contains(rect.bottomRight);
      expect(inside, isTrue, reason: "$finder rect $rect clipped by ${ancestor.widget.runtimeType} at $bounds");
    }
    return true;
  });
}

void _expectFaction(WidgetTester tester, Color color) {
  final box = tester.widget<Container>(find.byKey(const Key("role-placeholder")));
  final decoration = box.decoration! as BoxDecoration;
  expect((decoration.border! as Border).top.color, color);
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
  PrivateRole? role,
  List<PublicSeat>? seats,
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
      seats: seats ??
          const [
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
      role: role ??
          const PrivateRole(
            id: "cover",
            name: "掩護",
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
