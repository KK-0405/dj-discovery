# melta UI - AI向け指示

> このDSは Claude Code でのヴァイブコーディングに最適化されている。UI生成時に必ずこのファイルから読み始めること。

> **⚠️ このプロジェクトは Tailwind CSS v4 + Next.js を使用。** CDN `tailwind.config = {}` は使用しない。カスタムカラーは `src/app/globals.css` の `@theme` ブロックで定義する。

**読み込みモード**:

| モード | 読むファイル | 用途 |
|--------|------------|------|
| クイック | CLAUDE.md のみ | 単体UIの生成（ボタン、カード等） |
| 標準 | + design-system/foundations/theme.md + 関連 component md | ページ単位の生成 |
| MCP | MCP ツール（`get_token` / `get_component`）| AI ツール統合 |
| フル | 全ファイル（下記の読み順に従う） | 新規プロジェクト構築・DS変更 |

> クイックリファレンスだけで基本的なUIは生成可能。コンポーネント仕様が必要な場合のみ該当 md を追加で読み込む。

**機械可読データ**: `tokens/tokens.json`（~106トークン）+ `metadata/components.json`（28コンポーネント）

**フル読み順**: CLAUDE.md → design-system/foundations/design_philosophy.md → design-system/foundations/theme.md → design-system/foundations/ → design-system/components/ → design-system/patterns/ → design-system/foundations/prohibited.md（プロジェクト側に `design-system/foundations/theme.md` がある場合はそちらを優先）

---

## 設計原則（5つ）

1. **Layered** — Background → Surface → Text/Object の3層でUIを構成する
2. **Contrast** — テキストは背景に対してWCAG 2.1準拠（4.5:1以上）
3. **Semantic** — 色は用途で指定する（`bg-surface-primary` ≠ 生の `bg-white`）
4. **Minimal** — 1つのViewに使う色は3色まで（背景・アクセント・テキスト）
5. **Grid** — スペーシングは4の倍数を基本、8の倍数を推奨する

---

## Next.js + Tailwind v4 セットアップ

> このプロジェクトは Tailwind v4 を使用。`tailwind.config.js` ではなく CSS ファイルでテーマを定義する。

### `src/app/globals.css`（存在しない場合は作成）
```css
@import "tailwindcss";

@theme {
  --color-primary-50: #f0f5ff;
  --color-primary-100: #dde8ff;
  --color-primary-200: #c0d4ff;
  --color-primary-300: #95b6ff;
  --color-primary-400: #6492ff;
  --color-primary-500: #2b70ef;
  --color-primary-600: #2250df;
  --color-primary-700: #1a40b5;
  --color-primary-800: #13318d;
  --color-primary-900: #0e266a;
  --color-primary-950: #07194e;

  --color-wf-bg: #FFFFFF;
  --color-wf-surface: #F5F5F5;
  --color-wf-border: #E0E0E0;
  --color-wf-text: #333333;
  --color-wf-text-sub: #888888;
  --color-wf-accent: #666666;

  --font-family-sans: Inter, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
}

.text-body { color: #3d4b5f; }
```

### `src/app/layout.tsx` への追記
```tsx
import "./globals.css";
```

### 静的HTML用CDN（Next.js外で使う場合のみ）
```html
<script src="https://cdn.tailwindcss.com?v=4"></script>
```
> v4 CDN では `tailwind.config = {}` は使えない。カスタムカラーが必要な場合は `<style type="text/tailwindcss">` 内に `@theme { ... }` を記述する。

---

## クイックリファレンス

### レイアウト
```
ページ全体         : bg-gray-50 min-h-screen
ページコンテンツ   : max-w-7xl mx-auto px-8 py-12
サイドバー＋メイン : flex h-screen（ボーダー分離、gap不要）
セクション間隔     : mt-10 〜 mt-14
仕切り線           : border-t border-slate-200
```

### テキスト
```
見出し             : text-3xl font-bold text-slate-900（32px）
本文               : text-base text-body leading-relaxed（18px, line-height 2.0）
フォーム制御ラベル : 包含 <div> に leading-normal（body の lh 2.0 リセット）
空状態メッセージ   : text-base text-slate-500 text-center py-16
フォントスタック     : Inter, Hiragino Sans, Hiragino Kaku Gothic ProN, Noto Sans JP, sans-serif
```

### コンポーネント
```
カード             : bg-white rounded-xl border border-slate-200 p-6 shadow-sm
カードグリッド     : grid grid-cols-2 md:grid-cols-3 gap-6
CTAボタン（M）     : inline-flex items-center justify-center gap-2 h-10 px-4 text-[1rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
CTAボタン（L）     : inline-flex items-center justify-center gap-2 h-12 px-6 text-[1rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
CTAボタン（S）     : inline-flex items-center justify-center gap-1.5 h-8 px-3 text-[0.875rem] font-medium bg-primary-500 text-white rounded-lg hover:bg-primary-700 cursor-pointer
サブボタン         : inline-flex items-center justify-center gap-2 h-10 px-4 text-[1rem] font-medium bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-gray-50 cursor-pointer
Icon+Textボタン    : inline-flex items-center justify-center gap-2 h-10 pl-3 pr-4 text-[1rem] font-medium（アイコン側を狭く）
アイコンボタン（M）: w-10 h-10 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-5 h-5）
アイコンボタン（S）: w-8 h-8 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-4 h-4）
アイコンボタン（L）: w-12 h-12 inline-flex items-center justify-center cursor-pointer + aria-label（icon w-5 h-5）
入力欄             : w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 caret-primary-500
セレクト           : appearance-none pl-3 pr-10 + relative wrapper + SVG chevron（absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4）← ネイティブ矢印は使用禁止
横並びフォーム     : flex flex-wrap items-end gap-4（外枠）+ 各 div.leading-normal > label + 要素 h-11 leading-normal（py-2 外す）+ ボタン h-11 inline-flex items-center（→ design-system/patterns/form.md 必読）
バッジ（デフォルト）: bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium
タグ（削除可能）   : inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium + ×ボタン
フィルターチップ   : inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm border cursor-pointer + aria-selected
Alert（Info）      : flex items-start gap-3 p-4 bg-primary-50 border border-primary-200 text-primary-800 rounded-lg（border-l-4 禁止）
Alert（Success）   : flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg（border-l-4 禁止）
Alert（Warning）   : flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg（border-l-4 禁止）
Alert（Error）     : flex items-start gap-3 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg（border-l-4 禁止）
テーブル外枠         : bg-white rounded-xl border border-slate-200 overflow-hidden
テーブルヘッダ行     : border-b border-slate-200 bg-gray-50
テーブルヘッダセル   : <th scope="col"> text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider
テーブルデータ行     : hover:bg-gray-50 transition-colors
テーブルデータセル   : py-3 px-4 text-sm（主値 text-slate-900 / 副値 text-body）
Accordion トリガー : w-full flex items-center justify-between py-4 text-left text-base font-medium text-slate-900 cursor-pointer
ディバイダー（水平）: border-t border-slate-200（<hr> or role="separator"）
ディバイダー（テキスト付き）: flex items-center gap-4 + 両側 flex-1 border-t border-slate-200 + 中央 text-sm text-slate-500
ディバイダー（垂直）: border-l border-slate-200 self-stretch + role="separator" aria-orientation="vertical"
Stepper Indicator  : w-8 h-8 rounded-full inline-flex items-center justify-center text-sm（Completed: bg-primary-500 text-white / Active: border-2 border-primary-500 / Upcoming: bg-slate-100 text-slate-500）
Stepper Connector  : flex-1 h-0.5 mx-3（完了区間: bg-primary-500 / 未着手: bg-slate-200）
Date Picker Trigger: w-full flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base + Calendar アイコン
Date Picker Popup  : absolute mt-1 w-[320px] bg-white rounded-xl border border-slate-200 shadow-md z-20 p-4
Date Picker Day    : w-10 h-10 inline-flex items-center justify-center text-sm rounded-lg（Selected: bg-primary-500 text-white / Today: font-semibold text-primary-500）
```

### アイコン
```
Charcoal           : w-5 h-5 fill="currentColor" text-body ← assets/icons/{Name}.svg（プライマリ・207個）
Lucide             : w-5 h-5 stroke="currentColor" fill="none" ← assets/icons/lucide/{name}.svg（補完・15個）
小サイズ           : w-4 h-4 ← 同SVGをTailwindで縮小（Charcoal優先、Lucide補完）
アイコンボタン     : w-8/w-10/w-12 h-8/h-10/h-12（S/M/L）inline-flex items-center justify-center cursor-pointer + aria-label 必須
```

### ナビゲーション
```
サイドバー（標準）  : w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col h-screen
サイドバー（コンパクト）: w-16 items-center（アイコンのみ + aria-label + title 必須）
サイドバー構成       : 3ゾーン必須（Header + nav + Footer mt-auto border-t）
サイドバー nav       : <nav aria-label="メインナビゲーション"> 必須
ナビアイコン         : flex-shrink-0 を付与
ナビ（Active）     : flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-primary-500 bg-primary-50 rounded-lg + aria-current="page"
ナビ（Default）    : flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-body hover:bg-gray-50 rounded-lg transition-colors
タブ underline（Active）  : text-sm font-semibold text-primary-500 border-b-2 border-primary-500 cursor-default
タブ underline（Inactive）: text-sm font-medium text-slate-500 border-b-2 border-transparent hover:text-slate-700 cursor-pointer
タブ bar（Active）  : flex-1 relative flex items-center justify-center py-4 text-sm font-semibold text-slate-900 + インジケーターバー（w-56px h-4px bg-primary-500 rounded absolute bottom-0）
タブ bar（Inactive）: flex-1 relative flex items-center justify-center py-4 text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100
パンくずリスト     : text-sm + text-slate-500 hover:text-slate-700 / 現在ページ text-slate-900 font-medium
ページネーション   : w-10 h-10 rounded-lg cursor-pointer + Active bg-primary-500 text-white / Inactive bg-white border
```

### データ・フィードバック
```
アバター（M）      : w-10 h-10 rounded-full（イニシャル: bg-primary-50 text-primary-500 font-medium）+ role="img" aria-label="名前"
プログレスバー     : bg-slate-200 rounded-full h-2（フィル: bg-primary-500 rounded-full h-2）+ role="progressbar" aria-valuenow aria-valuemin="0" aria-valuemax="100"
スケルトン         : bg-slate-200 rounded-md skeleton-pulse + aria-busy="true" role="status"
空状態             : text-center py-16 + アイコン(w-16 h-16 bg-slate-100 rounded-full) + 見出し + 説明 + CTAボタン
ツールチップ       : bg-slate-600 text-white text-sm rounded-lg shadow-sm px-3 py-2（width: max-content, max-width: 20rem）
```

### ワイヤーフレーム（低忠実度プロトタイプ用）
```
背景               : bg-wf-bg (#FFFFFF)
サーフェス         : bg-wf-surface (#F5F5F5)
ボーダー           : border-wf-border (#E0E0E0)
テキスト           : text-wf-text (#333333)
サブテキスト       : text-wf-text-sub (#888888)
アクセント         : text-wf-accent / bg-wf-accent (#666666)
CSS変数            : --wf-bg / --wf-surface / --wf-border / --wf-text / --wf-text-sub / --wf-accent
```

---

## 禁止パターン要約

| 禁止 | 代替 |
|------|------|
| `text-black` | `text-slate-900` |
| `bg-gray-300`以上の背景 | `bg-gray-50` 〜 `bg-gray-200` |
| `rounded-none` on cards | `rounded-xl` |
| `shadow-lg` / `shadow-2xl` | `shadow-sm` 〜 `shadow-md`（オーバーレイ: `shadow-xl`） |
| `border-gray-100` | `border-slate-200` |
| `text-gray-400` for body | `text-body` (#3d4b5f) |
| `py-0.5` for buttons | `h-8` 以上（S: `h-8` / M: `h-10` / L: `h-12`） |
| カード/Alert上部・左端のカラーバー（`border-t-4` / `border-l-4` / 色付き `div`） | `border border-*-200 rounded-lg` で全周ボーダー |
| カード直下の `<fieldset>` + `<legend>` | `<div>` + `<h2>` でセクション見出し |
| 日付セレクトの均等幅（`grid-cols-3`） | `flex` + 年 `w-28`、月・日 `w-20` |
| 色だけで情報伝達 | アイコン/テキストを併用 |
| `tracking-tight` | 見出し1%、本文2%を基本 |
| プレースホルダーのみのラベル | 必ず `<label>` を使用 |
| 派手なグラデーション / ネオンカラー / 過剰なアニメーション | セマンティックカラー、150〜300ms フィードバックに限定 |
| フォーム制御ラベル包含divの `leading-normal` 省略 | 包含 `<div>` に `leading-normal` 付与 |
| `bg-indigo-*` / `bg-blue-*` 等のハードコード | `primary-*` を使用（design-system/foundations/theme.md で定義） |
| `<th>` の `scope` 省略 | `<th scope="col">` 必須 |
| `<nav>` の `aria-label` 省略 | `aria-label="メインナビゲーション"` 必須 |
| `tailwind.config = {}` （v3 CDN構文） | v4: CSS の `@theme { }` ブロックで定義 |

> 全禁止パターン（76項目）+ AI生成パターンの排除: `design-system/foundations/prohibited.md` 参照

---

## Foundation / コンポーネント一覧

**Foundations (10)**: color, spacing, typography, elevation, radius, motion, z-index, icons, accessibility, emotional-feedback — 各 `design-system/foundations/{name}.md`

**Components (28)**: button, card, checkbox, modal, sidebar, textfield, select, dropdown, radio, toggle, toast, list, badge, tag, table, tooltip, tabs, breadcrumb, pagination, avatar, progress, alert, accordion, skeleton, datepicker, divider, stepper, copy-button — 各 `design-system/components/{name}.md`

**Skills (1)**: design-review — `skills/design-review/SKILL.md`（DSチェック・違反検出・修正提案）

**Patterns (5)**: layout, form, navigation, interaction-states, responsive — 各 `design-system/patterns/{name}.md`

---

## タスクベース読み込みガイド

| タスク | 読み込むファイル（順序） |
|--------|------------------------|
| 単体コンポーネント生成 | CLAUDE.md のみ |
| ページ生成 | + design-system/foundations/theme.md → design-system/patterns/layout.md → 関連 component md |
| ダークモード対応 | + design-system/foundations/theme.md（CSS変数）→ design-system/foundations/color.md（Dark列） |
| フォーム画面 | + design-system/patterns/form.md → textfield / select / checkbox / button |
| データ一覧 | + table.md → pagination.md → badge.md |
| ダッシュボード | + design-system/foundations/theme.md → layout.md → card / table / progress / badge |
| 設定画面 | + tabs.md → toggle / select / radio |
| モーダル / 確認 | + modal.md → button.md |
| Loading / 空状態 | + skeleton.md → interaction-states.md |
| 通知フィードバック | + toast.md → alert.md → interaction-states.md |
| サイドバー付きページ | + sidebar.md → layout.md |
| ナビゲーション | + navigation.md → sidebar.md → tabs / breadcrumb |
| レスポンシブ対応 | + design-system/patterns/responsive.md → layout.md |
| アクセシビリティ確認 | + design-system/foundations/accessibility.md |
| アイコン選択 | + design-system/foundations/icons.md |
| ウィザード / ステップ画面 | + stepper.md → button.md |
| 日付入力フォーム | + datepicker.md → textfield.md → form.md |
| セクション分割 | + divider.md → layout.md |
| テーマカスタマイズ | design-system/foundations/theme.md → design-system/foundations/color.md（CLAUDE.md 不要） |
| DS変更 / 新コンポーネント | フル読み込み |

---

## テーマ・カラー変数・ダークモード

> テーマ設定・CSS変数定義・ダークモード切替: `design-system/foundations/theme.md` を参照。

<!-- ダークモードを有効にするには OFF → ON に変更してください -->
| 設定 | 値 |
|------|-----|
| **ダークモード** | `OFF` |

- `OFF`: ライトモードのみで設計・生成する（デフォルト）
- `ON`: ダークモード対応を含めて設計・生成する（`design-system/foundations/theme.md` + `design-system/foundations/color.md` Dark列 を参照）

---

## Design Context

### Users
- **対象**: DJセットリスト発見・管理ツール
- **エンドユーザー**: DJや音楽ファン
- **利用コンテキスト**: 曲の検索・類似曲発見・セットリスト管理・BPM/キー確認

### Brand Personality
- **3語で表すと**: 静謐・精緻・温もり（Quiet · Precise · Warm）
- **声のトーン**: 「声を張らずに伝わる」— 主張しすぎない、でも確かに伝わる
- **感情目標**: 心地よい集中 → 洗練された効率 → 穏やかな親しみ（この順で優先）

### Aesthetic Direction
- **ビジュアルトーン**: ダークベースのミニマル。現在は inline styles で実装済みだが、新規UIはTailwindクラスで構築する
- **参考プロダクト**: Linear / Notion（高速でミニマル、プロフェッショナルなSaaS）

---

## デプロイ

| 項目 | 値 |
|------|-----|
| ホスティング | Vercel |
| 本番URL | https://dj-discovery-ihhs.vercel.app/ |
| フレームワーク | Next.js (App Router) |

> ローカルはDeezer APIのプロキシ問題があるため、必ずVercelでテストすること。
