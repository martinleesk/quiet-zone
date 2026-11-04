import "package:flutter/material.dart";

import "codex_page.dart";
import "game_controller.dart";

class HomePage extends StatefulWidget {
  const HomePage({super.key, required this.controller});

  final GameController controller;

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final _url = TextEditingController(text: "ws://127.0.0.1:8787/ws");
  final _name = TextEditingController(text: "夜歸人");
  final _code = TextEditingController();

  @override
  void dispose() {
    _url.dispose();
    _name.dispose();
    _code.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text("消音區", style: Theme.of(context).textTheme.displaySmall?.copyWith(color: const Color(0xFFE7C27A))),
            const SizedBox(height: 4),
            Text("封鎖夜 · 標準 Mode", style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            const Text("私人房 11 席。空位由 AI 補上，徽章會一直顯示。你只會收到自己嘅身分。"),
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: () => openRoleCodex(context),
              child: const Text("角色圖鑑"),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _url,
              decoration: const InputDecoration(labelText: "伺服器"),
              autocorrect: false,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: "暱稱"),
            ),
            const SizedBox(height: 12),
            if (controller.error != null) Text(controller.error!, style: const TextStyle(color: Color(0xFFE07A7A))),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: controller.busy ? null : () => controller.createRoom(_url.text, _name.text),
              child: const Text("開私人房"),
            ),
            const SizedBox(height: 28),
            TextField(
              controller: _code,
              decoration: const InputDecoration(labelText: "房間代碼"),
              textCapitalization: TextCapitalization.characters,
            ),
            const SizedBox(height: 12),
            OutlinedButton(
              onPressed: controller.busy ? null : () => controller.joinRoom(_url.text, _code.text, _name.text),
              child: const Text("用代碼加入"),
            ),
            const SizedBox(height: 16),
            const Text("Android 模擬器可試 ws://10.0.2.2:8787/ws。本機桌面用 127.0.0.1。"),
          ],
        ),
      ),
    );
  }
}
