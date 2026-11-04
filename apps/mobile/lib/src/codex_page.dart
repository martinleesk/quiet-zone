import "package:flutter/material.dart";

import "art.dart";
import "frame.dart";
import "role_catalog.dart";

/// Public Standard Mode rulebook. Safe to open before a room or over a live table.
void openRoleCodex(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => const RoleCodexPage()),
  );
}

class RoleCodexPage extends StatelessWidget {
  const RoleCodexPage({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return Scaffold(
          appBar: AppBar(title: const Text("角色圖鑑")),
          body: preferLandscape(constraints) ? const _LandscapeCodex() : const _PortraitCodex(),
        );
      },
    );
  }
}

class _PortraitCodex extends StatelessWidget {
  const _PortraitCodex();

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        const _CodexIntro(),
        const SizedBox(height: 20),
        for (final group in kCodexFactions) ...[
          _FactionHeader(group: group),
          const SizedBox(height: 8),
          for (final role in group.roles) ...[
            _RoleCodexCard(role: role),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _LandscapeCodex extends StatelessWidget {
  const _LandscapeCodex();

  @override
  Widget build(BuildContext context) {
    return Column(
      key: const Key("landscape-codex"),
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: _CodexIntro(compact: true),
        ),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final group in kCodexFactions) Expanded(child: _FactionColumn(group: group)),
            ],
          ),
        ),
      ],
    );
  }
}

class _CodexIntro extends StatelessWidget {
  const _CodexIntro({this.compact = false});

  final bool compact;

  @override
  Widget build(BuildContext context) {
    final title = Text(
      "標準 Mode",
      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: const Color(0xFFE7C27A)),
    );
    const rules = Text("公開規則。開局前或者局中都可以睇。呢度只列角色同技能，唔會顯示你或者席上任何人嘅私人身分。");
    const order = Text("勝負次序：灰頻獨贏，然後消音組，然後燈塔網。11 席係燈塔網 7、消音組 3、灰頻 1。閒職會派兩席，圖鑑只列一次。");
    if (!compact) {
      return const Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _GoldTitle(),
          SizedBox(height: 6),
          rules,
          SizedBox(height: 6),
          order,
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        title,
        const SizedBox(height: 4),
        rules,
        const SizedBox(height: 2),
        order,
      ],
    );
  }
}

class _GoldTitle extends StatelessWidget {
  const _GoldTitle();

  @override
  Widget build(BuildContext context) {
    return Text(
      "標準 Mode",
      style: Theme.of(context).textTheme.titleMedium?.copyWith(color: const Color(0xFFE7C27A)),
    );
  }
}

class _FactionColumn extends StatelessWidget {
  const _FactionColumn({required this.group});

  final CodexFactionGroup group;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(group.id);
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 0, 8, 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(group.label, style: Theme.of(context).textTheme.titleMedium?.copyWith(color: accent)),
          Text(group.blurb, style: Theme.of(context).textTheme.bodySmall),
          const SizedBox(height: 6),
          Expanded(
            child: SingleChildScrollView(
              child: Column(
                children: [
                  for (final role in group.roles) ...[
                    _RoleCodexCard(role: role, dense: true),
                    const SizedBox(height: 6),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FactionHeader extends StatelessWidget {
  const _FactionHeader({required this.group});

  final CodexFactionGroup group;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(group.id);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(group.label, style: Theme.of(context).textTheme.titleLarge?.copyWith(color: accent)),
        const SizedBox(height: 2),
        Text(group.blurb),
      ],
    );
  }
}

class _RoleCodexCard extends StatelessWidget {
  const _RoleCodexCard({required this.role, this.dense = false});

  final CodexRole role;
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(role.faction);
    final bustW = dense ? 52.0 : 72.0;
    final bustH = dense ? 68.0 : 96.0;
    return Card(
      color: const Color(0xFF17202A),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: EdgeInsets.all(dense ? 8 : 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RoleBust(roleId: role.id, accent: accent, width: bustW, height: bustH),
            if (role.id == "civilian")
              RoleBust(
                roleId: role.id,
                accent: accent,
                asset: ArtCatalog.civilianM,
                width: bustW,
                height: bustH,
              ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(role.name, style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(factionLabelOf(role.faction), style: TextStyle(color: accent)),
                  const SizedBox(height: 6),
                  Text(role.skill),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

Color factionAccent(String faction) {
  switch (faction) {
    case "lighthouse":
      return const Color(0xFFE7C27A);
    case "silence":
      return const Color(0xFFE07A7A);
    case "grey":
      return const Color(0xFF9AA7B5);
    default:
      return const Color(0xFF7EB6FF);
  }
}

/// 3D bust for a codex card. Unknown ids stay a neutral block, not a faction circle.
class RoleBust extends StatelessWidget {
  const RoleBust({
    super.key,
    required this.roleId,
    required this.accent,
    this.asset,
    this.width = 72,
    this.height = 96,
  });

  final String roleId;
  final Color accent;
  final String? asset;
  final double width;
  final double height;

  @override
  Widget build(BuildContext context) {
    final path = asset ?? roleBustAsset(roleId);
    if (path == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: ClipRRect(
        key: Key("codex-bust:$path"),
        borderRadius: BorderRadius.circular(8),
        child: Image.asset(
          path,
          width: width,
          height: height,
          fit: BoxFit.cover,
          alignment: ArtCatalog.bustAlignment(path),
          errorBuilder: (_, __, ___) => _placeholder(),
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: width,
      height: height,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF243044),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accent),
      ),
    );
  }
}
