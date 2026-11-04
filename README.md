# quiet-zone（消音區・封鎖夜）

文字為主、I人友善的隱藏身份推理手遊。呢個 repo 係**標準 Mode 第一個可玩豎切**：私人房、權威狀態機、抽身分、投票隔離、熄燈行動、勝負檢定。進階 Mode 係 Phase 2。

全原創造詞。唔用其他社交推理遊戲嘅商標、角色名或者技能名。

## 技術棧（已鎖定 · Martin 2026-11-04）

- **客戶端：** Flutter
- **後端：** TypeScript 權威伺服器（Node.js + Express + WebSocket）
- 身分、技能合法性、投票、勝負只信任 server
- AI 補位永遠顯示徽章，可以抽到消音手

規則常數喺 [`apps/server/src/config/rules.ts`](apps/server/src/config/rules.ts)（A–G，2026-11-04）：

| | 規則 |
| --- | --- |
| A | 平票 → 流局，唔隔離 |
| B | 逾時：草稿可空白、投票當棄權、熄燈當跳過 |
| C | AI 可抽消音手；模板詞庫＋跟多數；徽章永久 |
| D | 封口：只可投票，唔可以發言；結果卡係一行公開記錄 |
| E | 11 人：成功失聯 3 次 → 消音組勝（灰頻未獨贏先） |
| F | 公開隔離唔披露陣營；只有回波師私下收到殘片 |
| G | 掩護成功計作窗口第 1 回合；下一回合唔成功；再下一回合可以 |

勝負次序：灰頻獨贏 → 消音組 → 燈塔網。灰頻喺孤證客仍在場、而且正確標中最少 2 名消音時獨贏，即使消音手仲在場、甚至失聯已夠 3 次。

11 人標準席：燈塔網 7（線報、掃頻、掩護、回波、通聯、閒職 ×2）、消音組 3（消音手、假訊、影內應）、灰頻 1（孤證客）。

## 點跑

要 Node.js 20+。

### 測試同示範腳本（唔使 Flutter）

```bash
cd apps/server
npm install
npm test
npm run demo
```

`npm run demo` 用伺服器腳本走完一局：流局、掩護冷卻、公開隔離唔講陣營、回波私人殘片、封口、掃頻、灰頻先贏。開頭嘅座位表係 **GM 視角**；真客戶端只收到自己嘅身分。

### 無頭模擬（AI 對 AI）

同一套權威引擎，11 席全部係 AI，唔開 WebSocket。每席有一個種子人格（尖銳指控、謹慎旁觀、大聲虛張、安靜跟票、夜獵優先、守線穩票）。有真人落票時仍然跟唯一多數（規則 C）。

```bash
cd apps/server
npm install
npm run sim -- --games 10
# npm run sim -- --games 100 --seed 20261104 --out ../../docs/trial/logs/latest.jsonl
```

進度行打喺終端。每局一行 JSONL，結尾再寫一份 `*-summary.json`。預設輸出係 `docs/trial/logs/latest.jsonl`（gitignore）。早段 10 局樣本係 `docs/trial/logs/sample.jsonl`。接住 50 局（seed 20261114 起）摘要係 `docs/trial/logs/campaign-50-summary.json`。人格標籤只喺 `debugAi()` 同模擬紀錄，唔進玩家畫面。

純 AI 局入面，消音組原本靠第一夜就失聯，快過白天收齊票。而家 謹慎旁觀、安靜跟票、守線穩票、大聲虛張 會放過夜 1；尖銳指控要自己個指控係場上唯一熱點先會第一夜動手；夜獵優先仍然第一夜打釘選席。守線同夜獵嘅掩護會守釘選席。規則 A–G 冇改。

### 權威伺服器

```bash
cd apps/server
npm install
npm run dev
# http://127.0.0.1:8787/health
# ws://127.0.0.1:8787/ws
```

`QZ_FAST=1 npm run dev` 會把每段計時縮到最多 1.2 秒。預設計時喺 `rules.ts` 嘅 `phaseMs`（燈亮 40 秒、草稿／投票／熄燈 25 秒、結算同檢定 5 秒）。真人撳「準備好」可以提早進入下一段；AI 會自己行動。

### Flutter 客戶端

本機裝好 Flutter 之後：

```bash
cd apps/mobile
flutter pub get
flutter run
```

App 預設連 `ws://127.0.0.1:8787/ws`。Android 模擬器改做 `ws://10.0.2.2:8787/ws`。介面以橫向為主（手機同平板會鎖橫向）。流程：開私人房 → 開始（AI 補滿 11 席）→ 睇自己身分 → 燈亮短句／草稿 → 投票 → 熄燈行動 → 終局。

桌面跑唔到 Flutter 時，用上面嘅 `npm test` 同 `npm run demo` 就睇到完整規則循環。

### 試玩（手機瀏覽器）

唔使裝 Flutter，亦唔使開伺服器。橫向打開，一個人打標準 Mode：AI 補滿 11 席，行燈亮、草稿、投票、熄燈同終局。

<https://raw.githack.com/martinleesk/quiet-zone/main/docs/trial/index.html>

點開同本機指令見 [`docs/trial/README.md`](docs/trial/README.md)。Flutter 網頁入口係 `flutter run -d chrome -t lib/trial_main.dart`。Pages 設成 GitHub Actions 之後，試玩會發佈到 `https://martinleesk.github.io/quiet-zone/`。

靜態畫面切換（未連局）仍然喺 [`docs/ui-demo`](docs/ui-demo/README.md)。

## 邊度做咗、邊度係 stub

做咗：

- 私人房：開房、代碼加入、空位 AI 補滿、徽章唔會消失
- Boot 隨機派標準池；公開只廣播組成；每個連線只收到自己嘅身分（消音組先額外見到隊友）
- 狀態機：Boot → 燈亮 → 草稿 → 投票 → 結算 → 熄燈 → 檢定 → 下一輪或終局
- 投票流局、逾時預設、掩護冷卻、失聯、掃頻（含影內應第一次訊號霧）、封口、回波私人殘片
- 線報員釘選、通聯官核對上回合用過技能未、假訊員每局兩次假訊、影內應匿名票
- 真人斷線後，AI 接管同一席：身分同私人狀態保留，徽章保持。原人用返自己嘅席證可以收回，徽章熄返
- 封口：被封嘅人見到私人封口卡，燈亮同草稿只剩「等投票」；投票階段先可以落票
- 孤證客可以標記同取消標記；正確標記達 2 仍然優先獨贏
- 勝負次序同上面 A–G
- 大廳逐席準備；房主要等真人齊準備先開，空位由 AI 補，Boot 之後鎖房
- 消音組熄燈夜訊只可以用模板，唔會入公開頻道
- AI 每席一個種子人格（發言、投票、熄燈唔再同一套動作）。有真人唯一多數時仍然跟票
- 燈亮、投票、熄燈同灰頻標記有一句可收起嘅提示
- 每個階段顯示剩餘秒數。終局先公開每席身分同陣營
- 回波師有按時間排列嘅殘片清單
- Flutter：開房／加入、準備、階段提示、短句同草稿、釘選／通聯／假訊、標記、封口、投票（可匿名）、熄燈夜訊、斷線收回、終局

未做（刻意留低）：

- AI 用模板詞庫。有真人票可跟時跟唯一多數（規則 C）。無人票可跟時，每席按種子人格決定發言、投票同熄燈。唔係 LLM
- 大廳斷線會騰出席位，唔可以收回
- 冇配對大廳、語音、進階 Mode、收費、商店包裝

## 目錄

```
apps/server   Express + WebSocket，權威狀態機同測試
apps/mobile   Flutter 客戶端
```

協議類型喺 `apps/server/src/domain/types.ts`，客戶端鏡像喺 `apps/mobile/lib/src/protocol.dart`。個 monorepo 未有 `packages/` 共享層，所以呢個豎切未硬加一個。

## 相關 Pages

- [技術方案與 MVP](https://cursor.com/canvas/store-cfbe74cb-3f1b-4f2f-b2de-5dd12c81d557/b852cfd4-53e1-4af5-b68b-a17787b982cb)
- [全原創設計草稿](https://cursor.com/canvas/store-cfbe74cb-3f1b-4f2f-b2de-5dd12c81d557/b652c0b1-f8db-49f1-b4fb-d5d301ca636c)
