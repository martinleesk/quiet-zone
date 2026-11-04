# 美術包 v1

風格化 **3D** 電影角色渲染，唔係 2D 插畫。男女都有。文字仍然可以獨立睇完一局；圖只係半身同階段背景，上面有暗罩。

風格板 `assets/art/ref/style-board.jpg` 只係方向參考，**唔顯示、亦唔打入遊戲包**。

## 調色

| 陣營 | 色 |
| --- | --- |
| 燈塔網 lighthouse | teal `#3ECFBF` |
| 消音組 silence | violet `#8B78E6` |
| 灰頻 grey | amber `#E7C27A` |

未登記嘅 RoleId 先會退回陣營色圓。而家標準 11 席全部有半身圖。

## 性別鎖定

| RoleId | 角色 | 檔 | 性別 |
| --- | --- | --- | --- |
| warrant | 孤證客 | `assets/art/roles/warrant.jpg` | 女 |
| silencer | 消音手 | `assets/art/roles/silencer.jpg` | 男，紫色闊身帽衫 |
| tip | 線報員 | `assets/art/roles/tip.jpg` | 女 |
| cover | 掩護員 | `assets/art/roles/cover.jpg` | 男 |
| decoy | 假訊員 | `assets/art/roles/decoy.jpg` | 女 |
| sweep | 掃頻員 | `assets/art/roles/sweep.jpg` | 男 |
| echo | 回波師 | `assets/art/roles/echo.jpg` | 女 |
| link | 通聯官 | `assets/art/roles/link.jpg` | 男，黑風衣、金耳麥、筆記 |
| plant | 影內應 | `assets/art/roles/plant.jpg` | 女 |
| civilian | 燈塔閒職 | `civilian_f.jpg` 預設，`civilian_m.jpg` 交替 | 女預設 |

`ArtCatalog.roleBusts` 把每個 RoleId 指去預設半身。閒職預設係女。有席號時，席號字元加總係奇數先用男（例如 `s2`），冇席號或者加總係偶數就用女（例如 `s1`）。兩名閒職可以因此唔同圖，而且唔會喺重整時跳來跳去。

## 場景

| 階段 | 檔 |
| --- | --- |
| 主頁、組席、`day_talk`、`draft` | `assets/art/scenes/day_talk.jpg` |
| `night` | `assets/art/scenes/night.jpg` |

投票、結算、終局保持實色。身份卡同操作區維持實底，暗罩確保字可讀。

## 邊度會見到

- 主頁、組席：燈亮場景做頁首，標題同房間代碼貼喺暗罩底。
- 私人身分（包括開局抽身分）：圓角半身。標準角色都有圖。
- `day_talk` 同 `draft`：燈亮背景。
- `night`：熄燈背景。底下操作區維持實色。
