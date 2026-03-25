import { NextRequest, NextResponse } from "next/server";
import { getSimilarTrackSuggestions, isJapanese, isJapaneseContext } from "@/lib/gemini";

const BLOCKED_PATTERNS = [
  /歌っちゃ王/, /うたっちゃ王/, /karaoke/i, /カラオケ/,
  /tribute/i, /cover version/i, /JOYSOUND/i,
];

function isKaraoke(title: string, artist: string): boolean {
  return BLOCKED_PATTERNS.some((re) => re.test(title) || re.test(artist));
}

// タイトル・アーティストの一致度スコアリング（日本語対応）
function matchScore(hitTitle: string, hitArtist: string, sugTitle: string, sugArtist: string): number {
  const ht = hitTitle.toLowerCase();
  const ha = hitArtist.toLowerCase();
  const st = sugTitle.toLowerCase();
  const sa = sugArtist.toLowerCase();
  let score = 0;
  if (isJapanese(sugTitle)) {
    if (ht.includes(st) || st.includes(ht)) score += 6;
  } else {
    for (const w of st.split(/\s+/).filter((w) => w.length > 1)) if (ht.includes(w)) score += 2;
  }
  if (isJapanese(sugArtist)) {
    if (ha.includes(sa) || sa.includes(ha)) score += 6;
  } else {
    for (const w of sa.split(/\s+/).filter((w) => w.length > 1)) if (ha.includes(w)) score += 2;
  }
  if (ht === st) score += 4;
  if (ha === sa) score += 4;
  return score;
}

export async function POST(request: NextRequest) {
  try {
    const { seed, subSeeds = [], count = 20, excludeTitles = [], excludeAnthems = false } = (await request.json()) as {
      seed: {
        title: string; artist: string; genre_tags?: string[];
        bpm?: number; camelot?: string; energy?: number;
        danceability?: number; is_vocal?: boolean; release_year?: number;
      };
      subSeeds?: { title: string; artist: string; genre_tags?: string[] }[];
      count?: number; excludeTitles?: string[]; excludeAnthems?: boolean;
    };

    if (!seed?.title || !seed?.artist) {
      return NextResponse.json({ error: "seed is required" }, { status: 400 });
    }

    const cap = Math.min(count, 30);

    // Step1: Geminiに類似曲の提案＋メタデータを取得
    const { suggestions, japaneseSeed: geminiJapaneseSeed, error: geminiError } = await getSimilarTrackSuggestions(seed, subSeeds, cap, excludeTitles, excludeAnthems);
    const japaneseSeed = geminiJapaneseSeed ?? isJapaneseContext(seed.title, seed.artist, seed.genre_tags);
    if (suggestions.length === 0) {
      return NextResponse.json({ tracks: [], _debug: geminiError ?? "Gemini returned 0 suggestions" });
    }

    // Step2: 各提案をiTunesで並列検索（アルバムアート・プレビュー取得）
    const locale = japaneseSeed ? "country=JP&lang=ja_jp" : "country=US&lang=en_us";

    const tracks = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.title} ${s.artist}`);
          const res = await fetch(`https://itunes.apple.com/search?term=${q}&media=music&entity=song&${locale}&limit=5`);
          const data = (await res.json()) as any;
          const hits: any[] = (data?.results ?? []).filter((r: any) => r.trackId);

          const candidates = hits
            .filter((h) => !isKaraoke(h.trackName ?? "", h.artistName ?? ""))
            .map((h) => ({ h, score: matchScore(h.trackName ?? "", h.artistName ?? "", s.title, s.artist) }))
            .sort((a, b) => b.score - a.score);

          // スコアが低すぎる場合はiTunesに存在しない曲とみなして除外
          const MIN_MATCH = isJapanese(s.title) ? 4 : 2;
          const best = (candidates[0]?.score ?? 0) >= MIN_MATCH ? candidates[0]?.h : null;
          if (!best) return null;
          const artwork = best
            ? (best.artworkUrl100 as string | undefined)?.replace("100x100bb", "600x600bb") ?? ""
            : "";

          return {
            id: best ? `it_${best.trackId}` : `gemini_${s.title}_${s.artist}`,
            name: s.title,
            artists: [{ name: s.artist }],
            album: {
              name: best?.collectionName ?? "",
              images: artwork ? [{ url: artwork }] : [],
            },
            duration_ms: best?.trackTimeMillis ?? 0,
            bpm: s.bpm || 0,
            key: s.key ?? "",
            camelot: s.camelot ?? "",
            energy: s.energy ?? 0.5,
            is_vocal: s.is_vocal ?? true,
            genre_tags: s.genre_tags ?? [],
            release_year: s.release_year ?? (best?.releaseDate ? parseInt(best.releaseDate.slice(0, 4)) : undefined),
            url: best?.trackViewUrl ?? `https://music.apple.com/search?term=${encodeURIComponent(`${s.title} ${s.artist}`)}`,
            preview: best?.previewUrl ?? undefined,
            reason: s.reason ?? undefined,
          };
        } catch {
          return {
            id: `gemini_${s.title}_${s.artist}`,
            name: s.title,
            artists: [{ name: s.artist }],
            album: { name: "", images: [] },
            duration_ms: 0,
            bpm: s.bpm || 0,
            key: s.key ?? "",
            camelot: s.camelot ?? "",
            energy: s.energy ?? 0.5,
            is_vocal: s.is_vocal ?? true,
            genre_tags: s.genre_tags ?? [],
            release_year: s.release_year ?? undefined,
            url: `https://music.apple.com/search?term=${encodeURIComponent(`${s.title} ${s.artist}`)}`,
            preview: undefined,
            reason: s.reason ?? undefined,
          };
        }
      })
    );

    return NextResponse.json({ tracks: tracks.filter(Boolean).slice(0, cap) });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
