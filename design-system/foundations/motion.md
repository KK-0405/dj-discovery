# Motion (Transition / Animation)

> トランジションとアニメーションの統一ルール。目的を持った最小限の動きで、UIの応答性を伝える。

---

## Duration トークン表

| トークン | 値 | Tailwind | 用途 |
|---------|-----|----------|------|
| duration-fast | 150ms | `duration-150` | ボタン hover / フォーカス色変化 |
| duration-normal | 200ms | `duration-200` | フェードイン・アウト、一般的な状態変化 |
| duration-slow | 300ms | `duration-300` | トーストスライド、複合アニメーション |

---

## Easing トークン表

| トークン | 値 | Tailwind | 用途 |
|---------|-----|----------|------|
| easing-default | cubic-bezier(0.4, 0, 0.2, 1) | `ease-in-out` | 汎用（状態間の遷移） |
| easing-in | cubic-bezier(0.4, 0, 1, 1) | `ease-in` | 退出アニメーション（画面外へ出る） |
| easing-out | cubic-bezier(0, 0, 0.2, 1) | `ease-out` | 出現アニメーション（画面内へ入る） |

---

## Transition Property

| 用途 | Tailwind | 説明 |
|------|----------|------|
| 色変化 | `transition-colors` | ボタン hover、リンク hover |
| 透明度 | `transition-opacity` | フェードイン・アウト |
| シャドウ | `transition-shadow` | カード hover の elevation 変化 |
| 変形 | `transition-transform` | トースト スライドイン |
| 複合 | `transition-all` | 複数プロパティが同時に変化する場合のみ |

---

## 用途別ルール

| コンポーネント | Tailwind クラス | 説明 |
|--------------|----------------|------|
| ボタン hover | `transition-colors` | duration-fast（150ms）で色変化 |
| リンク hover | `transition-colors` | duration-fast |
| カード hover | `transition-shadow` | duration-normal（200ms）で shadow-sm → shadow-md |
| トースト表示 | `transition-transform duration-300 ease-out` | 右からスライドイン |
| トースト消去 | `transition-opacity duration-300 ease-in` | フェードアウト |
| モーダル表示 | `transition-opacity duration-200 ease-out` | オーバーレイのフェードイン |
| ドロップダウン | `transition-opacity duration-150 ease-out` | 出現時のフェード |
| フォーカスリング | `transition-colors` | duration-fast |
| フォーム入力（TextField/Select） | `transition-colors` | ボーダー・フォーカスリングの色変化 |
| Toggle Track / Thumb | `transition-colors` / `transition-transform` | ON/OFF の色変化 + スライド |
| ナビ（Tabs/Breadcrumb/Pagination） | `transition-colors` | hover 時の色変化 |
| データ表示（Table Row/List/Badge） | `transition-colors` | hover 時の色変化 |
| Progress（確定） | `transition-all duration-500` | フィルバー幅変化（※300ms上限の例外） |
| Tooltip | `transition-opacity duration-200` | フェード表示・非表示 |
| トランジション不要 | — | Avatar、Checkbox/Radio（基本）は静的またはネイティブ描画 |

---

## Emotional Feedback / Loading

- Emotional Feedback アニメーション: `foundations/emotional-feedback.md` 参照
- Loading アニメーション（Skeleton / Spinner / Dot loader）: `patterns/interaction-states.md` 参照

---

## ルール

- すべてのインタラクティブ要素に `transition-colors` を付与する（ボタン、リンク、入力欄）
- `transition-all` は最終手段。変化するプロパティが明確なら個別指定する（Progress フィルバーは例外）
- `transition-colors` のみで `duration-*` を省略した場合、Tailwind デフォルト（150ms）が適用される。duration-fast と同等
- Duration は 300ms を超えない。ユーザーの操作を遅く感じさせない
- `prefers-reduced-motion` を尊重する:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 禁止パターン

> 全禁止パターン: `foundations/prohibited.md`「モーション」参照

| 禁止 | 理由 | 代替 |
|------|------|------|
| `duration-500` 以上 | 操作が鈍く感じる（Progress フィルバーは例外） | `duration-300` 以下 |
| `prefers-reduced-motion` 無視 | アクセシビリティ違反 | メディアクエリで対応 |
