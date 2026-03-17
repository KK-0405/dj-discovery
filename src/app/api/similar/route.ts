import { NextRequest, NextResponse } from "next/server";
import { getSimilarTrackSuggestions } from "@/lib/gemini";

function mapDeezerTrack(t: any) {
  return {
    id: String(t.id),
    name: t.title,
    artists: [{ name: t.artist?.name ?? "" }],
    album: {
      name: t.album?.title ?? "",
      images: t.album?.cover_medium ? [{ url: t.album.cover_medium }] : [],
    },
    duration_ms: (t.duration ?? 0) * 1000,
    bpm: t.bpm ? Math.round(t.bpm) : 0,
    key: "",
    url: t.link ?? `https://www.deezer.com/track/${t.id}`,
    preview: t.preview ?? undefined,
    release_year: t.release_date ? parseInt(t.release_date.slice(0, 4)) : undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { seed, subSeeds = [], count = 20 } = (await request.json()) as {
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

    const cap = Math.min(count, 30);

    // Step1: Geminiに類似曲の提案＋メタデータを1回で取得
    const suggestions = await getSimilarTrackSuggestions(seed, subSeeds, cap);
    if (suggestions.length === 0) {
      return NextResponse.json({ tracks: [] });
    }

    // Step2: 各提案をDeezerで並列検索
    const deezerResults = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.title} ${s.artist}`);
          const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
          const data = (await res.json()) as any;
          const hit = data?.data?.[0];
          return hit ? mapDeezerTrack(hit) : null;
        } catch {
          return null;
        }
      })
    );

    // Deezerヒットをsuggestionsのメタデータと合成（Step3のGemini呼び出し不要）
    const tracksWithMeta = deezerResults
      .map((track, i) => {
        if (!track) return null;
        const s = suggestions[i];
        return {
          ...track,
          bpm: track.bpm || s.bpm || 0,
          key: s.key ?? "",
          camelot: s.camelot ?? "",
          energy: s.energy ?? 0.5,
          danceability: s.danceability ?? 0.5,
          is_vocal: s.is_vocal ?? true,
          genre_tags: s.genre_tags ?? [],
          release_year: track.release_year || s.release_year || undefined,
        };
      })
      .filter(Boolean);

    return NextResponse.json({ tracks: tracksWithMeta });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
