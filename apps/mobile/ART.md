# 美術包 v1（結構，未收圖）

Flutter 客戶端預留咗原創美術位。文字流程唔依賴圖，而家用陣營色佔位同階段色罩。

上一版上傳係 2D 厚塗，**冇打入 app**。下一包要係風格化 **3D 渲染**，角色要有女有男，先至放入下面路徑。風格板只係方向參考，唔顯示喺遊戲入面。

## 調色

| 陣營 | 色 | 而家 |
| --- | --- | --- |
| 燈塔網 lighthouse | teal `#3ECFBF` | 佔位圓 |
| 消音組 silence | violet `#8B78E6` | 佔位圓 |
| 灰頻 grey | amber `#E7C27A` | 佔位圓 |

頁首同階段背景：燈亮係深 teal 漸層，熄燈係深紫漸層，上面再加暗罩，等字保持可讀。有圖之後同一層罩會加深。

## 預留路徑

| 用途 | 路徑 | 狀態 |
| --- | --- | --- |
| 孤證客 warrant 半身 | `assets/art/roles/warrant.jpg` | 未收，用琥珀圓 |
| 消音手 silencer 半身 | `assets/art/roles/silencer.jpg` | 未收，用紫圓 |
| 燈亮 day_talk，draft 共用 | `assets/art/scenes/day_talk.jpg` | 未收，用 teal 罩 |
| 熄燈 night | `assets/art/scenes/night.jpg` | 未收，用紫罩 |
| 風格板（唔入遊戲） | `assets/art/ref/style-board.jpg` | 只作參考，未收 |

`ArtCatalog.roleBusts` 只登記 `warrant` 同 `silencer`。其餘 RoleId（線報、掃頻、掩護、回波、通聯、閒職、假訊、影內應）繼續用陣營色圓，等之後先補圖。

## 邊度會見到

- 主頁、組席：燈亮色調頁首，標題同房間代碼貼喺暗罩底。
- 私人身分（包括開局抽身分）：有半身圖先顯示圓角卡；否則係陣營色圓加角色第一個字。
- `day_talk` 同 `draft`：燈亮背景加暗罩。投票、結算、終局保持實色。
- `night`：熄燈背景加暗罩。底下操作區維持實色，避免按鈕壓住畫面。

## 換上 3D 圖

1. 檔案放到上表路徑。要風格化 3D 角色渲染，男女都要有，唔好用 2D 厚塗。
2. 取消 `pubspec.yaml` 入面 `assets:` 嗰段註解。
3. 將 `ArtCatalog.installed` 改做 `true`（同 pubspec 同一變更）。

未安裝之前 `bustFor` / `sceneFor` 會回傳空，畫面繼續用佔位，唔會嘗試載入唔存在嘅檔。
