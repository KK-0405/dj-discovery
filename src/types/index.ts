import { type Track } from "@/lib/deezer";

export type { Track };

export type Mode = "search" | "similar";

export type SimilarFilters = {
  bpmRange: null | 5 | 10;
  sameArtist: boolean;
};

export type SavedPlaylist = {
  id: string;
  name: string;
  tracks: Track[];
};

export type YoutubePlaylist = {
  id: string;
  snippet: { title: string };
};