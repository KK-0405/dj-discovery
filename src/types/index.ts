import { type Track } from "@/lib/deezer";

export type { Track };

export type Mode = "search" | "similar" | "playlist";

export type SimilarFilters = {
  // リズム・テンポ
  bpmRange: null | 5 | 10;
  // キー・ハーモニー
  sameKey: boolean;
  camelotAdjacent: boolean;
  // ジャンル（チェックボックス: 選択中のジャンルのみ表示）
  selectedGenres: string[];
  // エネルギー・ムード
  energyLevel: null | "high" | "medium" | "low";
  // アーティスト・時代
  sameArtist: boolean;
  decade: string | null;
  // プレイリスト除外
  excludePlaylist: boolean;
};

export type HistoryEntry = {
  id: string;          // = mainSeed.id (dedup key)
  savedAt: number;     // Date.now()
  mainSeed: Track;
  subSeeds: Track[];
  similarTracks: Track[];
};

export type SavedPlaylist = {
  id: string;
  name: string;
  tracks: Track[];
  is_public: boolean;
  slug: string | null;
  created_at?: string;
  created_by?: string;
};

export type YoutubePlaylist = {
  id: string;
  snippet: { title: string };
};