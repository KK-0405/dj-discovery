import { NextRequest, NextResponse } from "next/server";
import { getSimilarTrackSuggestions, isJapanese, isJapaneseContext } from "@/lib/gemini";

// Deezerが返したトラックのアーティスト名で最終フィルター
const BLOCKED_ARTISTS = [
  /歌っちゃ王/,
  /うたっちゃ王/,
  /karaoke/i,
  /カラオケ/,
  /tribute/i,
  /cover version/i,
  /JOYSOUND/i,
];

function isDeezerKaraoke(artistName: string, title: string): boolean {
  return BLOCKED_ARTISTS.some((re) => re.test(artistName) || re.test(title));
}

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
    const { seed, subSeeds = [], count = 20, excludeTitles = [] } = (await request.json()) as {
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
      excludeTitles?: string[];
    };

    if (!seed?.title || !seed?.artist) {
      return NextResponse.json({ error: "seed is required" }, { status: 400 });
    }

    const cap = Math.min(count, 30);
    const japaneseSeed = isJapaneseContext(seed.title, seed.artist, seed.genre_tags);

    // Step1: Geminiに類似曲の提案＋メタデータを1回で取得
    // gemini側でバッファ込みで多めに取得するため、capをそのまま渡す
    const { suggestions, error: geminiError } = await getSimilarTrackSuggestions(seed, subSeeds, cap, excludeTitles);
    if (suggestions.length === 0) {
      return NextResponse.json({ tracks: [], _debug: geminiError ?? "Gemini returned 0 suggestions" });
    }

    // Step2: 各提案をDeezerで並列検索
    const deezerResults = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.title} ${s.artist}`);
          const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
          const data = (await res.json()) as any;
          const hit = data?.data?.[0];
          if (!hit) return null;
          // Deezer側でカラオケアーティストが返ってきた場合も排除
          if (isDeezerKaraoke(hit.artist?.name ?? "", hit.title ?? "")) return null;
          return mapDeezerTrack(hit);
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
          // 日本語コンテキスト or Geminiの提案自体が日本語なら日本語タイトル/アーティストを優先
          // (RADWIMPSのように英字アーティスト名でも日本語曲が提案される場合に対応)
          name: (japaneseSeed || isJapanese(s.title ?? "")) && s.title ? s.title : track.name,
          artists: (japaneseSeed || isJapanese(s.artist ?? "")) && s.artist ? [{ name: s.artist }] : track.artists,
          bpm: track.bpm || s.bpm || 0,
          key: s.key ?? "",
          camelot: s.camelot ?? "",
          energy: s.energy ?? 0.5,
          danceability: s.danceability ?? 0.5,
          is_vocal: s.is_vocal ?? true,
          genre_tags: s.genre_tags ?? [],
          release_year: track.release_year || s.release_year || undefined,
          reason: s.reason ?? undefined,
        };
      })
      .filter(Boolean)
      .slice(0, cap);

    return NextResponse.json({ tracks: tracksWithMeta, _debug: geminiError });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
