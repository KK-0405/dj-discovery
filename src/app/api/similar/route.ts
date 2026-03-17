import { NextRequest, NextResponse } from "next/server";
import { getSimilarTrackSuggestions } from "@/lib/gemini";

function mapDeezerTrack(t: any, meta: { bpm: number; key: string; camelot: string; energy: number; danceability: number; is_vocal: boolean; genre_tags: string[]; release_year: number }) {
  return {
    id: String(t.id),
    name: t.title,
    artists: [{ name: t.artist?.name ?? "" }],
    album: {
      name: t.album?.title ?? "",
      images: t.album?.cover_medium ? [{ url: t.album.cover_medium }] : [],
    },
    duration_ms: (t.duration ?? 0) * 1000,
    bpm: meta.bpm || (t.bpm ? Math.round(t.bpm) : 0),
    key: meta.key,
    camelot: meta.camelot,
    energy: meta.energy,
    danceability: meta.danceability,
    is_vocal: meta.is_vocal,
    genre_tags: meta.genre_tags,
    release_year: meta.release_year || (t.release_date ? parseInt(t.release_date.slice(0, 4)) : undefined),
    url: t.link ?? `https://www.deezer.com/track/${t.id}`,
    preview: t.preview ?? undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { seed, subSeeds = [], count = 50 } = (await request.json()) as {
      seed: {
        title: string;
        artist: string;
        genre_tags?: string[];
        bpm?: number;
        camelot?: string;
        energy?: number;
        danceability?: number;
        is_vocal?: boolean;
        release_year?: number;
      };
      subSeeds?: { title: string; artist: string; genre_tags?: string[] }[];
      count?: number;
    };

    if (!seed?.title || !seed?.artist) {
      return NextResponse.json({ error: "seed is required" }, { status: 400 });
    }

    // Geminiに類似曲を提案させる
    const suggestions = await getSimilarTrackSuggestions(seed, subSeeds, count);

    if (suggestions.length === 0) {
      return NextResponse.json({ tracks: [], error: "Gemini returned no suggestions" });
    }

    // 各提案をDeezerで検索（並列）
    const results = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.title} ${s.artist}`);
          const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
          const data = (await res.json()) as any;
          const hit = data?.data?.[0];
          if (!hit) return null;
          return mapDeezerTrack(hit, s);
        } catch {
          return null;
        }
      })
    );

    const tracks = results.filter(Boolean);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
