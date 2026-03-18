# Icon

> デュアルソース・アイコンシステム。Charcoal Icons（プライマリ）+ Lucide Icons（セカンダリ補完）。
> `assets/icons/` 配下のSVGファイルを参照すること。

---

## ソース

### プライマリ: Charcoal Icons 2.0

- **Charcoal Icons 2.0**（pixiv design system）— 207個
- Format: fill ベース（`fill="currentColor"`）、24px 統一
- Figma: [Charcoal Icons 2.0](https://www.figma.com/community/file/1415608153880597802)
- npm: `@charcoal-ui/icons` v5（Web Component が必要な場合）

### セカンダリ: Lucide Icons（補完用）

- **Lucide Icons** — Charcoal に存在しないアイコンのみ使用（15個）
- Format: stroke ベース（`stroke="currentColor"`, `fill="none"`）、24px viewBox
- 公式: [lucide.dev](https://lucide.dev)
- 配置: `assets/icons/lucide/{name}.svg`（kebab-case）

---

## デュアルソースポリシー

1. **Charcoal 優先**: 同じ概念のアイコンが Charcoal にある場合は必ず Charcoal を使う
2. **Lucide 補完**: Charcoal に明確に存在しないアイコンのみ Lucide を使用
3. **混在可**: 1つのページ内で両ソースのアイコンを混在させてよい
4. **属性の違い**: Charcoal は `fill="currentColor"`、Lucide は `stroke="currentColor" fill="none"`

### ソース選択フロー

```
アイコンが必要
  ├── Charcoal に存在する？
  │   ├── YES → Charcoal を使う（fill ベース）
  │   └── NO → Lucide 補完リストに存在する？
  │       ├── YES → Lucide を使う（stroke ベース）
  │       └── NO → Lucide 公式で探し、assets/icons/lucide/ に追加
  └── ※ Charcoal の名前が直感的でない場合は下記マッピング表を参照
```

---

## Charcoal 名前マッピング

Charcoal は pixiv 社が公開しているアイコンセットで、独自の命名規則を持つ。以下は一般的な概念との対応表。

| 一般的な概念 | Charcoal アイコン名 | 備考 |
|------------|-------------------|------|
| ChevronDown | `PullDown` | 太めのV字 |
| ChevronUp | `PullUp` | 太めのV字 |
| ChevronLeft | `Prev` / `Back` | Back は viewBox 16x16（注意） |
| ChevronRight | `Next` | |
| Email/Mail | `Message` | 封筒アイコン |
| Lock | `LockLock` | 南京錠 |
| Unlock | `LockUnlock` | |
| Payment | `Invoice` | 通貨記号付き書類 |
| Calendar | `Calendar` / `Events` | |
| Notification/Bell | `Notification` | |
| Eye/Show | `Show` / `ShowOutline` | |
| Eye-off/Hide | `Hide` | |
| Edit(pencil) | `Pencil` | 24x24。`Edit` は viewBox 32x32 なので注意 |

---

## 実装ルール

- 生の `<svg>` タグをHTMLに直接インライン展開するか、Iconコンポーネント経由で呼び出す
- サイズはTailwindクラスで制御する（後述のサイズ表を参照）
- 色は `text-body` 等のテキストカラーを継承させる
  - Charcoal: `fill="currentColor"` を前提
  - Lucide: `stroke="currentColor"` を前提（`fill="none"`）
- アイコン単体では情報を伝達しない。必ずテキストラベルまたは `aria-label` を併用する

---

## 命名規則

- **Charcoal**: PascalCase（例: `ArrowDown`, `OpenInNew`）→ `assets/icons/{Name}.svg`
- **Lucide**: kebab-case（例: `bar-chart-2`, `trending-up`）→ `assets/icons/lucide/{name}.svg`

```
assets/icons/
├── Add.svg
├── ArrowDown.svg
├── Close.svg
├── Home.svg
├── ...
└── ZoomIn.svg          (Charcoal 207個・24px統一)
└── lucide/
    ├── activity.svg
    ├── bar-chart-2.svg
    ├── clock.svg
    ├── ...
    └── trending-up.svg  (Lucide 補完 15個・24px統一)
```

---

## 表示サイズとTailwindクラス

SVGは全て24px基準。表示サイズはTailwindクラスで制御する。

| 表示サイズ | Tailwindクラス | 主な用途 |
|-----------|---------------|---------|
| 16px | `w-4 h-4` | テーブル行アクション、バッジ内、テキスト横の補助 |
| 20px | `w-5 h-5` | ボタン、ナビゲーション、フォーム（★ 標準） |
| 24px | `w-6 h-6` | 大きめのアクション、ページヘッダー |
| 32px | `w-8 h-8` | タブバー、空状態イラスト |

- アイコンとテキストの間隔: `gap-1`（4px）〜 `gap-2`（8px）
- アイコンボタンの最小タップ領域: `w-10 h-10`（40px）

---

## カラールール

| 用途 | Tailwindクラス |
|------|---------------|
| 標準（ナビ、補助） | `text-body` |
| 無効/プレースホルダー | `text-slate-400` |
| アクティブ/選択中 | `text-primary-500` |
| 成功 | `text-emerald-600` |
| 警告 | `text-amber-600` |
| エラー/危険 | `text-red-500` |
| 白背景上のアクセント | `text-primary-500` |
| 色付き背景上 | `text-white` |

> コントラスト比 3:1 以上を担保すること（WCAG AA — UI要素基準）。

---

## 代表的なアイコン一覧（クイックリファレンス）

AIはUI生成時、用途に応じて以下のアイコン名を使用すること。

### ナビゲーション

| アイコン名 | 用途 |
|-----------|------|
| `Home` | ホーム画面 |
| `Menu` | ハンバーガーメニュー |
| `Close` | 閉じる、モーダル閉じ |
| `Back` | 戻る |
| `Next` | 次へ、進む |
| `Search` | 検索 |
| `ArrowDown` / `ArrowUp` | ソート矢印 |
| `Down` | ドロップダウン展開 |
| `Expand` / `Collapse` | アコーディオン開閉 |
| `OpenInNew` | 外部リンク |

### ユーザー

| アイコン名 | 用途 |
|-----------|------|
| `User` | ユーザーアバター/プロフィール |
| `Groups` | チーム、複数ユーザー |
| `AddPeople` | メンバー招待 |
| `Login` / `Logout` | 認証 |

### アクション

| アイコン名 | 用途 |
|-----------|------|
| `Add` | 新規作成、追加 |
| `Delete` / `Trash` | 削除 |
| `Copy` | コピー |
| `Duplicate` | 複製 |
| `Pencil` | 編集 |
| `Check` | 完了、選択済み |
| `Link` | リンク |
| `Filter` | フィルター |
| `DownloadAlt` | ダウンロード |
| `Upload` | アップロード |
| `MultiSelect` | 複数選択 |

### ステータス / フィードバック

| アイコン名 | 用途 |
|-----------|------|
| `Error` | エラー（丸型） |
| `ErrorOctagon` | 重大エラー |
| `Info` | 情報、ヒント |
| `Alart` | 警告（※ Charcoal の綴り） |
| `Notification` / `NotificationOff` | 通知 |

### オブジェクト

| アイコン名 | 用途 |
|-----------|------|
| `File` | ファイル |
| `Image` / `Images` | 画像 |
| `Calendar` | 日付 |
| `Book` | ドキュメント |
| `Message` | メッセージ、チャット |
| `Cart` | カート、購入 |
| `Gift` | ギフト、キャンペーン |
| `Archive` | アーカイブ |
| `Camera` | 写真撮影 |

### 表示制御

| アイコン名 | 用途 |
|-----------|------|
| `Hide` | 非表示、パスワード隠す |
| `List` | リスト表示 |
| `Collection` | コレクション表示 |
| `LockLock` / `LockUnlock` | ロック状態 |

> **AIへの指示**: 上記リストにないアイコンが必要な場合は、まず Charcoal の命名慣例（PascalCase）で `assets/icons/{Name}.svg` を探すこと。Charcoal に存在しない SaaS 系アイコンは下記 Lucide 補完リストを参照。

---

## Lucide 補完アイコン一覧（15個）

Charcoal に存在しない SaaS / ダッシュボード向けアイコン。`assets/icons/lucide/` に配置。

| カテゴリ | ファイル名 | 用途 |
|---------|----------|------|
| Analytics | `bar-chart-2.svg` | 売上・KPI グラフ |
| Analytics | `trending-up.svg` | 成長指標 |
| Analytics | `trending-down.svg` | 減少指標 |
| Analytics | `activity.svg` | アクティビティ/パルス |
| Time | `clock.svg` | 時刻・スケジュール |
| Security | `shield.svg` | セキュリティ設定 |
| Security | `key.svg` | 認証・API キー |
| Infrastructure | `cloud.svg` | クラウド・SaaS 機能 |
| Infrastructure | `database.svg` | データベース管理 |
| Infrastructure | `server.svg` | サーバー状態 |
| Files | `folder.svg` | ファイル管理 |
| Payment | `credit-card.svg` | 決済情報 |
| Device | `monitor.svg` | デスクトップ表示 |
| International | `globe.svg` | 多言語・リージョン |
| Communication | `phone.svg` | 電話/サポート |

### Lucide SVG 属性ルール

```html
<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- Lucide のパスデータ -->
</svg>
```

> Charcoal（fill ベース）と Lucide（stroke ベース）で色の指定方法が異なるが、どちらも `text-body` 等の Tailwind カラークラスで `currentColor` を通じて色を制御できる。

---

## HTMLサンプル

### ボタン内アイコン

```html
<button class="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700">
  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <!-- assets/icons/Add.svg の中身 -->
  </svg>
  追加する
</button>
```

### アイコンのみボタン

```html
<button aria-label="閉じる" class="inline-flex items-center justify-center w-10 h-10 text-body rounded-lg hover:bg-gray-100 focus:ring-2 focus:ring-primary-500/50">
  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <!-- assets/icons/Close.svg の中身 -->
  </svg>
</button>
```

### ナビゲーション内アイコン

```html
<a href="#" class="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-body hover:bg-gray-50 rounded-lg">
  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <!-- assets/icons/Home.svg の中身 -->
  </svg>
  ダッシュボード
</a>
```

---

### Lucide アイコンの使用例

```html
<!-- Lucide: stroke ベース -->
<button class="inline-flex items-center gap-2 h-10 px-4 text-sm font-medium text-body bg-white border border-slate-200 rounded-lg hover:bg-gray-50">
  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- assets/icons/lucide/bar-chart-2.svg の中身 -->
    <line x1="18" x2="18" y1="20" y2="10"/>
    <line x1="12" x2="12" y1="20" y2="4"/>
    <line x1="6" x2="6" y1="20" y2="14"/>
  </svg>
  レポートを表示
</button>
```

---

## 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| `aria-label` なしのアイコンボタン | 操作内容が不明 | `aria-label="閉じる"` 等を付与 |
| アイコンのみでの情報伝達 | 色覚・認知多様性への非対応 | テキストラベルを併用 |
| `w-3 h-3` 以下のアイコン | 視認性・タップ領域不足 | 最小 `w-4 h-4`（16px） |
| 色ハードコード（`fill="#333"`） | テーマ変更に追従しない | `fill="currentColor"` |
| Charcoal に存在するアイコンの Lucide 使用 | ソース統一 | Charcoal を優先使用 |
