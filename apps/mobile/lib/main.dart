import "package:flutter/material.dart";

import "src/game_controller.dart";
import "src/home_page.dart";
import "src/lobby_page.dart";
import "src/table_page.dart";

void main() {
  runApp(const QuietZoneApp());
}

class QuietZoneApp extends StatefulWidget {
  const QuietZoneApp({super.key, this.controller});

  final GameController? controller;

  @override
  State<QuietZoneApp> createState() => _QuietZoneAppState();
}

class _QuietZoneAppState extends State<QuietZoneApp> {
  late final GameController _controller = widget.controller ?? GameController();

  @override
  void dispose() {
    if (widget.controller == null) _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: "消音區",
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: const ColorScheme.dark(
          surface: Color(0xFF17202A),
          primary: Color(0xFFE7C27A),
          secondary: Color(0xFF7EB6FF),
          error: Color(0xFFE07A7A),
        ),
        scaffoldBackgroundColor: const Color(0xFF0E141B),
        inputDecorationTheme: const InputDecorationTheme(
          border: OutlineInputBorder(),
          isDense: true,
        ),
      ),
      home: ListenableBuilder(
        listenable: _controller,
        builder: (context, _) {
          final snapshot = _controller.snapshot;
          if (snapshot == null) return HomePage(controller: _controller);
          if (snapshot.public.phase == "lobby") return LobbyPage(controller: _controller);
          return TablePage(controller: _controller);
        },
      ),
    );
  }
}
