import "dart:async";

import "package:flutter/widgets.dart";

import "main.dart";
import "src/ui_demo.dart";

/// Visual demo with no server: home, lobby, codex, day, and night.
///
/// ```bash
/// cd apps/mobile
/// flutter run -d chrome -t lib/demo_main.dart
/// ```
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(lockQuietZoneLandscape());
  runApp(const UiDemoApp());
}
