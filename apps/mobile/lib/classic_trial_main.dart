import "dart:async";

import "package:flutter/widgets.dart";

import "main.dart";
import "src/game_controller.dart";
import "src/trial_link.dart";

/// Previous Standard Mode trial. The main trial entry is now 訊號牌
/// (`lib/trial_main.dart`). This file keeps the old loop runnable.
///
/// ```bash
/// flutter run -d chrome -t lib/classic_trial_main.dart
/// ```
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(lockQuietZoneLandscape());
  runApp(QuietZoneApp(controller: GameController(trial: true, link: createTrialLink())));
}
