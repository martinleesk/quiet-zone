import "package:flutter/material.dart";

/// Permanent disclosure. Callers show this whenever a seat is AI.
class AiBadge extends StatelessWidget {
  const AiBadge({super.key});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: const Color(0xFF7EB6FF),
        borderRadius: BorderRadius.circular(999),
      ),
      child: const Text(
        "AI",
        style: TextStyle(
          color: Color(0xFF0E141B),
          fontSize: 11,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.4,
        ),
      ),
    );
  }
}
