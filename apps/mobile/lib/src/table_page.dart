import "package:flutter/material.dart";

import "ai_badge.dart";
import "game_controller.dart";
import "protocol.dart";

const talkTemplates = <String>[
  "我暫時未有實錘。",
  "我傾向跟多數。",
  "隔離要小心。",
  "未見足夠失聯痕跡。",
];

class TablePage extends StatefulWidget {
  const TablePage({super.key, required this.controller});

  final GameController controller;

  @override
  State<TablePage> createState() => _TablePageState();
}

class _TablePageState extends State<TablePage> {
  final _text = TextEditingController();
  String? _target;
  String _nightAction = "skip";

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final snapshot = widget.controller.snapshot;
    if (snapshot == null) return const SizedBox.shrink();
    final public = snapshot.public;
    final mine = snapshot.private;
    return Scaffold(
      appBar: AppBar(
        title: Text(public.phaseLabel.isEmpty ? public.phase : public.phaseLabel),
        actions: [
          TextButton(onPressed: widget.controller.leave, child: const Text("離開")),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              children: [
                Text(public.banner),
                const SizedBox(height: 8),
                Text(
                  "第 ${public.round} 輪 · 第 ${public.night} 夜 · 失聯 ${public.disconnects}／${public.disconnectsToWin}",
                ),
                const SizedBox(height: 4),
                Text(
                  "公開組成　燈塔網 ${public.composition.lighthouse} · 消音組 ${public.composition.silence} · 灰頻 ${public.composition.grey}",
                ),
                const SizedBox(height: 12),
                if (public.winner != null) _WinnerCard(winner: public.winner!),
                if (mine.role != null) _RoleCard(mine: mine),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    for (final seat in public.seats) _SeatChip(seat: seat, mine: mine.seatId == seat.id),
                  ],
                ),
                const SizedBox(height: 16),
                Text("公開頻道", style: Theme.of(context).textTheme.titleSmall),
                const SizedBox(height: 6),
                for (final line in public.log) Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Text(line),
                ),
                if (mine.inbox.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Text("私人匣", style: Theme.of(context).textTheme.titleSmall),
                  const SizedBox(height: 6),
                  for (final line in mine.inbox)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(line),
                    ),
                ],
                if (widget.controller.error != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8),
                    child: Text(widget.controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
                  ),
              ],
            ),
          ),
          const Divider(height: 1),
          SafeArea(
            top: false,
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxHeight: 280),
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 12),
                child: _actions(public, mine),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _actions(PublicView public, PrivateView mine) {
    if (!mine.alive) return const Text("你已離場，可以繼續睇公開頻道。");
    if (public.winner != null || public.phase == "ended") {
      return const Text("勝負已定。可以離開再開一房。");
    }
    if (public.phase == "resolve" || public.phase == "check") {
      return const Text("結算中，等伺服器進入下一階段。");
    }
    if (mine.ready && public.phase != "day_talk") {
      return const Text("已準備，等其他真人。");
    }
    switch (public.phase) {
      case "boot":
        return FilledButton(onPressed: widget.controller.ready, child: const Text("我睇完身分"));
      case "day_talk":
        if (!mine.canSpeak) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text("你被封口，呢回合只可以投票。"),
              const SizedBox(height: 8),
              FilledButton(onPressed: widget.controller.ready, child: const Text("準備好")),
            ],
          );
        }
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 6,
              children: [
                for (final phrase in talkTemplates)
                  ActionChip(label: Text(phrase), onPressed: () => _text.text = phrase),
              ],
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _text,
              decoration: const InputDecoration(labelText: "短句"),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                final text = _text.text.trim();
                if (text.isEmpty) return;
                widget.controller.chat(text);
                _text.clear();
              },
              child: const Text("送出"),
            ),
            const SizedBox(height: 8),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      case "draft":
        if (!mine.canSpeak) return const Text("你被封口，草稿都交唔到。等投票。");
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text("私人草稿。留空都得。"),
            const SizedBox(height: 8),
            TextField(
              controller: _text,
              decoration: const InputDecoration(labelText: "草稿"),
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: () {
                widget.controller.draft(_text.text);
                widget.controller.ready();
              },
              child: const Text("交草稿並準備"),
            ),
          ],
        );
      case "vote":
        final choices = public.seats.where((seat) => seat.alive && seat.id != mine.seatId);
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text("投一個仍在場嘅人，或者棄權。平票就流局，唔會隔離。撳準備好先會結算。"),
            const SizedBox(height: 8),
            Wrap(
              spacing: 6,
              children: [
                for (final seat in choices)
                  ChoiceChip(
                    label: Text("${seat.id} ${seat.nickname}"),
                    selected: _target == seat.id,
                    onSelected: (_) => setState(() => _target = seat.id),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            FilledButton(
              onPressed: _target == null ? null : () => widget.controller.vote(_target),
              child: const Text("確認投票"),
            ),
            TextButton(
              onPressed: () => widget.controller.vote(null),
              child: const Text("棄權"),
            ),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      case "night":
        if (mine.nightActions.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text("你今夜沒有主動技能。"),
              const SizedBox(height: 8),
              FilledButton(onPressed: widget.controller.ready, child: const Text("跳過並準備")),
            ],
          );
        }
        final selected = mine.nightActions.where((item) => item.action == _nightAction);
        final choice = selected.isEmpty ? mine.nightActions.first : selected.first;
        final targets = public.seats.where((seat) => seat.alive && (choice.action == "cover" || seat.id != mine.seatId));
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Wrap(
              spacing: 6,
              children: [
                for (final action in mine.nightActions)
                  ChoiceChip(
                    label: Text(action.label),
                    selected: choice.action == action.action,
                    onSelected: (_) => setState(() => _nightAction = action.action),
                  ),
              ],
            ),
            if (choice.needsTarget) ...[
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                children: [
                  for (final seat in targets)
                    ChoiceChip(
                      label: Text("${seat.id} ${seat.nickname}"),
                      selected: _target == seat.id,
                      onSelected: (_) => setState(() => _target = seat.id),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 8),
            FilledButton(
              onPressed: choice.needsTarget && _target == null
                  ? null
                  : () => widget.controller.night(choice.action, targetSeatId: choice.needsTarget ? _target : null),
              child: const Text("提交行動"),
            ),
            const SizedBox(height: 8),
            const Text("未提交就準備，會當跳過。"),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      default:
        return Text(public.phaseLabel);
    }
  }
}

class _WinnerCard extends StatelessWidget {
  const _WinnerCard({required this.winner});

  final Winner winner;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: const Color(0xFF243044),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text("終局"),
            const SizedBox(height: 4),
            Text(winner.factionLabel, style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: 4),
            Text(winner.reason),
          ],
        ),
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  const _RoleCard({required this.mine});

  final PrivateView mine;

  @override
  Widget build(BuildContext context) {
    final role = mine.role!;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("你嘅身分", style: Theme.of(context).textTheme.labelLarge),
            Text("${role.name} · ${role.factionLabel}", style: Theme.of(context).textTheme.titleLarge),
            const SizedBox(height: 4),
            Text(role.skill),
            if (mine.teammates.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text("組員：${mine.teammates.map((mate) => "${mate.nickname}（${mate.roleName}）").join("、")}"),
              ),
            if (mine.marks.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Text("你嘅標記：${mine.marks.join("、")}"),
              ),
          ],
        ),
      ),
    );
  }
}

class _SeatChip extends StatelessWidget {
  const _SeatChip({required this.seat, required this.mine});

  final PublicSeat seat;
  final bool mine;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: mine ? const Color(0xFF243044) : const Color(0xFF17202A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: seat.alive ? const Color(0xFF3A4A5C) : const Color(0xFF5A3030)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text("${seat.id} ${seat.nickname}${seat.alive ? "" : " · 離場"}${seat.sealed ? " · 封口" : ""}"),
          if (seat.isAi) ...[
            const SizedBox(width: 6),
            const AiBadge(),
          ],
        ],
      ),
    );
  }
}
