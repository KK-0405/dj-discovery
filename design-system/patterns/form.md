# Form Patterns

> フォーム構成のルールとパターン。

---

## フォーム構成の原則

1. **上から下への自然な流れ**: フォーム要素は縦に積む。横並びは関連性が高い場合のみ（姓・名等）
2. **グループ化**: 関連するフィールドを `<fieldset>` + `<legend>` でグループ化する
3. **ラベルは入力欄の上**: ラベルは入力欄の直上に配置する（横配置は禁止）
4. **アクションは右寄せ**: 送信/キャンセルボタンはフォーム下部の右寄せ
5. **エラーは入力欄の直下**: エラーメッセージはフィールドの直下に表示

---

## 基本フォーム構造

```html
<form class="space-y-5">
  <!-- フィールド -->
  <div>
    <label for="name" class="block text-sm font-medium text-slate-700 mb-1">
      名前 <span class="text-red-500">*</span>
    </label>
    <input type="text" id="name" name="name" required
      class="w-full px-3 py-2 text-base text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
      placeholder="山田 太郎">
  </div>

  <div>
    <label for="email" class="block text-sm font-medium text-slate-700 mb-1">
      メールアドレス <span class="text-red-500">*</span>
    </label>
    <input type="email" id="email" name="email" required
      class="w-full px-3 py-2 text-base text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors"
      placeholder="example@mail.com">
  </div>

  <div>
    <label for="message" class="block text-sm font-medium text-slate-700 mb-1">
      メッセージ
    </label>
    <textarea id="message" name="message" rows="4"
      class="w-full px-3 py-2 text-base text-slate-900 bg-white border border-slate-300 rounded-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors resize-y"
      placeholder="お問い合わせ内容を入力してください"></textarea>
  </div>

  <!-- アクション -->
  <div class="flex justify-end gap-3 pt-4">
    <button type="button"
      class="h-10 px-4 text-[1rem] font-medium text-body rounded-lg hover:bg-gray-100 transition-colors">
      キャンセル
    </button>
    <button type="submit"
      class="h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
      送信する
    </button>
  </div>
</form>
```

---

## フォーム内グループ

```html
<form class="space-y-8">
  <!-- 基本情報グループ -->
  <fieldset>
    <legend class="text-lg font-semibold text-slate-900 mb-4">基本情報</legend>
    <div class="space-y-5">
      <div>
        <label for="first_name" class="block text-sm font-medium text-slate-700 mb-1">姓</label>
        <input type="text" id="first_name" name="first_name"
          class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors">
      </div>
      <div>
        <label for="last_name" class="block text-sm font-medium text-slate-700 mb-1">名</label>
        <input type="text" id="last_name" name="last_name"
          class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors">
      </div>
    </div>
  </fieldset>

  <!-- 通知設定グループ -->
  <fieldset>
    <legend class="text-lg font-semibold text-slate-900 mb-4">通知設定</legend>
    <div class="space-y-3 leading-normal">
      <label class="inline-flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="notifications[]" value="email"
          class="mt-0.5 w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
        <span class="text-sm text-slate-700">メール通知</span>
      </label>
      <label class="inline-flex items-start gap-3 cursor-pointer">
        <input type="checkbox" name="notifications[]" value="push"
          class="mt-0.5 w-4 h-4 text-primary-500 border-slate-300 rounded focus:ring-2 focus:ring-primary-500/50">
        <span class="text-sm text-slate-700">プッシュ通知</span>
      </label>
    </div>
  </fieldset>

  <!-- アクション -->
  <div class="flex justify-end gap-3 pt-4 border-t border-slate-200">
    <button type="button"
      class="h-10 px-4 text-[1rem] font-medium text-body rounded-lg hover:bg-gray-100 transition-colors">
      キャンセル
    </button>
    <button type="submit"
      class="h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
      保存する
    </button>
  </div>
</form>
```

---

## 横並びフィールド

関連性が高いフィールドのみ横並びにする（姓・名、都道府県・市区町村等）。

```html
<div class="grid grid-cols-2 gap-4">
  <div>
    <label for="last" class="block text-sm font-medium text-slate-700 mb-1">姓</label>
    <input type="text" id="last" name="last"
      class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 transition-colors">
  </div>
  <div>
    <label for="first" class="block text-sm font-medium text-slate-700 mb-1">名</label>
    <input type="text" id="first" name="first"
      class="w-full px-3 py-2 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 transition-colors">
  </div>
</div>
```

---

## インラインフォーム（検索バー等）

入力欄・セレクト・ボタンを横並びにするパターン。本DSの `text-base` は `line-height: 2.0` のため、`py-2` と併用すると要素高が 52px になり `h-11`(44px) を超える。**横並び時は `py-2` を外し、`h-11 leading-normal` で高さを固定する。**

```html
<div class="flex flex-wrap items-end gap-4">
  <div class="flex-1 min-w-[180px]">
    <div class="leading-normal">
      <label for="area" class="block text-sm font-medium text-slate-900 mb-1">エリア</label>
      <input id="area" type="text" placeholder="東京、京都..."
        class="w-full h-11 px-3 text-base leading-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 caret-primary-500 transition-colors">
    </div>
  </div>
  <div class="min-w-[120px]">
    <div class="leading-normal">
      <label for="guests" class="block text-sm font-medium text-slate-900 mb-1">人数</label>
      <div class="relative">
        <select id="guests"
          class="w-full appearance-none h-11 pl-3 pr-10 text-base leading-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-colors bg-white">
          <option>2名</option>
        </select>
        <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
        </svg>
      </div>
    </div>
  </div>
  <button class="px-6 h-11 inline-flex items-center justify-center gap-2 text-base leading-normal font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
    検索する
  </button>
</div>
```

### ルール
- 全要素に `h-11 text-base leading-normal` を指定（`py-2` は使わない）
- `leading-normal` で `line-height` を 1.5 に戻し、`h-11`(44px) 内に収める
- ボタンは `inline-flex items-center justify-center gap-2` で垂直中央揃え（アイコン付きにも対応）
- `items-end` で底辺を揃える（ラベル有無でズレ防止）
- ラベル包含 `<div>` に `leading-normal` を付与
- `<select>` は必ず `appearance-none` + `pr-10` + カスタムSVGシェブロン（`absolute right-3 top-1/2 -translate-y-1/2`）で構成する。ネイティブ矢印はブラウザ間で位置・余白が不安定なため省略不可（→ `select.md` §6 参照）
- **Large ボタンはインラインフォームで使用禁止**（高さ 56px で `h-11` と合わない。Medium のみ使用すること）

> **なぜ `py-2` を外すのか**: `text-base`(18px) × `line-height: 2.0` = 36px + `py-2`(16px) = 52px となり `h-11`(44px) を超えてしまう。`leading-normal`(1.5) にすると 18px × 1.5 = 27px となり、`h-11` 内に自然に収まる。

### 高さモードの使い分け

| 配置 | クラス | 実際の高さ | 用途 |
|------|--------|-----------|------|
| 縦並び（通常フォーム） | `px-3 py-2 text-base` | 52px | 設定画面・登録フォーム |
| 横並び（インラインフォーム） | `h-11 leading-normal text-base` | 44px | 検索バー・フィルターバー |

> 同一ページ内で両モードが共存することは許容する（例: 上部に検索バー 44px、下部に詳細フォーム 52px）。これは配置文脈に応じた意図的な設計判断であり、視覚的一貫性の問題ではない。

### インラインフォームのエラー表示

インラインフォーム（検索バー等）ではフィールドレベルエラーのテキスト表示は使わない。エラーが必要な場合は **Alert（フォームレベルエラー）** をフォーム下部に表示する。

```html
<!-- インラインフォームのエラー例 -->
<div class="flex flex-wrap items-end gap-4">
  <!-- ...入力欄・セレクト・ボタン... -->
</div>
<div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800" role="alert">
  エリアを入力してください
</div>
```

> **理由**: フィールド直下にエラーテキストが展開されると、`items-end` で揃えた他要素との底辺基準がずれる。

---

## エラー表示パターン

### フィールドレベルエラー

```html
<div>
  <label for="email_err" class="block text-sm font-medium text-slate-700 mb-1">
    メールアドレス <span class="text-red-500">*</span>
  </label>
  <input type="email" id="email_err" name="email"
    aria-invalid="true"
    aria-describedby="email_error"
    class="w-full px-3 py-2 text-base text-slate-900 bg-white border border-red-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-colors"
    value="invalid">
  <p id="email_error" class="mt-1 text-xs text-red-500 flex items-center gap-1">
    <svg class="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
    </svg>
    正しいメールアドレスの形式で入力してください
  </p>
</div>
```

### フォームレベルエラー（サマリー）

```html
<div class="p-4 bg-red-50 border border-red-200 rounded-lg mb-6" role="alert">
  <h3 class="text-sm font-medium text-red-800">入力内容に問題があります</h3>
  <ul class="mt-2 text-sm text-red-700 list-disc list-inside">
    <li>名前を入力してください</li>
    <li>正しいメールアドレスの形式で入力してください</li>
  </ul>
</div>
```

---

## スペーシングルール

| 要素 | Tailwindクラス |
|------|---------------|
| フォーム全体の縦間隔 | `space-y-5` |
| ラベルと入力欄の間 | `mb-1` |
| エラーテキストの上マージン | `mt-1` |
| グループ間の間隔 | `space-y-8` |
| アクションボタンの上パディング | `pt-4` |
| チェックボックスの縦間隔 | `space-y-3` |
| フォーム制御ラベルの行間リセット | `leading-normal`（包含 `<div>` に付与） |

---

## 日付セレクト（年月日）

年・月・日を個別の `<select>` で構成するパターン。均等幅（`grid-cols-3`）は月・日セレクトが不必要に広くなるため禁止。

```html
<div>
  <label class="block text-sm font-medium text-slate-700 mb-1">生年月日</label>
  <div class="flex items-center gap-2">
    <div class="relative">
      <select class="appearance-none w-28 h-11 pl-3 pr-10 text-base leading-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 bg-white cursor-pointer">
        <option value="">--</option>
        <option>1990</option>
        <!-- ... -->
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
    <span class="text-sm text-slate-500">年</span>
    <div class="relative">
      <select class="appearance-none w-20 h-11 pl-3 pr-10 text-base leading-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 bg-white cursor-pointer">
        <option value="">--</option>
        <option>1</option>
        <!-- ... -->
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
    <span class="text-sm text-slate-500">月</span>
    <div class="relative">
      <select class="appearance-none w-20 h-11 pl-3 pr-10 text-base leading-normal border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500/50 bg-white cursor-pointer">
        <option value="">--</option>
        <option>1</option>
        <!-- ... -->
      </select>
      <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
      </svg>
    </div>
    <span class="text-sm text-slate-500">日</span>
  </div>
</div>
```

### ルール
- 年: `w-28`（112px）— 4桁の数字に十分な幅
- 月・日: `w-20`（80px）— 1〜2桁に適した幅
- `flex items-center gap-2` で横並び（`grid-cols-3` 禁止）
- 各セレクトの後に年/月/日のサフィックスラベル（`text-sm text-slate-500`）を推奨
- `cursor-pointer` を付与

---

## カード内のセクション見出し

カード（`border` + `rounded-xl`）の直下に `<fieldset>` を配置すると、`<legend>` のブラウザデフォルト描画がカードのボーダーと干渉する。カードレベルのセクション見出しには `<div>` + `<h2>` を使用する。

```html
<!-- OK: カード内のセクション見出し -->
<div class="bg-white rounded-xl border border-slate-200 p-6">
  <h2 class="text-lg font-semibold text-slate-900 mb-4">基本情報</h2>
  <div class="space-y-5">
    <!-- フォームフィールド -->
  </div>
</div>

<!-- OK: カード内部でのフォームコントロールグループ -->
<div class="bg-white rounded-xl border border-slate-200 p-6">
  <h2 class="text-lg font-semibold text-slate-900 mb-4">設定</h2>
  <fieldset>
    <legend class="text-sm font-medium text-slate-700 mb-3">通知方法</legend>
    <!-- チェックボックス等 -->
  </fieldset>
</div>

<!-- NG: カード直下の fieldset — legend がボーダーと干渉する -->
<div class="bg-white rounded-xl border border-slate-200">
  <fieldset class="p-6">
    <legend class="text-lg font-semibold text-slate-900">基本情報</legend>
    <!-- legend がカードのボーダー上に浮いて表示される -->
  </fieldset>
</div>
```

---

## Legend の使い分け

フォーム内の `<legend>` には2つの用途がある。混同しないこと。

| 用途 | クラス | 説明 |
|------|--------|------|
| セクション legend | `text-lg font-semibold text-slate-900 mb-4` | フォーム全体を大きなグループに分けるセクション見出し（例: 基本情報、通知設定） |
| フィールド legend | `text-sm font-medium text-slate-700 mb-3` | チェックボックスグループ・ラジオグループの小見出し（例: 通知設定、性別） |

---

## フォーム内コンテンツ幅

フォームページは `max-w-2xl` を推奨。入力欄が横に広がりすぎると入力しづらい。

```html
<main class="flex-1 bg-gray-50 overflow-y-auto">
  <div class="max-w-2xl mx-auto px-6 py-8">
    <h1 class="text-3xl font-bold text-slate-900 mb-8">設定</h1>
    <form class="space-y-5">
      <!-- フォームコンテンツ -->
    </form>
  </div>
</main>
```

---

## 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| ラベルの横配置 | モバイルで破綻し、視線移動が増える | ラベルは入力欄の上 |
| プレースホルダーのみ | 入力開始で消える | `<label>` を必ず使用 |
| 離れた位置のエラー表示 | フィールドとの対応がわからない | フィールド直下に表示 |
| エラーの自動非表示 | ユーザーが読む前に消える | 修正されるまで表示 |
| 全フィールドの横並び | 視線移動が増え、ミスが増える | 縦並びを基本とする |
| カード直下の `<fieldset>` + `<legend>` | `<legend>` がカードの `border` と干渉して浮く | カードのセクション見出しは `<div>` + `<h2>` を使用 |
| 日付セレクトの均等幅（`grid-cols-3`） | 月・日が広すぎて選択しにくい | `flex` + 年 `w-28`、月・日 `w-20` + サフィックスラベル |
