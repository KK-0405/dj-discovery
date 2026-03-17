import { type Track } from "@/lib/spotify";

export type { Track };

export type Mode = "search" | "similar";

export type SavedPlaylist = {
  id: string;
  name: string;
  tracks: Track[];
};

export type YoutubePlaylist = {
  id: string;
  snippet: { title: string };
};