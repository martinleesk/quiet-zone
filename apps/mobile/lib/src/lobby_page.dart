import "package:flutter/material.dart";

import "ai_badge.dart";
import "codex_page.dart";
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
          TextButton(onPressed: () => openRoleCodex(context), child: const Text("角色圖鑑")),
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
          Text("標準 Mode · ${seats.length}／11 席。齊人準備後，房主先可以開。空位由 AI 補。"),
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
              trailing: seat.isAi
                  ? const AiBadge()
                  : Text(seat.lobbyReady ? "已準備" : "未準備"),
            ),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: (snapshot?.private.ready ?? false) ? null : controller.ready,
            child: const Text("準備好"),
          ),
          const SizedBox(height: 8),
          if (isHost)
            FilledButton(
              onPressed: seats.isNotEmpty && seats.where((seat) => !seat.isAi).every((seat) => seat.lobbyReady)
                  ? controller.startGame
                  : null,
              child: const Text("開始封鎖（AI 補滿 11 席）"),
            )
          else
            const Text("等房主開始。開局之後房間會鎖定。"),
        ],
      ),
    );
  }
}
