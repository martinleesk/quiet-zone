import "dart:math" as math;

import "package:flutter/material.dart";

import "art.dart";
import "frame.dart";
import "role_catalog.dart";

const _rules = "公開規則。開局前或者局中都可以睇。撳一個角色先睇陣營同技能，唔會顯示你或者席上任何人嘅私人身分。";
const _order = "勝負次序：灰頻獨贏，然後消音組，然後燈塔網。11 席係燈塔網 7、消音組 3、灰頻 1。閒職會派兩席，圖鑑只列一次。";

/// Public Standard Mode rulebook. Safe to open before a room or over a live table.
void openRoleCodex(BuildContext context) {
  Navigator.of(context).push(
    MaterialPageRoute<void>(builder: (_) => const RoleCodexPage()),
  );
}

class RoleCodexPage extends StatefulWidget {
  const RoleCodexPage({super.key});

  @override
  State<RoleCodexPage> createState() => _RoleCodexPageState();
}

class _RoleCodexPageState extends State<RoleCodexPage> {
  CodexRole? _selected;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final landscape = preferLandscape(constraints);
        return Scaffold(
          appBar: AppBar(
            toolbarHeight: landscape ? 48 : null,
            title: const Text("角色圖鑑"),
          ),
          body: SafeArea(
            top: false,
            child: landscape
                ? _LandscapeCodex(
                    selected: _selected,
                    onSelect: (role) => setState(() => _selected = role),
                    onClose: () => setState(() => _selected = null),
                  )
                : _PortraitCodex(onSelect: (role) => _openSheet(context, role)),
          ),
        );
      },
    );
  }

  void _openSheet(BuildContext context, CodexRole role) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF17202A),
      showDragHandle: true,
      builder: (sheetContext) {
        final height = MediaQuery.sizeOf(sheetContext).height;
        return SafeArea(
          child: ConstrainedBox(
            constraints: BoxConstraints(maxHeight: height * 0.85),
            child: SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
              child: _RoleCodexDetail(
                role: role,
                onClose: () => Navigator.of(sheetContext).pop(),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _PortraitCodex extends StatelessWidget {
  const _PortraitCodex({required this.onSelect});

  final ValueChanged<CodexRole> onSelect;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
      children: [
        const _CodexIntro(),
        const SizedBox(height: 16),
        for (final group in kCodexFactions) ...[
          _FactionLabel(group: group, large: true),
          const SizedBox(height: 8),
          for (final role in group.roles) ...[
            _RoleTile(role: role, wide: true, onTap: () => onSelect(role)),
            const SizedBox(height: 8),
          ],
          const SizedBox(height: 8),
        ],
      ],
    );
  }
}

class _LandscapeCodex extends StatelessWidget {
  const _LandscapeCodex({
    required this.selected,
    required this.onSelect,
    required this.onClose,
  });

  final CodexRole? selected;
  final ValueChanged<CodexRole> onSelect;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final panel = selected == null ? 0.0 : math.min(300.0, constraints.maxWidth * 0.42);
        return Row(
          key: const Key("landscape-codex"),
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Expanded(
              child: _LandscapeOverview(selectedId: selected?.id, onSelect: onSelect),
            ),
            if (selected != null)
              SizedBox(
                width: panel,
                child: DecoratedBox(
                  decoration: const BoxDecoration(
                    color: Color(0xFF121A22),
                    border: Border(left: BorderSide(color: Color(0xFF3A4A5C))),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(14, 6, 12, 10),
                    child: _RoleCodexDetail(role: selected!, onClose: onClose),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }
}

class _LandscapeOverview extends StatelessWidget {
  const _LandscapeOverview({required this.selectedId, required this.onSelect});

  final String? selectedId;
  final ValueChanged<CodexRole> onSelect;

  @override
  Widget build(BuildContext context) {
    final primary = kCodexFactions.first;
    final rest = kCodexFactions.skip(1).toList();
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(12, 6, 12, 8),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: math.max(0, constraints.maxHeight - 14)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const _CodexIntro(compact: true),
                const SizedBox(height: 6),
                _FactionBand(group: primary, selectedId: selectedId, onSelect: onSelect),
                if (rest.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      for (var i = 0; i < rest.length; i++) ...[
                        if (i > 0) const SizedBox(width: 8),
                        Expanded(
                          flex: rest[i].roles.length,
                          child: _FactionBand(group: rest[i], selectedId: selectedId, onSelect: onSelect),
                        ),
                      ],
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
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
    final rules = Text(_rules, style: TextStyle(height: compact ? 1.25 : null));
    final order = Text(_order, style: TextStyle(height: compact ? 1.25 : null));
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        title,
        SizedBox(height: compact ? 2 : 6),
        rules,
        SizedBox(height: compact ? 2 : 6),
        order,
      ],
    );
  }
}

class _FactionLabel extends StatelessWidget {
  const _FactionLabel({required this.group, this.large = false});

  final CodexFactionGroup group;
  final bool large;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(group.id);
    final style = large ? Theme.of(context).textTheme.titleLarge : Theme.of(context).textTheme.titleSmall;
    return Text(group.label, style: style?.copyWith(color: accent, fontWeight: FontWeight.w700));
  }
}

class _FactionBand extends StatelessWidget {
  const _FactionBand({
    required this.group,
    required this.selectedId,
    required this.onSelect,
  });

  final CodexFactionGroup group;
  final String? selectedId;
  final ValueChanged<CodexRole> onSelect;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _FactionLabel(group: group),
        const SizedBox(height: 4),
        LayoutBuilder(
          builder: (context, constraints) {
            final count = math.max(1, group.roles.length);
            const spacing = 6.0;
            final columns = math.max(1, math.min(count, (constraints.maxWidth / 78).floor()));
            final gaps = spacing * (columns - 1);
            final tileW = math.max(0.0, ((constraints.maxWidth - gaps) / columns).floorToDouble());
            return Wrap(
              spacing: spacing,
              runSpacing: spacing,
              children: [
                for (final role in group.roles)
                  SizedBox(
                    width: tileW,
                    child: _RoleTile(
                      role: role,
                      selected: role.id == selectedId,
                      onTap: () => onSelect(role),
                    ),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

class _RoleTile extends StatelessWidget {
  const _RoleTile({
    required this.role,
    required this.onTap,
    this.selected = false,
    this.wide = false,
  });

  final CodexRole role;
  final VoidCallback onTap;
  final bool selected;
  final bool wide;

  @override
  Widget build(BuildContext context) {
    final accent = factionAccent(role.faction);
    final name = Text(
      role.name,
      textAlign: wide ? TextAlign.start : TextAlign.center,
      softWrap: true,
      style: Theme.of(context).textTheme.bodyMedium,
    );
    return Material(
      color: const Color(0xFF17202A),
      borderRadius: BorderRadius.circular(10),
      child: InkWell(
        key: Key("codex-role:${role.id}"),
        borderRadius: BorderRadius.circular(10),
        onTap: onTap,
        child: Container(
          width: double.infinity,
          padding: EdgeInsets.all(wide ? 8 : 4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            border: Border.all(color: selected ? accent : const Color(0xFF3A4A5C), width: selected ? 2 : 1),
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final bustH = wide ? 72.0 : 52.0;
              final gap = role.id == "civilian" ? 4.0 : 0.0;
              final slots = role.id == "civilian" ? 2 : 1;
              final bustW = math.max(0.0, math.min(wide ? 54.0 : 44.0, (constraints.maxWidth - gap * (slots - 1)) / slots));
              final busts = _RoleBusts(role: role, accent: accent, width: bustW, height: bustH);
              if (wide) {
                return Row(
                  children: [
                    busts,
                    const SizedBox(width: 10),
                    Expanded(child: name),
                  ],
                );
              }
              return Column(
                children: [
                  busts,
                  const SizedBox(height: 4),
                  name,
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _RoleBusts extends StatelessWidget {
  const _RoleBusts({
    required this.role,
    required this.accent,
    required this.width,
    required this.height,
    this.tagged = true,
  });

  final CodexRole role;
  final Color accent;
  final double width;
  final double height;
  final bool tagged;

  @override
  Widget build(BuildContext context) {
    if (role.id != "civilian") {
      return RoleBust(
        roleId: role.id,
        accent: accent,
        width: width,
        height: height,
        padding: EdgeInsets.zero,
        tagged: tagged,
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        RoleBust(
          roleId: role.id,
          accent: accent,
          width: width,
          height: height,
          padding: const EdgeInsets.only(right: 4),
          tagged: tagged,
        ),
        RoleBust(
          roleId: role.id,
          accent: accent,
          asset: ArtCatalog.civilianM,
          width: width,
          height: height,
          padding: EdgeInsets.zero,
          tagged: tagged,
        ),
      ],
    );
  }
}

class _RoleCodexDetail extends StatelessWidget {
  const _RoleCodexDetail({required this.role, required this.onClose});

  final CodexRole role;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    final group = kCodexFactions.firstWhere((item) => item.id == role.faction);
    final accent = factionAccent(role.faction);
    return Column(
      key: const Key("codex-detail"),
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _RoleBusts(role: role, accent: accent, width: 48, height: 64, tagged: false),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(role.name, softWrap: true, style: Theme.of(context).textTheme.titleMedium),
                      ),
                      IconButton(
                        tooltip: "關閉詳情",
                        visualDensity: VisualDensity.compact,
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
                        onPressed: onClose,
                        icon: const Icon(Icons.close, size: 18),
                      ),
                    ],
                  ),
                  Text(factionLabelOf(role.faction), style: TextStyle(color: accent)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(role.skill, softWrap: true),
        const SizedBox(height: 8),
        Text("點贏", style: Theme.of(context).textTheme.labelLarge?.copyWith(color: accent)),
        const SizedBox(height: 2),
        Text(group.blurb, softWrap: true),
      ],
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
    this.padding = const EdgeInsets.only(right: 12),
    this.tagged = true,
  });

  final String roleId;
  final Color accent;
  final String? asset;
  final double width;
  final double height;
  final EdgeInsets padding;
  final bool tagged;

  @override
  Widget build(BuildContext context) {
    final path = asset ?? roleBustAsset(roleId);
    if (path == null) return const SizedBox.shrink();
    return Padding(
      padding: padding,
      child: ClipRRect(
        key: tagged ? Key("codex-bust:$path") : null,
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
