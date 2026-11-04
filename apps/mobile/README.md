# quiet_zone（Flutter 客戶端）

消音區・封鎖夜標準 Mode 豎切介面：開私人房、加入、睇階段、短句／草稿、投票、熄燈、終局。AI 席位永遠有徽章。

```bash
flutter pub get
flutter run
```

先開 `apps/server`（`npm run dev`）。預設 WebSocket 係 `ws://127.0.0.1:8787/ws`；Android 模擬器用 `ws://10.0.2.2:8787/ws`。

遊戲規則唔喺呢度結算。客戶端只顯示伺服器落嚟嘅公開狀態同自己嘅私人包。

美術同性別鎖定見 [ART.md](ART.md)。角色半身同燈亮／熄燈場景係風格化 3D 渲染。
