import "dart:async";

import "package:flutter/widgets.dart";

import "main.dart";
import "src/game_controller.dart";
import "src/trial_link.dart";

/// Solo Standard Mode trial. One human seat, AI fills the table,
/// and the authoritative loop runs in the page (no separate server).
///
/// ```bash
/// cd apps/mobile
/// flutter run -d chrome -t lib/trial_main.dart
/// ```
///
/// Phone browsers can open the published build, or `docs/trial/index.html`.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(lockQuietZoneLandscape());
  runApp(QuietZoneApp(controller: GameController(trial: true, link: createTrialLink())));
}
