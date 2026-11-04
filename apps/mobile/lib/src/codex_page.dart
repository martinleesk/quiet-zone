import "package:flutter/material.dart";

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
    return Scaffold(
      appBar: AppBar(title: const Text("角色圖鑑")),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
        children: [
          Text(
            "標準 Mode",
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(color: const Color(0xFFE7C27A)),
          ),
          const SizedBox(height: 6),
          const Text("公開規則。開局前或者局中都可以睇。呢度只列角色同技能，唔會顯示你或者席上任何人嘅私人身分。"),
          const SizedBox(height: 6),
          const Text(
              "勝負次序：灰頻獨贏，然後消音組，然後燈塔網。11 席係燈塔網 7、消音組 3、灰頻 1。閒職會派兩席，圖鑑只列一次。"),
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
        Text(group.label,
            style: Theme.of(context)
                .textTheme
                .titleLarge
                ?.copyWith(color: accent)),
        const SizedBox(height: 2),
        Text(group.blurb),
      ],
    );
  }
}

class _RoleCodexCard extends StatelessWidget {
  const _RoleCodexCard({required this.role});

  final CodexRole role;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(role.faction);
    return Card(
      color: const Color(0xFF17202A),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            RoleBust(roleId: role.id, accent: accent),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(role.name,
                      style: Theme.of(context).textTheme.titleMedium),
                  const SizedBox(height: 2),
                  Text(factionLabelOf(role.faction),
                      style: TextStyle(color: accent)),
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

/// Shows the art-pack bust when [roleBustAsset] has a path. Text-only until then.
class RoleBust extends StatelessWidget {
  const RoleBust({super.key, required this.roleId, required this.accent});

  final String roleId;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final asset = roleBustAsset(roleId);
    if (asset == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(right: 12),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.asset(
          asset,
          width: 72,
          height: 96,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => _placeholder(),
        ),
      ),
    );
  }

  Widget _placeholder() {
    return Container(
      width: 72,
      height: 96,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: const Color(0xFF243044),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accent),
      ),
    );
  }
}
