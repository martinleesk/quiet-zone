import "dart:async";

import "package:flutter/widgets.dart";

import "main.dart" show lockQuietZoneLandscape;
import "src/signal/signal_page.dart";

/// Solo 訊號牌 trial. One human seat, AI fills the table,
/// and the authoritative loop runs in the page (no separate server).
///
/// ```bash
/// cd apps/server && npm run build:trial
/// cd ../mobile && flutter run -d chrome -t lib/trial_main.dart
/// ```
///
/// Phone browsers can also open `docs/trial/signal/index.html`.
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  unawaited(lockQuietZoneLandscape());
  runApp(const SignalApp());
}
