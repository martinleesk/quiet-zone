# quiet_zone（Flutter 客戶端）

路線 B 已鎖定：**Flutter**（**未選** React Native）。

本環境無 Flutter SDK，故此目錄為 placeholder。本機裝好 Flutter 後：

```bash
# https://docs.flutter.dev/get-started/install
cd apps/mobile
flutter create . --project-name quiet_zone --org com.quietzone
flutter pub get
flutter run
```

建議目錄（`flutter create` 後會補齊）：

```
lib/
  main.dart          # 入口
  app.dart           # MaterialApp / 路由（待加）
  features/          # 大廳、房間、局內 UI（待加）
test/
```

唔喺呢度落遊戲邏輯、唔加第三方遊戲資產。
