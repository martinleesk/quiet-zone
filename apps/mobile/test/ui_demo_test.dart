import "dart:io";

import "package:flutter/material.dart";
import "package:flutter_test/flutter_test.dart";
import "package:quiet_zone/src/art.dart";
import "package:quiet_zone/src/role_catalog.dart";
import "package:quiet_zone/src/ui_demo.dart";

void main() {
  testWidgets("demo switches home, codex detail, day, and night", (tester) async {
    await tester.binding.setSurfaceSize(const Size(1000, 460));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(const UiDemoApp());

    expect(find.byKey(const Key("ui-demo")), findsOneWidget);
    expect(find.text("開私人房"), findsOneWidget);
    expect(find.byKey(const Key("scene-home")), findsOneWidget);

    await tester.tap(find.byKey(const Key("demo-screen:codex")));
    await tester.pumpAndSettle();
    expect(find.text("線報"), findsOneWidget);
    expect(find.text(kStandardRoles.firstWhere((role) => role.id == "warrant").skill), findsNothing);
    await tester.tap(find.byKey(const Key("codex-role:warrant")));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("codex-detail")), findsOneWidget);
    expect(find.text("暗中標消音。標中兩個又仍然在場就你獨贏。熄燈可以封一個人唔准講。"), findsOneWidget);
    expect(find.text("孤證仍然在場，暗標中兩個消音就獨贏。"), findsOneWidget);

    await tester.tap(find.byKey(const Key("demo-screen:day")));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("landscape-table")), findsOneWidget);
    expect(find.byKey(const Key("scene-day_talk")), findsOneWidget);
    expect(find.text("送出"), findsOneWidget);
    expect(find.text("熄燈保一個人唔會被帶走。成功後下一夜唔可以再用。"), findsOneWidget);

    await tester.tap(find.byKey(const Key("demo-screen:night")));
    await tester.pumpAndSettle();
    expect(find.byKey(const Key("scene-night")), findsOneWidget);
    expect(find.text("掩護呢個人"), findsOneWidget);
    expect(find.text("發動"), findsOneWidget);
    expect(find.byKey(const Key("role-bust:${ArtCatalog.cover}")), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  test("static ui demo keeps every skill and the art files", () {
    final html = File("../../docs/ui-demo/index.html").readAsStringSync();
    for (final role in kStandardRoles) {
      expect(html, contains(role.name), reason: role.id);
      expect(html, contains(role.skill), reason: role.id);
    }
    expect(html, contains("消音組全部離場就贏。"));
    expect(html, contains("成功帶走 3 個人，或者燈塔網票唔到，就贏。"));
    expect(html, contains("孤證仍然在場，暗標中兩個消音就獨贏。"));
    for (final file in [
      "art/roles/warrant.jpg",
      "art/roles/silencer.jpg",
      "art/roles/civilian_f.jpg",
      "art/roles/civilian_m.jpg",
      "art/scenes/day_talk.jpg",
      "art/scenes/night.jpg",
    ]) {
      expect(html, contains(file));
      expect(File("../../docs/ui-demo/$file").existsSync(), isTrue, reason: file);
    }
  });
}
