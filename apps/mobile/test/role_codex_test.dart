import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/main.dart";
import "package:quiet_zone/src/game_controller.dart";
import "package:quiet_zone/src/protocol.dart";
import "package:quiet_zone/src/art.dart";
import "package:quiet_zone/src/role_catalog.dart";

void main() {
  test("catalog lists each standard role once, grouped by faction", () {
    final roles = kStandardRoles;
    expect(roles.map((role) => role.id), [
      "tip",
      "sweep",
      "cover",
      "echo",
      "link",
      "civilian",
      "silencer",
      "decoy",
      "plant",
      "warrant",
    ]);
    expect(roles.where((role) => role.id == "civilian"), hasLength(1));
    expect(kCodexFactions.map((group) => group.label), ["燈塔網", "消音組", "灰頻"]);
    expect(kCodexFactions[0].blurb, "消音組全部離場就解封。");
    expect(kCodexFactions[1].blurb, "成功失聯 3 次，或者燈塔網已無法投票。");
    expect(kCodexFactions[2].blurb, "孤證客仍在場，正確標記消音組達 2 即獨贏。");
    expect(roles.every((role) => roleBustAsset(role.id) != null), isTrue);
    expect(roleBustAsset("silencer"), ArtCatalog.silencer);
    expect(roleBustAsset("link"), ArtCatalog.link);
    expect(roleBustAsset("warrant"), ArtCatalog.warrant);
    expect(roleBustAsset("civilian"), ArtCatalog.civilianF);
    expect(
      roles.firstWhere((role) => role.id == "warrant").skill,
      "私密標記消音組。仍在場且正確標記達 2 即灰頻獨贏。每局可封口一人。",
    );
  });

  testWidgets("home opens the codex and returns without leaving home", (tester) async {
    await tester.binding.setSurfaceSize(const Size(900, 4200));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const QuietZoneApp());
    await tester.tap(find.text("角色圖鑑"));
    await tester.pumpAndSettle();

    expect(
      find.text("公開規則。開局前或者局中都可以睇。撳一個角色先睇陣營同技能，唔會顯示你或者席上任何人嘅私人身分。"),
      findsOneWidget,
    );
    for (final role in kStandardRoles) {
      expect(find.text(role.name), findsOneWidget, reason: role.name);
      expect(find.text(role.skill), findsNothing, reason: role.id);
    }
    expect(find.text("你嘅身分"), findsNothing);
    expect(find.text("私人匣"), findsNothing);
    expect(find.text("點贏"), findsNothing);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.silencer}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.link}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.warrant}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.civilianF}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.civilianM}")), findsOneWidget);

    await tester.tap(find.byKey(const Key("codex-role:warrant")));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("codex-detail")), findsOneWidget);
    expect(find.text("私密標記消音組。仍在場且正確標記達 2 即灰頻獨贏。每局可封口一人。"), findsOneWidget);
    expect(find.text("孤證客仍在場，正確標記消音組達 2 即獨贏。"), findsOneWidget);
    expect(find.text("點贏"), findsOneWidget);
    expect(find.text("灰頻"), findsWidgets);
    expect(find.text("你嘅身分"), findsNothing);

    await tester.tap(find.byTooltip("關閉詳情"));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("codex-detail")), findsNothing);
    expect(find.text("私密標記消音組。仍在場且正確標記達 2 即灰頻獨贏。每局可封口一人。"), findsNothing);

    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text("開私人房"), findsOneWidget);
    expect(find.text("線報員"), findsNothing);
  });

  testWidgets("lobby keeps the room open under the codex", (tester) async {
    await tester.binding.setSurfaceSize(const Size(800, 1400));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(QuietZoneApp(controller: GameController(preview: _room(phase: "lobby", phaseLabel: "組席"))));
    expect(find.text("組席"), findsOneWidget);
    await tester.tap(find.text("角色圖鑑"));
    await tester.pumpAndSettle();
    expect(find.text("掃頻員"), findsOneWidget);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text("ABCD"), findsOneWidget);
    expect(find.text("準備好"), findsOneWidget);
  });

  testWidgets("table codex hides private inbox and returns to the same phase", (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 800));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(QuietZoneApp(
        controller: GameController(
            preview: _room(
      phase: "day_talk",
      phaseLabel: "燈亮討論",
      inbox: const ["掃頻：霧港燈 有消音痕跡。"],
    ))));
    expect(find.textContaining("有消音痕跡"), findsOneWidget);
    await tester.tap(find.byTooltip("角色圖鑑"));
    await tester.pumpAndSettle();
    expect(find.text("通聯官"), findsOneWidget);
    expect(find.textContaining("有消音痕跡"), findsNothing);
    expect(find.text("你嘅身分"), findsNothing);
    await tester.tap(find.byType(BackButton));
    await tester.pumpAndSettle();
    expect(find.text("燈亮討論"), findsWidgets);
    expect(find.textContaining("有消音痕跡"), findsOneWidget);
    expect(find.text("你嘅身分"), findsOneWidget);
  });

  testWidgets("landscape codex lines factions up side by side", (tester) async {
    await tester.binding.setSurfaceSize(const Size(844, 390));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const QuietZoneApp());
    await tester.tap(find.text("角色圖鑑"));
    await tester.pumpAndSettle();

    expect(find.byKey(const Key("landscape-codex")), findsOneWidget);
    expect(find.text("燈塔網"), findsWidgets);
    expect(find.text("消音組"), findsWidgets);
    expect(find.text("灰頻"), findsWidgets);
    for (final role in kStandardRoles) {
      expect(find.text(role.name), findsOneWidget, reason: role.name);
      expect(find.text(role.skill), findsNothing, reason: role.id);
    }
    expect(find.text("點贏"), findsNothing);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.silencer}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.civilianF}")), findsOneWidget);
    expect(find.byKey(const Key("codex-bust:${ArtCatalog.civilianM}")), findsOneWidget);
    expect(find.text("你嘅身分"), findsNothing);

    await tester.tap(find.byKey(const Key("codex-role:link")));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("codex-detail")), findsOneWidget);
    expect(find.text("核對通聯：每個燈亮可查一人上回合用過主動技能未，唔會話你知係邊種。"), findsOneWidget);
    expect(find.text("消音組全部離場就解封。"), findsOneWidget);
    expect(find.text("點贏"), findsOneWidget);
    expect(find.text("燈塔網"), findsWidgets);
    for (final role in kStandardRoles.where((role) => role.id != "link")) {
      expect(find.text(role.skill), findsNothing, reason: role.id);
    }
    expect(find.text("你嘅身分"), findsNothing);
    expect(tester.takeException(), isNull);
  });
}

GameSnapshot _room({
  required String phase,
  required String phaseLabel,
  List<String> inbox = const [],
}) {
  return GameSnapshot(
    public: PublicView(
      code: "ABCD",
      phase: phase,
      phaseLabel: phaseLabel,
      round: phase == "lobby" ? 0 : 1,
      night: 0,
      banner: "測試橫額",
      composition: const Composition(lighthouse: 7, silence: 3, grey: 1),
      seats: const [
        PublicSeat(id: "s1", nickname: "夜歸人", isAi: false, alive: true, sealed: false),
      ],
      log: const ["公開組成已廣播。"],
      disconnects: 0,
      disconnectsToWin: 3,
      winner: null,
    ),
    private: PrivateView(
      playerId: "p1",
      seatId: "s1",
      isHost: true,
      alive: true,
      canSpeak: true,
      canVote: false,
      ready: false,
      role: phase == "lobby"
          ? null
          : const PrivateRole(
              id: "cover",
              name: "掩護員",
              faction: "lighthouse",
              factionLabel: "燈塔網",
              skill: "臨時掩護：免疫該夜失聯。成功後下一夜唔可以再成功。",
            ),
      teammates: const [],
      inbox: inbox,
      nightActions: const [],
      marks: const [],
    ),
  );
}
