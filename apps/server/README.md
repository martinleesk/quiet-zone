# @quiet-zone/server

標準 Mode 權威後端。Node.js + Express + WebSocket。勝負同技能只喺 `src/domain/engine.ts` 結算。

```bash
npm install
npm test
npm run demo    # 一局 GM 腳本
npm run dev     # http://127.0.0.1:8787/health  同  ws://127.0.0.1:8787/ws
```

`QZ_FAST=1` 縮短階段計時。鎖定規則喺 `src/config/rules.ts`。標準技能（釘選、通聯、假訊、匿名票）同斷線 AI 接管都喺 `GameEngine`。
