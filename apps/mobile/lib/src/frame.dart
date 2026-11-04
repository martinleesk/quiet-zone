import "package:flutter/widgets.dart";

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
