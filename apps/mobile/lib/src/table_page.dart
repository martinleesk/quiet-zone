import "package:flutter/material.dart";

import "ai_badge.dart";
import "codex_page.dart";
import "game_controller.dart";
import "protocol.dart";

const silenceTemplates = <String>[
  "今夜我建議失聯一個燈塔席。",
  "可能有掩護，換一個目標。",
  "我跟組內嘅選擇。",
  "今輪跳過，唔好暴露。",
  "小心灰頻，唔好亂送頭。",
];

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
  bool _anonymous = false;

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
          if ((widget.controller.secondsLeft ?? public.secondsLeft) != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Text("剩餘 ${widget.controller.secondsLeft ?? public.secondsLeft} 秒"),
              ),
            ),
          IconButton(
            tooltip: "角色圖鑑",
            onPressed: () => openRoleCodex(context),
            icon: const Icon(Icons.menu_book_outlined),
          ),
          TextButton(onPressed: widget.controller.leave, child: const Text("離開")),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              children: [
                ..._tips(mine),
                Text(public.banner),
                const SizedBox(height: 8),
                Text(
                  "第 ${public.round} 輪 · 第 ${public.night} 夜 · 失聯 ${public.disconnects}／${public.disconnectsToWin}",
                ),
                const SizedBox(height: 4),
                Text(
                  "公開組成　燈塔網 ${public.composition.lighthouse} · 消音組 ${public.composition.silence} · 灰頻 ${public.composition.grey}",
                ),
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 0), visualDensity: VisualDensity.compact),
                    onPressed: () => openRoleCodex(context),
                    child: const Text("角色圖鑑"),
                  ),
                ),
                const SizedBox(height: 12),
                if (public.winner != null) _WinnerCard(winner: public.winner!, reveal: public.reveal),
                if (mine.remnants.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text("回波殘片", style: Theme.of(context).textTheme.titleSmall),
                  for (final remnant in mine.remnants)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text("${remnant.nickname} · ${remnant.factionLabel}"),
                    ),
                ],
                if (mine.sealCard != null)
                  Card(
                    color: const Color(0xFF3A2A32),
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Text(mine.sealCard!),
                    ),
                  ),
                if (mine.role != null) _RoleCard(mine: mine),
                if (public.pins.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text("釘選時間線", style: Theme.of(context).textTheme.titleSmall),
                  for (final pin in public.pins)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(pin.unverified ? "待核實｜${pin.text}" : pin.text),
                    ),
                ],
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

  List<Widget> _silenceChannel(PublicView public, PrivateView mine) {
    if (mine.role?.faction != "silence" || public.phase != "night") return const [];
    return [
      const Text("消音組夜訊。只可以用模板，唔會公開。"),
      const SizedBox(height: 6),
      Wrap(
        spacing: 6,
        children: [
          for (final line in silenceTemplates)
            ActionChip(
              label: Text(line),
              onPressed: () => widget.controller.silence(line),
            ),
        ],
      ),
      for (final note in mine.silenceChannel)
        Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Text("${note.nickname}：${note.text}"),
        ),
      const SizedBox(height: 8),
    ];
  }

  List<Widget> _tips(PrivateView mine) {
    final visible = mine.tips.where((tip) => !widget.controller.dismissedTips.contains(tip.id));
    return [
      for (final tip in visible)
        Card(
          color: const Color(0xFF243044),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 4, 8),
            child: Row(
              children: [
                Expanded(child: Text(tip.text)),
                IconButton(
                  onPressed: () => widget.controller.dismissTip(tip.id),
                  icon: const Icon(Icons.close, size: 18),
                  tooltip: "收起提示",
                ),
              ],
            ),
          ),
        ),
    ];
  }

  List<Widget> _skillControls(PublicView public, PrivateView mine) {
    if (mine.skillActions.isEmpty) return const [];
    return [
      for (final action in mine.skillActions)
        if (action.action == "pin" || action.action == "fake_plant")
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: FilledButton(
              onPressed: () {
                final text = _text.text.trim();
                if (text.isEmpty) return;
                widget.controller.skill(action.action, text: text);
                _text.clear();
              },
              child: Text(action.label),
            ),
          )
        else if (action.action == "link")
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: FilledButton(
              onPressed: _target == null ? null : () => widget.controller.skill("link", targetId: _target),
              child: const Text("核對通聯"),
            ),
          )
        else if (action.action == "mark")
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text("私密標記。撳一下標記，再撳取消。唔會話你知係咪消音。"),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 6,
                  children: [
                    for (final seat in public.seats.where((seat) => seat.alive && seat.id != mine.seatId))
                      FilterChip(
                        label: Text("${seat.id} ${seat.nickname}"),
                        selected: mine.marks.contains(seat.id),
                        onSelected: (selected) => widget.controller.mark(seat.id, marked: selected),
                      ),
                  ],
                ),
              ],
            ),
          )
        else if (action.action == "fake_flag")
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Wrap(
              spacing: 6,
              children: [
                for (final pin in public.pins.where((item) => !item.unverified))
                  ActionChip(
                    label: Text("待核實｜${pin.text}"),
                    onPressed: () => widget.controller.skill("fake_flag", targetId: pin.id),
                  ),
              ],
            ),
          ),
      if (mine.skillActions.any((action) => action.action == "link"))
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Wrap(
            spacing: 6,
            children: [
              for (final seat in public.seats.where((seat) => seat.alive && seat.id != mine.seatId))
                ChoiceChip(
                  label: Text(seat.nickname),
                  selected: _target == seat.id,
                  onSelected: (_) => setState(() => _target = seat.id),
                ),
            ],
          ),
        ),
    ];
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
    if (mine.muted && (public.phase == "day_talk" || public.phase == "draft")) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text("封口中：呢個階段只可以等投票，唔可以發言。"),
          const SizedBox(height: 8),
          FilledButton(onPressed: widget.controller.ready, child: const Text("準備好")),
        ],
      );
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
            ..._skillControls(public, mine),
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
            Text(mine.muted
                ? "你被封口，而家只可以投票。"
                : "投一個仍在場嘅人，或者棄權。平票就流局，唔會隔離。結算先公開票簿。"),
            if (mine.anonymousVote) ...[
              const SizedBox(height: 8),
              FilterChip(
                label: const Text("匿名票（每局一次）"),
                selected: _anonymous,
                onSelected: (value) => setState(() => _anonymous = value),
              ),
            ],
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
              onPressed: _target == null ? null : () => widget.controller.vote(_target, anonymous: _anonymous),
              child: const Text("確認投票"),
            ),
            TextButton(
              onPressed: () => widget.controller.vote(null, anonymous: _anonymous),
              child: const Text("棄權"),
            ),
            OutlinedButton(onPressed: widget.controller.ready, child: const Text("準備好")),
          ],
        );
      case "night":
        final nightActions = mine.nightActions.where((item) => item.action != "mark").toList();
        if (nightActions.isEmpty) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ..._silenceChannel(public, mine),
              ..._skillControls(public, mine),
              Text(mine.skillActions.isEmpty ? "你今夜沒有主動技能。" : "可以改標記，或者放假訊。"),
              const SizedBox(height: 8),
              FilledButton(onPressed: widget.controller.ready, child: const Text("跳過並準備")),
            ],
          );
        }
        final selected = nightActions.where((item) => item.action == _nightAction);
        final choice = selected.isEmpty ? nightActions.first : selected.first;
        final targets = public.seats.where((seat) => seat.alive && (choice.action == "cover" || seat.id != mine.seatId));
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ..._silenceChannel(public, mine),
            ..._skillControls(public, mine),
            Wrap(
              spacing: 6,
              children: [
                for (final action in nightActions)
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
  const _WinnerCard({required this.winner, required this.reveal});

  final Winner winner;
  final List<SeatReveal> reveal;

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
            if (reveal.isNotEmpty) ...[
              const SizedBox(height: 12),
              const Text("身分公開"),
              for (final seat in reveal)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text("${seat.seatId} ${seat.nickname} · ${seat.roleName} · ${seat.factionLabel}${seat.alive ? "" : " · 離場"}"),
                ),
            ],
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
