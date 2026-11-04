# 消音區試玩

一個人就可以打標準 Mode。你坐一席，其餘十席由 AI 補上（徽章一直顯示）。燈亮、草稿、投票、熄燈、封口同終局都用 repo 入面同一個 `RoomHub`，唔使另外開伺服器，亦唔使裝 Flutter。

畫面係橫向：3D 半身、燈亮／熄燈場景、圖鑑撳開先睇技能。AI 用模板短句，投票跟你嘅選擇。

## 手機直接開

合併之後：

<https://raw.githack.com/martinleesk/quiet-zone/main/docs/trial/index.html>

Pages 設成 GitHub Actions 之後，同一套 Flutter 試玩會喺：

<https://martinleesk.github.io/quiet-zone/>

請轉橫向。開試玩房 → 準備好 → 開始封鎖。每個階段撳「準備好」就可以提早進入下一段。

## 本機開（唔使 Flutter）

喺 repo 根目錄：

```bash
python3 -m http.server 8090
```

然後開 <http://127.0.0.1:8090/docs/trial/>。圖係 `docs/ui-demo/art`，所以唔好只喺 `docs/trial` 開一個靜態伺服器。

`?fast=1` 會縮短結算計時，方便自己走一輪。`?role=warrant` 會打開圖鑑詳情。

## 本機 Flutter 網頁

同一局，用現有嘅組席同桌面 widget，引擎係 `apps/mobile/web/engine.js`：

```bash
cd apps/server
npm install
npm run build:trial
cd ../mobile
flutter pub get
flutter run -d chrome -t lib/trial_main.dart
```

想連真正嘅 Node 伺服器，用 `flutter run`（`lib/main.dart`）同 `npm run dev`。
