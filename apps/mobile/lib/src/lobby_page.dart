import "package:flutter/material.dart";

import "ai_badge.dart";
import "art.dart";
import "codex_page.dart";
import "frame.dart";
import "game_controller.dart";
import "protocol.dart";

class LobbyPage extends StatelessWidget {
  const LobbyPage({super.key, required this.controller});

  final GameController controller;

  static String roomLine(List<PublicSeat> seats) {
    if (seats.length >= 11) return "標準 Mode · 11／11 席。真人準備好，房主就可以開始。";
    return "標準 Mode · ${seats.length}／11 席。齊人準備後，房主先可以開。空位由 AI 補。";
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = controller.snapshot;
    final seats = snapshot?.public.seats ?? const <PublicSeat>[];
    final isHost = snapshot?.private.isHost ?? false;
    return LayoutBuilder(
      builder: (context, constraints) {
        final landscape = preferLandscape(constraints);
        return Scaffold(
          appBar: AppBar(
            title: const Text("組席"),
            actions: [
              TextButton(onPressed: () => openRoleCodex(context), child: const Text("角色圖鑑")),
              TextButton(onPressed: controller.leave, child: const Text("離開")),
            ],
          ),
          body: SafeArea(
            top: false,
            child: landscape ? _landscape(context, snapshot, seats, isHost) : _portrait(context, snapshot, seats, isHost),
          ),
        );
      },
    );
  }

  Widget _portrait(BuildContext context, GameSnapshot? snapshot, List<PublicSeat> seats, bool isHost) {
    return Column(
      children: [
        SceneBackdrop.banner(
          phase: "lobby",
          height: 176,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text("房間代碼", style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 4),
                SelectableText(
                  snapshot?.public.code ?? "",
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(letterSpacing: 6),
                ),
              ],
            ),
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            children: [
              Text(roomLine(seats)),
              const SizedBox(height: 16),
              if (controller.error != null) _error(),
              for (final seat in seats)
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text("${seat.id}  ${seat.nickname}"),
                  trailing: seat.isAi ? const AiBadge() : Text(seat.lobbyReady ? "已準備" : "未準備"),
                ),
              const SizedBox(height: 12),
              ..._actions(snapshot, seats, isHost),
            ],
          ),
        ),
      ],
    );
  }

  Widget _landscape(BuildContext context, GameSnapshot? snapshot, List<PublicSeat> seats, bool isHost) {
    return Row(
      key: const Key("landscape-lobby"),
      children: [
        Expanded(
          flex: 4,
          child: SceneBackdrop.stage(
            phase: "lobby",
            child: StageCopy(
              children: [
                Text("房間代碼", style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 4),
                SelectableText(
                  snapshot?.public.code ?? "",
                  style: Theme.of(context).textTheme.displaySmall?.copyWith(letterSpacing: 6, height: 1.05),
                ),
                const SizedBox(height: 8),
                Text(roomLine(seats)),
              ],
            ),
          ),
        ),
        Expanded(
          flex: 7,
          child: Column(
            children: [
              if (controller.error != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: _error(),
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [for (final seat in seats) _LobbySeat(seat: seat)],
                    ),
                  ],
                ),
              ),
              ConstrainedBox(
                constraints: const BoxConstraints(maxHeight: 148),
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: _actions(snapshot, seats, isHost),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _error() {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
    );
  }

  List<Widget> _actions(GameSnapshot? snapshot, List<PublicSeat> seats, bool isHost) {
    final humansReady = seats.isNotEmpty && seats.where((seat) => !seat.isAi).every((seat) => seat.lobbyReady);
    return [
      FilledButton(
        onPressed: (snapshot?.private.ready ?? false) ? null : controller.ready,
        child: const Text("準備好"),
      ),
      const SizedBox(height: 8),
      if (isHost)
        FilledButton(
          onPressed: humansReady ? controller.startGame : null,
          child: const Text("開始封鎖（AI 補滿 11 席）", textAlign: TextAlign.center),
        )
      else
        const Text("等房主開始。開局之後房間會鎖定。"),
    ];
  }
}

class _LobbySeat extends StatelessWidget {
  const _LobbySeat({required this.seat});

  final PublicSeat seat;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF17202A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF3A4A5C)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              color: Color(0xFF243044),
              border: Border.fromBorderSide(BorderSide(color: Color(0xFF8AA0B4))),
            ),
          ),
          const SizedBox(width: 8),
          Text("${seat.id}  ${seat.nickname}"),
          const SizedBox(width: 8),
          if (seat.isAi) const AiBadge() else Text(seat.lobbyReady ? "已準備" : "未準備"),
        ],
      ),
    );
  }
}
