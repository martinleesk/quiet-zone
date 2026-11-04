# 消音區畫面示範

橫向畫面，用同一套 3D 半身同燈亮／熄燈場景。可以喺手機瀏覽器打開，唔使裝 Flutter，亦唔使開伺服器。撳上面嘅 **主頁／組席／圖鑑／燈亮／熄燈** 切畫面。圖鑑先見半身同名，撳一個角色先出技能同點贏。

## 手機直接開

合併之後：

<https://raw.githack.com/martinleesk/quiet-zone/main/docs/ui-demo/index.html>

呢條 PR 未合併之前，用而家條分支：

<https://raw.githack.com/martinleesk/quiet-zone/cursor/codex-detail-safe-text-6120/docs/ui-demo/index.html>

請轉橫向。呢度係畫面示範，按鈕唔會連真正嘅房間。想自己打一局，開 [`docs/trial`](../trial/README.md)。

## 本機開

```bash
cd docs/ui-demo
python3 -m http.server 8090
```

然後開 <http://127.0.0.1:8090/>。直接雙擊 `index.html` 都得，圖係相對路徑。

想直接入某個畫面，可以加 query：`?screen=day`、`?screen=night`、`?screen=codex`、`?role=warrant`。

## Flutter 網頁（真實 widget）

同一套畫面亦有 Flutter 入口，用 `ArtCatalog` 同現有頁面，唔使 WebSocket：

```bash
cd apps/mobile
flutter pub get
flutter run -d chrome -t lib/demo_main.dart
```

`main` 每次 push 會行 `.github/workflows/ui-demo.yml`。Repo 嘅 Pages 設成 **GitHub Actions** 之後，示範會喺：

<https://martinleesk.github.io/quiet-zone/>

未開 Pages 之前，用上面嘅 githack 連結就睇到圖。
