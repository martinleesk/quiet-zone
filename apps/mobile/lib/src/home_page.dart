import "package:flutter/material.dart";

import "art.dart";
import "codex_page.dart";
import "frame.dart";
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
    return LayoutBuilder(
      builder: (context, constraints) {
        final controller = widget.controller;
        if (preferLandscape(constraints)) return _landscape(controller);
        return _portrait(controller);
      },
    );
  }

  Widget _portrait(GameController controller) {
    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            SceneBackdrop.banner(
              phase: "home",
              child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 12, 24, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      "消音區",
                      style: Theme.of(context).textTheme.displaySmall?.copyWith(color: const Color(0xFFE7C27A)),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      "封鎖夜 · 標準 Mode",
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              ),
            ),
            Expanded(child: _form(controller, includeIntro: true)),
          ],
        ),
      ),
    );
  }

  Widget _landscape(GameController controller) {
    return Scaffold(
      body: SafeArea(
        child: Row(
          key: const Key("landscape-home"),
          children: [
            Expanded(
              flex: 6,
              child: SceneBackdrop.stage(
                phase: "home",
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(28, 16, 24, 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Spacer(),
                      Text(
                        "消音區",
                        style: Theme.of(context).textTheme.displaySmall?.copyWith(color: const Color(0xFFE7C27A)),
                      ),
                      const SizedBox(height: 4),
                      Text("封鎖夜 · 標準 Mode", style: Theme.of(context).textTheme.titleMedium),
                      const SizedBox(height: 10),
                      const Text("私人房 11 席。空位由 AI 補上，徽章會一直顯示。你只會收到自己嘅身分。"),
                      const SizedBox(height: 8),
                      Text(
                        "Android 模擬器可試 ws://10.0.2.2:8787/ws。本機桌面用 127.0.0.1。",
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            Expanded(flex: 5, child: _form(controller, includeIntro: false, dense: true)),
          ],
        ),
      ),
    );
  }

  Widget _form(GameController controller, {required bool includeIntro, bool dense = false}) {
    final gap = dense ? 8.0 : 12.0;
    return ListView(
      padding: EdgeInsets.all(dense ? 16 : 24),
      children: [
        if (includeIntro) ...[
          const Text("私人房 11 席。空位由 AI 補上，徽章會一直顯示。你只會收到自己嘅身分。"),
          const SizedBox(height: 16),
        ],
        OutlinedButton(
          onPressed: () => openRoleCodex(context),
          child: const Text("角色圖鑑"),
        ),
        SizedBox(height: dense ? 12 : 24),
        TextField(
          controller: _url,
          decoration: const InputDecoration(labelText: "伺服器"),
          autocorrect: false,
        ),
        SizedBox(height: gap),
        TextField(
          controller: _name,
          decoration: const InputDecoration(labelText: "暱稱"),
        ),
        SizedBox(height: gap),
        if (controller.error != null)
          Text(
            controller.error!,
            style: const TextStyle(color: Color(0xFFE07A7A)),
          ),
        SizedBox(height: gap),
        FilledButton(
          onPressed: controller.busy ? null : () => controller.createRoom(_url.text, _name.text),
          child: const Text("開私人房"),
        ),
        SizedBox(height: dense ? 12 : 28),
        TextField(
          controller: _code,
          decoration: const InputDecoration(labelText: "房間代碼"),
          textCapitalization: TextCapitalization.characters,
        ),
        SizedBox(height: gap),
        OutlinedButton(
          onPressed: controller.busy
              ? null
              : () => controller.joinRoom(
                    _url.text,
                    _code.text,
                    _name.text,
                  ),
          child: const Text("用代碼加入"),
        ),
        if (includeIntro) ...[
          const SizedBox(height: 16),
          const Text("Android 模擬器可試 ws://10.0.2.2:8787/ws。本機桌面用 127.0.0.1。"),
        ],
      ],
    );
  }
}
