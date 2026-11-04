import "package:flutter/material.dart";

import "protocol.dart";

/// Stylized 3D busts and phase scenes. Gender lock is documented in ART.md.
class ArtCatalog {
  const ArtCatalog._();

  /// Off only if the pubspec asset list is removed with the files.
  static final bool installed = true;

  static const warrant = "assets/art/roles/warrant.jpg";
  static const silencer = "assets/art/roles/silencer.jpg";
  static const tip = "assets/art/roles/tip.jpg";
  static const cover = "assets/art/roles/cover.jpg";
  static const decoy = "assets/art/roles/decoy.jpg";
  static const sweep = "assets/art/roles/sweep.jpg";
  static const echo = "assets/art/roles/echo.jpg";
  static const link = "assets/art/roles/link.jpg";
  static const plant = "assets/art/roles/plant.jpg";
  static const civilianF = "assets/art/roles/civilian_f.jpg";
  static const civilianM = "assets/art/roles/civilian_m.jpg";
  static const dayTalk = "assets/art/scenes/day_talk.jpg";
  static const night = "assets/art/scenes/night.jpg";
  static const styleBoard = "assets/art/ref/style-board.jpg";

  /// In-game files plus the reference board, which is not drawn.
  static const reservedFiles = <String>[
    warrant,
    silencer,
    tip,
    cover,
    decoy,
    sweep,
    echo,
    link,
    plant,
    civilianF,
    civilianM,
    dayTalk,
    night,
    styleBoard,
  ];

  /// RoleId → default bust. Civilian maps to the woman; [bustFor] may swap in the man.
  static const roleBusts = <String, String>{
    "warrant": warrant,
    "silencer": silencer,
    "tip": tip,
    "cover": cover,
    "decoy": decoy,
    "sweep": sweep,
    "echo": echo,
    "link": link,
    "plant": plant,
    "civilian": civilianF,
  };

  static const lighthouse = Color(0xFF3ECFBF);
  static const silence = Color(0xFF8B78E6);
  static const grey = Color(0xFFE7C27A);

  static const dayGlow = Color(0xFF14615C);
  static const nightGlow = Color(0xFF3A2266);
  static const deep = Color(0xFF0E141B);

  static const dayTone = SceneTone(glow: dayGlow, scenic: true);
  static const nightTone = SceneTone(glow: nightGlow, scenic: true);
  static const plainTone = SceneTone(glow: Color(0xFF17202A), scenic: false);

  static String? bustFor(String roleId, {String? seatId}) {
    if (!installed) return null;
    if (roleId == "civilian") return _civilianUsesMale(seatId) ? civilianM : civilianF;
    return roleBusts[roleId];
  }

  /// Odd seat-code sum picks the male civilian. No seat stays on the woman.
  static bool _civilianUsesMale(String? seatId) {
    if (seatId == null || seatId.isEmpty) return false;
    var sum = 0;
    for (final unit in seatId.codeUnits) {
      sum += unit;
    }
    return sum.isOdd;
  }

  static Alignment bustAlignment(String asset) {
    if (asset == civilianF) return const Alignment(-0.72, -0.15);
    if (asset == civilianM) return const Alignment(0.55, -0.1);
    return Alignment.topCenter;
  }

  /// File reserved for this phase, even while the pack is not installed.
  static String? reservedScene(String phase) {
    switch (phase) {
      case "home":
      case "lobby":
      case "day_talk":
      case "draft":
        return dayTalk;
      case "night":
        return night;
      default:
        return null;
    }
  }

  static String? sceneFor(String phase) => installed ? reservedScene(phase) : null;

  static SceneTone toneFor(String phase) {
    switch (phase) {
      case "night":
        return nightTone;
      case "home":
      case "lobby":
      case "day_talk":
      case "draft":
        return dayTone;
      default:
        return plainTone;
    }
  }

  static bool showsBackdrop(String phase) => toneFor(phase).scenic;

  static Color factionColor(String faction) {
    switch (faction) {
      case "lighthouse":
        return lighthouse;
      case "silence":
        return silence;
      case "grey":
        return grey;
      default:
        return const Color(0xFF8AA0B4);
    }
  }
}

class SceneTone {
  const SceneTone({required this.glow, required this.scenic});

  final Color glow;
  final bool scenic;
}

/// Phase wash, optional scene bitmap, then a dark scrim so type stays readable.
class SceneBackdrop extends StatelessWidget {
  const SceneBackdrop.fill({
    super.key,
    required this.phase,
    required this.child,
  }) : height = null;

  const SceneBackdrop.banner({
    super.key,
    required this.phase,
    required this.child,
    this.height = 200,
  });

  final String phase;
  final Widget child;
  final double? height;

  @override
  Widget build(BuildContext context) {
    final asset = ArtCatalog.sceneFor(phase);
    final tone = ArtCatalog.toneFor(phase);
    final framed = KeyedSubtree(
      key: Key("scene-$phase"),
      child: Stack(
        fit: StackFit.expand,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [tone.glow, ArtCatalog.deep],
              ),
            ),
          ),
          if (asset != null)
            Image(
              image: AssetImage(asset),
              fit: BoxFit.cover,
              alignment: Alignment.center,
              errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
            ),
          DecoratedBox(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  ArtCatalog.deep.withValues(
                    alpha: asset == null ? 0.28 : 0.66,
                  ),
                  ArtCatalog.deep.withValues(
                    alpha: asset == null ? 0.84 : 0.86,
                  ),
                  ArtCatalog.deep.withValues(alpha: 0.94),
                ],
                stops: const [0, 0.48, 1],
              ),
            ),
          ),
          height == null ? child : Align(alignment: Alignment.bottomLeft, child: child),
        ],
      ),
    );
    if (height == null) return SizedBox.expand(child: framed);
    return SizedBox(height: height, width: double.infinity, child: framed);
  }
}

/// 3D bust for a known RoleId. Unknown ids keep the faction circle.
class RolePortrait extends StatelessWidget {
  const RolePortrait({super.key, required this.role, this.seatId});

  final PrivateRole role;
  final String? seatId;

  @override
  Widget build(BuildContext context) {
    final asset = ArtCatalog.bustFor(role.id, seatId: seatId);
    final placeholder = _PlaceholderPortrait(role: role);
    if (asset == null) return placeholder;
    return ClipRRect(
      key: Key("role-bust:$asset"),
      borderRadius: BorderRadius.circular(16),
      child: SizedBox(
        width: 84,
        height: 108,
        child: Image(
          image: AssetImage(asset),
          fit: BoxFit.cover,
          alignment: ArtCatalog.bustAlignment(asset),
          errorBuilder: (context, error, stackTrace) => placeholder,
        ),
      ),
    );
  }
}

class _PlaceholderPortrait extends StatelessWidget {
  const _PlaceholderPortrait({required this.role});

  final PrivateRole role;

  @override
  Widget build(BuildContext context) {
    final color = ArtCatalog.factionColor(role.faction);
    return Semantics(
      label: role.name,
      child: Container(
        key: const Key("role-placeholder"),
        width: 72,
        height: 72,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: color.withValues(alpha: 0.18),
          border: Border.all(color: color, width: 2),
        ),
        child: Text(
          _initial(role.name),
          style: TextStyle(
            color: color,
            fontSize: 22,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }
}

String _initial(String name) {
  final runes = name.runes;
  if (runes.isEmpty) return "?";
  return String.fromCharCode(runes.first);
}
