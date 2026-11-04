# quiet-zone（消音區）

文字為主、I人友善的隱藏殺手推理手遊（標準 Mode MVP 先）。

## 技術棧（已鎖定 · Martin 2026-11-04）

- **客戶端：** Flutter（iOS／Android）— 路線 B；**未選** React Native
- **後端：** TypeScript 權威伺服器（**Node.js + Express**；WebSocket 通道待接）
- 身分／技能／勝負只信任 server；AI 補位永遠披露徽章

## 目錄

```
apps/
  mobile/   Flutter 客戶端（本機未裝 Flutter 時為 placeholder）
  server/   TypeScript 權威後端（Express hello + WebSocket stub）
```

## 點跑（草稿）

### 後端

```bash
cd apps/server
npm install
npm run dev
# → http://127.0.0.1:8787/health
```

### 客戶端

本 box 無 Flutter SDK。本機安裝後：

```bash
# https://docs.flutter.dev/get-started/install
cd apps/mobile
flutter create . --project-name quiet_zone --org com.quietzone
flutter run
```

未 `flutter create` 前，`apps/mobile` 只係目錄結構＋說明。

## 相關 Pages

- [技術方案與 MVP](https://cursor.com/canvas/store-cfbe74cb-3f1b-4f2f-b2de-5dd12c81d557/b852cfd4-53e1-4af5-b68b-a17787b982cb)
- [全原創設計草稿](https://cursor.com/canvas/store-cfbe74cb-3f1b-4f2f-b2de-5dd12c81d557/b652c0b1-f8db-49f1-b4fb-d5d301ca636c)

## 狀態

本地 monorepo 骨架；尚未 push 到 GitHub。建議遠端：`https://github.com/martinleesk/quiet-zone`（需 Martin 開空 repo 並授權 push）。唔含完整遊戲邏輯、唔含第三方遊戲資產。
