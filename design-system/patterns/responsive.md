# Responsive Guidelines

> レスポンシブデザインの指針。ブレークポイント、レイアウト変化、タッチ対応のルール。
> Tailwind CSS 4

---

## 1. 原則

- **モバイルファースト**: Tailwind のデフォルト = モバイル。`md:` `lg:` で上書きする
- **コンテンツ駆動**: ブレークポイントは機械的に適用せず、コンテンツが崩れる地点で切り替える
- **タッチ対応**: モバイルではタップ領域 44×44px を厳守する
- **段階的開示**: 小画面では情報を絞り、大画面で詳細を追加する

---

## 2. ブレークポイント

Tailwind 標準ブレークポイントをそのまま使用する。カスタムブレークポイントは追加しない。

| トークン | 幅 | 代表デバイス | 主な用途 |
|---------|-----|------------|---------|
| (default) | 0px〜 | スマートフォン縦 | 1カラム、スタック |
| `sm` | 640px〜 | スマートフォン横 / 小タブレット | 軽微な調整 |
| `md` | 768px〜 | タブレット縦 | 2カラム化、サイドバー表示 |
| `lg` | 1024px〜 | タブレット横 / ノートPC | 3カラム化、フルナビ |
| `xl` | 1280px〜 | デスクトップ | ワイドレイアウト |
| `2xl` | 1536px〜 | 大型ディスプレイ | コンテンツ幅上限 |

---

## 3. レイアウト変化

### サイドバー + メインコンテンツ

| 画面 | サイドバー | メイン |
|------|----------|--------|
| Mobile (default) | 非表示（Drawer化） | `w-full px-4 py-6` |
| Tablet (`md:`) | コンパクト（`w-16` アイコンのみ） | `flex-1 px-6 py-8` |
| Desktop (`lg:`) | 固定表示 `w-64` | `flex-1 px-6 py-8` |

> レスポンシブ HTML サンプル・Drawer仕様・JavaScript: `components/sidebar.md`「§6-3, §6-4」参照

### ページヘッダー

```html
<!-- モバイル: スタック / デスクトップ: 横並び -->
<div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
  <div>
    <h1 class="text-2xl md:text-3xl font-bold text-slate-900">ページタイトル</h1>
    <p class="mt-1 text-sm md:text-[1rem] text-body">ページの説明</p>
  </div>
  <div class="flex items-center gap-3">
    <button class="h-8 px-3 text-sm md:h-10 md:px-4 md:text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
      新規作成
    </button>
  </div>
</div>
```

### カードグリッド

```html
<!-- 1列 → 2列 → 3列 -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
  <!-- カード -->
</div>
```

| 画面 | カラム数 | gap |
|------|---------|-----|
| Mobile | `grid-cols-1` | `gap-4` |
| Tablet (`md:`) | `grid-cols-2` | `gap-6` |
| Desktop (`lg:`) | `grid-cols-3` | `gap-6` |

### メトリクスカード（ダッシュボード）

```html
<!-- 1列 → 2列 → 4列 -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
  <!-- メトリクスカード -->
</div>
```

---

## 4. コンテンツ幅とパディング

| 画面 | コンテンツ内側余白 | 備考 |
|------|------------------|------|
| Mobile | `px-4 py-6` | 最小余白。コンテンツ幅を最大限確保 |
| Tablet (`md:`) | `px-6 py-8` | 標準余白 |
| Desktop (`lg:`) | `px-8 py-12` | ゆとりのある余白 |

```html
<div class="max-w-7xl mx-auto px-4 py-6 md:px-6 md:py-8 lg:px-8 lg:py-12">
```

---

## 5. テーブルのレスポンシブ

テーブルはモバイルで崩れやすい。以下のパターンを使い分ける。

### 横スクロール（推奨）

データの一覧性を維持する。最もシンプルで汎用的。

```html
<div class="overflow-x-auto -mx-4 md:mx-0">
  <div class="inline-block min-w-full align-middle">
    <table class="min-w-full">
      <!-- テーブル内容 -->
    </table>
  </div>
</div>
```

### カード化（代替）

行数が少ない場合、モバイルではカードリストに変換する。

```html
<!-- デスクトップ: テーブル / モバイル: カードリスト -->
<div class="hidden md:block">
  <table><!-- テーブル --></table>
</div>
<div class="md:hidden space-y-3">
  <div class="bg-white rounded-xl border border-slate-200 p-4">
    <p class="text-sm font-medium text-slate-900">タスク名</p>
    <div class="mt-2 flex items-center justify-between text-sm text-body">
      <span>ステータス: 進行中</span>
      <span>期限: 2026-03-01</span>
    </div>
  </div>
</div>
```

---

## 6. タイポグラフィのスケーリング

大きな見出しはモバイルで縮小する。本文サイズは変更しない。

| 要素 | Mobile | Desktop (`md:`) | 備考 |
|------|--------|-----------------|------|
| ページタイトル | `text-2xl` (26px) | `text-3xl` (32px) | 2段階下げ |
| セクション見出し | `text-xl` (22px) | `text-2xl` (26px) | 1段階下げ |
| カード見出し | `text-lg` (20px) | `text-xl` (22px) | 1段階下げ |
| 本文 | `text-base` (18px) | 変更なし | 可読性維持 |
| ラベル / ナビ | `text-sm` (15px) | 変更なし | |

```html
<h1 class="text-2xl md:text-3xl font-bold text-slate-900">ページタイトル</h1>
<h2 class="text-xl md:text-2xl font-semibold text-slate-900">セクション見出し</h2>
```

---

## 7. フォームのレスポンシブ

### 横並びフィールド

```html
<!-- モバイル: スタック / デスクトップ: 横並び -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1">姓</label>
    <input type="text" class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 caret-primary-500">
  </div>
  <div>
    <label class="block text-sm font-medium text-slate-700 mb-1">名</label>
    <input type="text" class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 caret-primary-500">
  </div>
</div>
```

### フォーム幅

| 画面 | フォーム幅 | 備考 |
|------|----------|------|
| Mobile | `w-full` | 画面幅いっぱい |
| Tablet (`md:`) | `max-w-lg` 〜 `max-w-2xl` | 中央寄せ |
| Desktop | `max-w-2xl` | 読みやすさ上限 |

---

## 8. モーダルのレスポンシブ

| 画面 | スタイル | 備考 |
|------|---------|------|
| Mobile | フルスクリーン（`inset-0`）| 余白なしで表示領域を確保 |
| Tablet (`md:`) | 中央配置（`max-w-lg mx-auto`）| 標準モーダル |

```html
<!-- モバイル: フルスクリーン / デスクトップ: 中央配置 -->
<div class="fixed inset-0 z-50 flex items-end md:items-center justify-center">
  <div class="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-xl md:shadow-md">
    <div class="p-4 md:p-6">
      <!-- モーダル内容 -->
    </div>
  </div>
</div>
```

---

## 9. タッチ対応

### タップ領域

- 全インタラクティブ要素: 最小 44×44px（パディングで確保）
- モバイルではボタンのパディングを増やすことを検討

### ホバー状態

- モバイルにはホバーがない。`hover:` はあくまで補助的なフィードバック
- 重要な情報をホバーだけで伝えない（ツールチップに依存しない）
- `@media (hover: hover)` で hover 対応デバイスのみにスタイル適用する選択肢もある

---

## 10. 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| 固定幅レイアウト（`w-[1200px]`等） | 小画面で見切れる | `max-w-*` + `w-full` |
| ホバーのみで情報開示 | タッチデバイスでアクセス不可 | クリック/タップで開閉 |
| `hidden` で重要コンテンツを非表示 | SEO + アクセシビリティ問題 | 段階的開示（折りたたみ） |
| テーブルを無理にカード化 | データの比較性が失われる | `overflow-x-auto` で横スクロール |
| モバイルで px-1 / px-2 の極小余白 | タッチミスの原因 | `px-4` を最小値とする |
| カスタムブレークポイント追加 | Tailwind 標準から逸脱 | 標準の sm/md/lg/xl/2xl で運用 |

---

## 11. コンテナクエリについて

**判断: 不採用（DEFER）**

CSS Container Queries（`@container`）の採用を検討したが、現時点では不採用とする。

### 理由

- ビューポートベースの `md:` / `lg:` 切替で、現在の全レイアウトパターンに対応済み
- Tailwind 標準ブレークポイントへの統一方式を維持し、学習コストとルールの分散を防ぐ
- 同一コンポーネントが異なる幅のコンテナで異なるレイアウトを必要とするケースが現時点で存在しない

### 再検討の条件

以下のいずれかが発生した場合に再検討する:

- サイドバー内にカードグリッドを埋め込む等、同一コンポーネントが親の幅に応じてレイアウトを切り替える必要が生じた場合
- Tailwind のコンテナクエリサポート（`@container` ユーティリティ）が安定し、エコシステムの標準的な手法となった場合
