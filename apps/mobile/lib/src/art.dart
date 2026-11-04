import "package:flutter/material.dart";

import "protocol.dart";

/// Original art slots for the Flutter client.
///
/// The 2D painterly pack is not shipped. Drop stylized 3D renders (women and
/// men) on the paths below, register them in pubspec.yaml, then set [installed].
class ArtCatalog {
  const ArtCatalog._();

  /// Flip together with the pubspec `assets:` block. See ART.md.
  static final bool installed = false;

  static const warrant = "assets/art/roles/warrant.jpg";
  static const silencer = "assets/art/roles/silencer.jpg";
  static const dayTalk = "assets/art/scenes/day_talk.jpg";
  static const night = "assets/art/scenes/night.jpg";
  static const styleBoard = "assets/art/ref/style-board.jpg";

  /// Every reserved file. The style board is reference only and is not drawn.
  static const reservedFiles = <String>[
    warrant,
    silencer,
    dayTalk,
    night,
    styleBoard,
  ];

  /// RoleId → bust. Only 孤證客 and 消音手 have a slot in this pack.
  static const roleBusts = <String, String>{
    "warrant": warrant,
    "silencer": silencer,
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

  static String? bustFor(String roleId) {
    if (!installed) return null;
    return roleBusts[roleId];
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
              alignment: Alignment.topCenter,
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

/// Bust for warrant / silencer once the pack is installed; faction circle otherwise.
class RolePortrait extends StatelessWidget {
  const RolePortrait({super.key, required this.role});

  final PrivateRole role;

  @override
  Widget build(BuildContext context) {
    final asset = ArtCatalog.bustFor(role.id);
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
          alignment: Alignment.topCenter,
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
