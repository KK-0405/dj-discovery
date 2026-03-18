# Interaction States

> 画面の状態遷移パターン。Loading / Empty / Error / Complete の4状態を統一的に設計する。

---

## State / Variant / Pattern の分類

| 概念 | 誰が切り替える？ | 本番に残る？ | クエリパラメータ | 例 |
|------|-----------------|------------|----------------|-----|
| **State** | ユーザー（アプリ内UI操作） | 全て残る | `_tab=xxx` | タブ切替、グリッド/リスト |
| **Variant** | システム（データ条件） | 全て残る | `_v=xxx` | 空状態、ローディング、エラー |
| **Pattern** | デザイナー（設計方針の比較） | 1つだけ採用 | `_p=xxx` | カード型 vs タイムライン型 |

**判断基準**: アプリ内にトグルUI（ボタン・タブ等）があれば **State**。なければ **Pattern**。

---

## 設計思想

- **行き止まりを作らない**: すべての状態に次のアクション（CTA）を提示する
- **Whisper**: エラーは叫ばず、冷静に原因とリカバリ手段を伝える
- **Tactile**: Complete 時にのみ温かいエモーショナル演出を許可する
- **Effortless**: Loading はコンテンツの形状を予告し、認知コストを下げる
- **Inclusive**: 全状態に適切な ARIA 属性を付与する

---

## 状態別仕様

### Loading

データ取得中・非同期処理中に表示する。

| 項目 | 値 |
|------|-----|
| 推奨パターン | スケルトン（コンテンツ領域）/ インラインスピナー（ボタン操作後）/ ドットローダー（部分読み込み） |
| スケルトン色 | `bg-slate-200` |
| スケルトンアニメーション | pulse 1.5s ease-in-out infinite |
| スピナー | clip-path arc（0.8s clip + 1.6s rotate）、`currentColor` で親要素の色を継承 |
| ドットローダー | 3バー波打ち、1.2s ease-in-out、primary-500 |
| コンテナ | `text-center py-16` |
| アクセシビリティ | `aria-busy="true"` + `role="status"` |

#### スケルトン CSS

```css
@keyframes skeletonPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.skeleton-pulse { animation: skeletonPulse 1.5s ease-in-out infinite; }
```

```html
<div aria-busy="true" role="status" class="space-y-4">
  <div class="flex items-center gap-3">
    <div class="w-10 h-10 rounded-full bg-slate-200 skeleton-pulse"></div>
    <div class="flex-1 space-y-2">
      <div class="h-4 bg-slate-200 rounded-md w-3/4 skeleton-pulse"></div>
      <div class="h-3 bg-slate-200 rounded-md w-1/2 skeleton-pulse"></div>
    </div>
  </div>
  <div class="space-y-2">
    <div class="h-3 bg-slate-200 rounded-md w-full skeleton-pulse"></div>
    <div class="h-3 bg-slate-200 rounded-md w-5/6 skeleton-pulse"></div>
  </div>
</div>
```

#### インラインスピナー CSS

```css
.inline-spinner {
  width: 1em;
  aspect-ratio: 1;
  border-radius: 50%;
  border: 2.5px solid currentColor;
  animation:
    spinnerClip 0.8s infinite linear alternate,
    spinnerRotate 1.6s infinite linear;
}
@keyframes spinnerClip {
  0%    {clip-path: polygon(50% 50%,0       0,  50%   0%,  50%    0%, 50%    0%, 50%    0%, 50%    0% )}
  12.5% {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100%   0%, 100%   0%, 100%   0% )}
  25%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 100% 100%, 100% 100% )}
  50%   {clip-path: polygon(50% 50%,0       0,  50%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
  62.5% {clip-path: polygon(50% 50%,100%    0, 100%   0%,  100%   0%, 100% 100%, 50%  100%, 0%   100% )}
  75%   {clip-path: polygon(50% 50%,100% 100%, 100% 100%,  100% 100%, 100% 100%, 50%  100%, 0%   100% )}
  100%  {clip-path: polygon(50% 50%,50%  100%,  50% 100%,   50% 100%,  50% 100%, 50%  100%, 0%   100% )}
}
@keyframes spinnerRotate {
  0%    {transform:scaleY(1)  rotate(0deg)}
  49.99%{transform:scaleY(1)  rotate(135deg)}
  50%   {transform:scaleY(-1) rotate(0deg)}
  100%  {transform:scaleY(-1) rotate(-135deg)}
}
```

```html
<button disabled class="inline-flex items-center gap-2 h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg opacity-75 cursor-not-allowed">
  <div class="inline-spinner"></div>
  送信中...
</button>
```

#### ドットローダー CSS

```css
.dot-loader {
  display: flex;
  align-items: center;
  gap: 5px;
  height: 34px;
}
.dot-loader span {
  width: 9px;
  height: 17px;
  background: var(--color-primary-500, #2b70ef);
  border-radius: 3px;
  animation: dotWave 1.2s infinite ease-in-out;
}
.dot-loader span:nth-child(2) { animation-delay: 0.2s; }
.dot-loader span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dotWave {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-50%); }
  50% { transform: translateY(50%); }
  75% { transform: translateY(0); }
}
```

```html
<div role="status" class="flex flex-col items-center justify-center py-16">
  <div class="dot-loader"><span></span><span></span><span></span></div>
  <p class="text-sm text-slate-500 mt-3">読み込み中...</p>
</div>
```

---

### Empty

データ0件・検索結果なし・初回利用時に表示する。

| 項目 | 値 |
|------|-----|
| アイコンコンテナ | `w-16 h-16 bg-slate-100 rounded-full` |
| アイコン | `w-8 h-8 text-slate-500`（stroke スタイル推奨） |
| 見出し | `text-base font-semibold text-slate-900` |
| 説明文 | `text-sm text-slate-500 mt-1 max-w-xs mx-auto` |
| CTA | Primary ボタン（必須）。次のアクションを明示する |
| コンテナ | `text-center py-16` |
| アクセシビリティ | `role="status"` |

#### バリエーション

| バリエーション | アイコン | 見出し例 | CTA例 |
|----------------|----------|----------|-------|
| データ0件 | inbox（受信トレイ） | 「データがありません」 | 「新規作成」 |
| 検索結果なし | search（虫眼鏡） | 「一致する結果がありません」 | 「検索条件を変更」 |
| 初回利用 | sparkles / rocket（前向き） | 「はじめましょう」 | 「最初の○○を作成」 |

#### アイコン選択ガイド

- **データ0件**: 空の容器を連想させるアイコン（inbox, folder, database）
- **検索結果なし**: 探索を示すアイコン（search, filter）
- **初回利用**: ポジティブで前向きなアイコン（sparkles, rocket, compass）
- 共通: stroke スタイル、`w-8 h-8 text-slate-500`、`stroke-width="1.5"`

#### CTA の文言ガイドライン

- **動詞始まり**: 「作成する」「追加する」「検索条件を変更」など具体的な動作を示す
- **ポジティブ**: 否定表現を避ける（× 「もう一度やり直す」→ ○ 「再検索する」）
- **簡潔**: 2〜6文字が理想

#### データ0件

```html
<div role="status" class="text-center py-16">
  <div class="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
    </svg>
  </div>
  <h4 class="text-base font-semibold text-slate-900">データがありません</h4>
  <p class="text-sm text-slate-500 mt-1 max-w-xs mx-auto">まだ項目が登録されていません。最初のデータを追加してみましょう。</p>
  <button class="mt-4 h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
    新規作成
  </button>
</div>
```

#### 検索結果なし

```html
<div role="status" class="text-center py-16">
  <div class="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/>
    </svg>
  </div>
  <h4 class="text-base font-semibold text-slate-900">一致する結果がありません</h4>
  <p class="text-sm text-slate-500 mt-1 max-w-xs mx-auto">検索条件を変更するか、フィルターを調整してみてください。</p>
  <button class="mt-4 h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
    検索条件を変更
  </button>
</div>
```

#### 初回利用

```html
<div role="status" class="text-center py-16">
  <div class="w-16 h-16 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
    </svg>
  </div>
  <h4 class="text-base font-semibold text-slate-900">はじめましょう</h4>
  <p class="text-sm text-slate-500 mt-1 max-w-xs mx-auto">最初のプロジェクトを作成して、チームでの共同作業を始めましょう。</p>
  <button class="mt-4 h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
    最初のプロジェクトを作成
  </button>
</div>
```

---

### Error

通信エラー・404/500・パーミッション不足に表示する。

| 項目 | 値 |
|------|-----|
| アイコンコンテナ | `w-16 h-16 bg-red-50 rounded-full` |
| アイコン | `w-8 h-8 text-red-400`（stroke スタイル推奨） |
| 見出し | `text-base font-semibold text-slate-900`（what happened） |
| 説明文 | `text-sm text-slate-500 mt-1 max-w-xs mx-auto`（why + what to do） |
| CTA | Primary ボタン（必須）。「再読み込み」「ホームに戻る」等のリカバリ手段 |
| コンテナ | `text-center py-16` |
| 出現アニメーション | fadeIn 200ms ease-out |
| アクセシビリティ | `role="alert"` + `aria-live="assertive"` |

```html
<div role="alert" aria-live="assertive" class="text-center py-16">
  <div class="w-16 h-16 mx-auto bg-red-50 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
    </svg>
  </div>
  <h4 class="text-base font-semibold text-slate-900">読み込みに失敗しました</h4>
  <p class="text-sm text-slate-500 mt-1 max-w-xs mx-auto">ネットワークに問題が発生しました。しばらくしてからもう一度お試しください。</p>
  <button class="mt-4 h-10 px-4 text-[1rem] font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-700 transition-colors">
    再読み込み
  </button>
</div>
```

---

### Complete

フォーム送信完了・登録完了・処理完了に表示する。

| 項目 | 値 |
|------|-----|
| アイコンコンテナ | `w-16 h-16 bg-emerald-50 rounded-full` |
| アイコン | `w-8 h-8 text-emerald-500`（stroke スタイル推奨） |
| 見出し | `text-base font-semibold text-slate-900` |
| 説明文 | `text-sm text-slate-500 mt-1 max-w-xs mx-auto`（次のステップ） |
| CTA | Secondary ボタン（推奨）。「ホームに戻る」「一覧へ」等の導線 |
| コンテナ | `text-center py-16` |
| アニメーション | アイコン scale 300ms ease-out → テキスト fadeIn 300ms（遅延 200ms） |
| アクセシビリティ | `role="status"` + `aria-live="polite"` |

```html
<div role="status" aria-live="polite" class="text-center py-16">
  <div class="w-16 h-16 mx-auto bg-emerald-50 rounded-full flex items-center justify-center mb-4">
    <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  </div>
  <h4 class="text-base font-semibold text-slate-900">送信が完了しました</h4>
  <p class="text-sm text-slate-500 mt-1 max-w-xs mx-auto">お問い合わせありがとうございます。担当者から折り返しご連絡いたします。</p>
  <button class="mt-4 h-10 px-4 text-[1rem] font-medium text-primary-500 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
    ホームに戻る
  </button>
</div>
```

---

## 使い分けガイド

| シナリオ | 状態 | CTA |
|---------|------|-----|
| ページ初期表示（データ取得中） | Loading（スケルトン） | — |
| ボタン押下後の処理中 | Loading（インラインスピナー） | — |
| 部分コンテンツの読み込み | Loading（ドットローダー） | — |
| データ0件 | Empty | 新規作成 |
| 検索結果なし | Empty | 検索条件を変更 |
| 通信エラー / タイムアウト | Error | 再読み込み |
| 404 Not Found | Error | ホームに戻る |
| パーミッション不足 | Error | ログイン / 権限申請 |
| フォーム送信完了 | Complete | ホームに戻る |
| 登録・設定完了 | Complete | 一覧へ / 次のステップ |

---

## 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| CTA なしの Empty / Error | 行き止まりになる | 必ず次のアクションを提示 |
| スケルトンなしの真っ白ローディング | コンテンツが消えたように見える | スケルトンで形状を予告 |
| 赤背景のエラー画面 | 叫びすぎ（Whisper 原則に反する） | アイコン + テキストで冷静に伝える |
| Complete のアニメーションなし | 達成感が伝わらない（Tactile 原則） | scale + fadeIn を使用 |
| 常時回転するスピナーのみの画面 | 進捗が伝わらない | スケルトン or プログレスバー併用 |
