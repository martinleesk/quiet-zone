import "package:flutter/widgets.dart";

/// Bottom-aligned stage copy. Scrolls when the phone is short instead of clipping.
class StageCopy extends StatelessWidget {
  const StageCopy({
    super.key,
    required this.children,
    this.padding = const EdgeInsets.fromLTRB(24, 12, 20, 12),
  });

  final List<Widget> children;
  final EdgeInsets padding;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final minHeight = constraints.maxHeight.isFinite ? (constraints.maxHeight - padding.vertical).clamp(0.0, double.infinity) : 0.0;
        return SingleChildScrollView(
          padding: padding,
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: minHeight),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.end,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: children,
            ),
          ),
        );
      },
    );
  }
}

/// Landscape-first layouts once the window is wider than it is tall.
///
/// Phone landscape is about 640–900 px wide and under 450 px tall. The old
/// stacked pages stay for a portrait window so a forced rotation still reads.
/// Uses the layout constraints, which match the real window and widget tests.
bool preferLandscape(BoxConstraints constraints) {
  final width = constraints.maxWidth;
  final height = constraints.maxHeight;
  if (!width.isFinite || !height.isFinite) return false;
  return width >= 640 && width > height;
}
