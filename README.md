# DJ Discovery

DJ向け楽曲探索アプリ

## 概要

曲 → 似ている曲 → さらに似ている曲という探索構造でDJが新しい曲を見つけるアプリ。

## 機能

- 曲検索（Last.fm API）
- 類似曲探索
- メイン・サブSeed設定
- BPMフィルター
- プレイリスト作成
- YouTubeプレイリスト書き出し（実装予定）

## 技術スタック

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Last.fm API
- YouTube Data API v3
- Supabase
- Vercel

## セットアップ
```bash
git clone https://github.com/kk-0405/dj-discovery.git
cd dj-discovery
npm install
```

`.env.local` を作成して以下を設定：
```env
LASTFM_API_KEY=your_api_key
LASTFM_API_SECRET=your_api_secret
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
```
```bash
npm run dev
```

## デモ

https://dj-discovery-ihhs.vercel.app

## 今後の改善

- BPM・Key自動取得
- YouTubeプレイリスト書き出し
- Discovery Graph
- DJ Set Builder
- Supabaseでプレイリスト保存

## クレジット

- BPM data by [GetSongBPM](https://getsongbpm.com)
- 楽曲データ by [Last.fm](https://www.last.fm)