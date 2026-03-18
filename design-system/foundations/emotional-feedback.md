# Emotional Feedback

> 哲学「機能的な黒子であり、たまに微笑む」を体現するフィードバック仕様。
> 操作への確実なフィードバックの中に、さりげないエモーショナルな心地よさを忍ばせる。

---

## 設計思想

- フィードバックは **派手さではなく確実さ** を重視する
- Success（成功）時にのみ **温かいエモーショナル演出** を許可する
- Error（エラー）は **叫ばない。だが明確に伝える**
- Warning / Info は **穏やかに、静かに案内する**

---

## 状態別フィードバック仕様

| 状態 | Duration | Easing | 視覚効果 | 感情意図 |
|------|----------|--------|----------|----------|
| Success | 300ms | ease-out | fade-in + check icon scale | 達成感・安心 |
| Error | 200ms | ease-in-out | shake（控えめ）+ red border | 注意喚起（叫ばない） |
| Warning | 200ms | ease-out | fade-in | 穏やかな注意 |
| Info | 200ms | ease-out | fade-in | 静かな案内 |

---

## アニメーション定義

### Success: fade-in + scale

```css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleCheck {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
```

- メッセージ: `fadeIn 300ms ease-out`
- チェックアイコン: `scaleCheck 400ms ease-out`（遅延 100ms）

### Error: shake

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
}
```

- `shake 200ms ease-in-out` × 2回
- 振幅は最大 3px。控えめに揺らし、叫ばない

### Warning / Info: fade-in

- `fadeIn 200ms ease-out`
- 共通のフェードインで穏やかに出現

---

## 用途別ルール

| 用途 | 推奨フィードバック | 備考 |
|------|------------------|------|
| フォーム送信成功 | Success (fade-in + scale) | Toast との併用可 |
| バリデーションエラー | Error (shake + red border) | フィールド直下にエラーテキスト必須 |
| 保存完了 | Success (fade-in) | Toast で通知 |
| ネットワークエラー | Error (Toast) | 自動消去しない |
| 残容量警告 | Warning (fade-in) | Toast で通知 |
| お知らせ | Info (fade-in) | Toast で通知、5秒で自動消去 |

---

## 禁止パターン

| 禁止 | 理由 | 代替 |
|------|------|------|
| 常時ループするアニメーション | 認知コスト増加、操作の邪魔 | 状態変化時の一回限り |
| 大きな振幅の shake（6px 以上） | 叫んでいるように見える | 最大 3px の控えめな揺れ |
| bounce / spin on feedback | 派手すぎて世界観を壊す | fade-in / scale を使用 |
| 効果音なしの error shake のみ | 視覚のみでは気づかない場合がある | テキスト + アイコンを併用 |

---

## prefers-reduced-motion 対応

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

モーション軽減設定のユーザーに対し、すべてのアニメーションを実質無効化する。
フィードバック自体（色変化・テキスト表示）は維持し、動きのみを除去する。
