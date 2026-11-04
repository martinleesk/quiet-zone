import "package:flutter/material.dart";

import "ai_badge.dart";
import "game_controller.dart";

class LobbyPage extends StatelessWidget {
  const LobbyPage({super.key, required this.controller});

  final GameController controller;

  @override
  Widget build(BuildContext context) {
    final snapshot = controller.snapshot;
    final seats = snapshot?.public.seats ?? const [];
    final isHost = snapshot?.private.isHost ?? false;
    return Scaffold(
      appBar: AppBar(
        title: const Text("組席"),
        actions: [
          TextButton(onPressed: controller.leave, child: const Text("離開")),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Text("房間代碼", style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 4),
          SelectableText(
            snapshot?.public.code ?? "",
            style: Theme.of(context).textTheme.displaySmall?.copyWith(letterSpacing: 6),
          ),
          const SizedBox(height: 8),
          Text("標準 Mode · ${seats.length}／11 席。開始時會用 AI 補滿。"),
          const SizedBox(height: 16),
          if (controller.error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
            ),
          for (final seat in seats)
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text("${seat.id}  ${seat.nickname}"),
              trailing: seat.isAi ? const AiBadge() : const Text("真人"),
            ),
          const SizedBox(height: 12),
          if (isHost)
            FilledButton(
              onPressed: controller.startGame,
              child: const Text("開始封鎖（AI 補滿 11 席）"),
            )
          else
            const Text("等房主開始。"),
        ],
      ),
    );
  }
}
