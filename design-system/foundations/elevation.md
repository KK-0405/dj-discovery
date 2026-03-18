# Elevation (Shadow)

> シャドウによる奥行き表現。4段階に制限し、用途を明確にする。

---

## トークン表

| トークン | Tailwind | 値 | 用途 |
|---------|----------|-----|------|
| elevation-none | `shadow-none` | none | フラット要素、disabled 状態 |
| elevation-sm | `shadow-sm` | 0 1px 2px rgba(0,0,0,0.05) | カード（デフォルト）、トースト |
| elevation-md | `shadow-md` | 0 4px 6px rgba(0,0,0,0.1) | カード hover、ドロップダウン |
| elevation-overlay | `shadow-xl` | 0 20px 25px rgba(0,0,0,0.1) | モーダルダイアログのみ |

---

## 用途別ルール

| 用途 | トークン | 説明 |
|------|---------|------|
| カード（静止時） | elevation-sm | `shadow-sm` で軽い浮遊感を出す |
| カード（hover） | elevation-md | `shadow-md` で操作可能であることを示す |
| トースト通知 | elevation-sm | 背景から浮いて見える程度 |
| ドロップダウンメニュー | elevation-md | コンテンツの上に浮く |
| モーダルダイアログ | elevation-overlay | 画面全体の上に浮くオーバーレイ |
| ボタン | elevation-none | ボタンにシャドウは付けない |
| フラット要素 / disabled | elevation-none | 奥行きなし |

---

## ルール

- シャドウは **4段階のみ** 使用する。中間値を作らない
- `hover` でシャドウを変化させる場合は `transition-shadow` を併用する
- ダークモード対応時はシャドウの不透明度を調整する（将来対応）

---

## 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| `shadow-lg` | 段階が多すぎる。md と xl の間は不要 | `shadow-md` または `shadow-xl` |
| `shadow-2xl` | 過剰な奥行き | `shadow-xl`（overlay用） |
| `shadow-inner` | インセットシャドウは本DSでは使用しない | `shadow-none` |
| ボタンへの `shadow-*` | ボタンの状態は色で表現する | `shadow-none` |
