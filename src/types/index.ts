import { type Track } from "@/lib/deezer";

export type { Track };

export type Mode = "search" | "similar";

export type SimilarFilters = {
  // リズム・テンポ
  bpmRange: null | 5 | 10;
  // キー・ハーモニー
  sameKey: boolean;
  camelotAdjacent: boolean;
  // ジャンル
  genreMatch: boolean;
  // エネルギー・ムード
  energyLevel: null | "high" | "medium" | "low";
  danceabilityHigh: boolean;
  // アーティスト・時代
  sameArtist: boolean;
  decade: string | null; // e.g. "2010s"
  // サウンド特性
  vocalType: null | "vocal" | "instrumental";
  // プレイリスト除外
  excludePlaylist: boolean;
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