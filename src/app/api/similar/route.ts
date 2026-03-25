import { NextRequest, NextResponse } from "next/server";
import { getSimilarTrackSuggestions, isJapanese, isJapaneseContext } from "@/lib/gemini";

// 日本語テキストかどうかで一致方法を切り替えるマッチスコア
// 日本語はスペース区切りがないため、単語分割ではなく部分文字列で判定する

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
    const { seed, subSeeds = [], count = 20, excludeTitles = [], excludeAnthems = false } = (await request.json()) as {
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
      excludeAnthems?: boolean;
    };

    if (!seed?.title || !seed?.artist) {
      return NextResponse.json({ error: "seed is required" }, { status: 400 });
    }

    const cap = Math.min(count, 30);

    // Step1: Geminiに類似曲の提案＋メタデータを1回で取得
    // japaneseSeed はアーティストの実際の出身国・活動市場をGeminiが判定して返す
    const { suggestions, japaneseSeed: geminiJapaneseSeed, error: geminiError } = await getSimilarTrackSuggestions(seed, subSeeds, cap, excludeTitles, excludeAnthems);
    // Geminiが判定した値を優先、取得できなければフォールバック
    const japaneseSeed = geminiJapaneseSeed ?? isJapaneseContext(seed.title, seed.artist, seed.genre_tags);
    if (suggestions.length === 0) {
      return NextResponse.json({ tracks: [], _debug: geminiError ?? "Gemini returned 0 suggestions" });
    }

    // タイトル・アーティストの一致度スコアリング（日本語対応）
    function matchScore(deezerTitle: string, deezerArtist: string, sugTitle: string, sugArtist: string): number {
      const dt = deezerTitle.toLowerCase();
      const da = deezerArtist.toLowerCase();
      const st = sugTitle.toLowerCase();
      const sa = sugArtist.toLowerCase();
      let score = 0;
      // タイトル: 日本語は全体一致、英語は単語分割
      if (isJapanese(sugTitle)) {
        if (dt.includes(st) || st.includes(dt)) score += 6;
      } else {
        for (const w of st.split(/\s+/).filter((w) => w.length > 1)) if (dt.includes(w)) score += 2;
      }
      // アーティスト: 日本語は全体一致、英語は単語分割
      if (isJapanese(sugArtist)) {
        if (da.includes(sa) || sa.includes(da)) score += 6;
      } else {
        for (const w of sa.split(/\s+/).filter((w) => w.length > 1)) if (da.includes(w)) score += 2;
      }
      // 完全一致ボーナス
      if (dt === st) score += 4;
      if (da === sa) score += 4;
      return score;
    }

    // Step2: 各提案をDeezerで並列検索
    const deezerResults = await Promise.all(
      suggestions.map(async (s) => {
        try {
          const q = encodeURIComponent(`${s.title} ${s.artist}`);
          const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=10`);
          const data = (await res.json()) as any;
          const hits: any[] = data?.data ?? [];
          if (hits.length === 0) return null;

          // フィルタリング後にスコアが最も高い曲を選ぶ
          const candidates = hits
            .filter((hit) => {
              if (isDeezerKaraoke(hit.artist?.name ?? "", hit.title ?? "")) return false;
              if (!japaneseSeed && (isJapanese(hit.title ?? "") || isJapanese(hit.artist?.name ?? ""))) return false;
              return true;
            })
            .map((hit) => ({
              hit,
              score: matchScore(hit.title ?? "", hit.artist?.name ?? "", s.title, s.artist),
            }))
            .sort((a, b) => b.score - a.score);

          if (candidates.length === 0) return null;
          return mapDeezerTrack(candidates[0].hit);
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
          // 曲名・アーティストは常にGeminiの提案を使う（正確な情報源）
          // DeezerはプレビューURL・アルバムアート・BPMの取得にのみ使う
          name: s.title || track.name,
          artists: s.artist ? [{ name: s.artist }] : track.artists,
          bpm: track.bpm || s.bpm || 0,
          key: s.key ?? "",
          camelot: s.camelot ?? "",
          energy: s.energy ?? 0.5,
          is_vocal: s.is_vocal ?? true,
          genre_tags: s.genre_tags ?? [],
          release_year: track.release_year || s.release_year || undefined,
          reason: s.reason ?? undefined,
        };
      })
      .filter(Boolean)
      .slice(0, cap);

    const _debug = `gemini:${suggestions.length} deezer_ok:${deezerResults.filter(Boolean).length} deezer_ng:${deezerResults.filter((r) => r === null).length} jp:${japaneseSeed} err:${geminiError ?? "none"}`;
    return NextResponse.json({ tracks: tracksWithMeta, _debug });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
