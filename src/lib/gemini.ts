export type GeminiMetadata = {
  bpm: number;
  key: string;
  camelot: string;
  energy: number;
  danceability: number;
  is_vocal: boolean;
  genre_tags: string[];
  release_year: number;
  confidence: "high" | "medium" | "low";
};

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

// APIクォータ節約のためのメモリキャッシュ（サーバー再起動でクリア）
const metadataCache = new Map<string, GeminiMetadata>();

// Gemini 2.5はthinkingパートとtextパートが分かれる場合があるため全パートを結合して検索
function extractText(data: any): string {
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  // thought=trueのパートを除いたテキストを優先、なければ全部結合
  const textParts = parts.filter((p: any) => !p.thought && typeof p.text === "string");
  if (textParts.length > 0) return textParts.map((p: any) => p.text).join("");
  return parts.map((p: any) => p.text ?? "").join("");
}

function parseJson(text: string): any {
  const match = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
  if (!match) throw new Error("No JSON found");
  return JSON.parse(match[1] ?? match[0]);
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function sanitize(m: any): GeminiMetadata {
  return {
    bpm: typeof m.bpm === "number" ? Math.round(clamp(m.bpm, 40, 220)) : 0,
    key: typeof m.key === "string" ? m.key : "",
    camelot: typeof m.camelot === "string" ? m.camelot : "",
    energy: typeof m.energy === "number" ? clamp(m.energy, 0, 1) : 0.5,
    danceability: typeof m.danceability === "number" ? clamp(m.danceability, 0, 1) : 0.5,
    is_vocal: typeof m.is_vocal === "boolean" ? m.is_vocal : true,
    genre_tags: Array.isArray(m.genre_tags) ? m.genre_tags.slice(0, 5) : [],
    release_year: typeof m.release_year === "number" ? m.release_year : 0,
    confidence: ["high", "medium", "low"].includes(m.confidence) ? m.confidence : "medium",
  };
}

export type BatchResult = {
  results: (GeminiMetadata | null)[];
  error?: string;
  rawResponse?: unknown;
};

// テキストベースで複数トラックのメタデータを一括取得（1回のAPI呼び出し）
export async function getMetadataBatch(
  tracks: { title: string; artist: string }[]
): Promise<BatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { results: tracks.map(() => null), error: "GEMINI_API_KEY not set" };

  // キャッシュ済みのトラックを除外してAPI呼び出しを最小化
  const cacheKeys = tracks.map((t) => `${t.title}|||${t.artist}`.toLowerCase());
  const uncachedIndices = cacheKeys.map((k, i) => metadataCache.has(k) ? -1 : i).filter(i => i >= 0);

  if (uncachedIndices.length === 0) {
    return { results: cacheKeys.map((k) => metadataCache.get(k) ?? null) };
  }

  const uncachedTracks = uncachedIndices.map((i) => tracks[i]);
  const list = uncachedTracks.map((t, i) => `${i + 1}. "${t.title}" by ${t.artist}`).join("\n");

  const prompt = `You are a music expert with deep knowledge of songs and their audio characteristics.
For each song below, provide accurate music metadata in JSON format.
Return ONLY a JSON array in the same order as the input. No explanation.

Songs:
${list}

For each song return an object with these fields:
- bpm: integer (actual/estimated tempo)
- key: string (e.g. "F# minor", "C major")
- camelot: string (Camelot wheel notation, e.g. "11A", "8B")
- energy: float 0-1 (0=very calm, 1=very intense)
- danceability: float 0-1 (0=not danceable, 1=very danceable)
- is_vocal: boolean (true if song has vocals, false if instrumental)
- genre_tags: string array, max 4 tags
- release_year: integer
- confidence: "high" if you know this song well, "medium" if somewhat familiar, "low" if unfamiliar`;

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data?.error) {
      return { results: tracks.map(() => null), error: `HTTP ${res.status}`, rawResponse: data };
    }
    const text = extractText(data);
    const parsed = parseJson(text);
    if (!Array.isArray(parsed)) {
      return { results: tracks.map(() => null), error: "Response was not a JSON array", rawResponse: text };
    }
    const uncachedResults = parsed.map((m: any) => {
      try { return sanitize(m); } catch { return null; }
    });

    // キャッシュに保存
    uncachedIndices.forEach((origIdx, i) => {
      const result = uncachedResults[i];
      if (result) metadataCache.set(cacheKeys[origIdx], result);
    });

    // キャッシュ済み含めて元のインデックス順に結果を組み立て
    return {
      results: cacheKeys.map((k, i) => {
        const uncachedPos = uncachedIndices.indexOf(i);
        if (uncachedPos >= 0) return uncachedResults[uncachedPos] ?? null;
        return metadataCache.get(k) ?? null;
      }),
    };
  } catch (e) {
    return { results: tracks.map(() => null), error: String(e) };
  }
}

export type TrackSuggestion = { title: string; artist: string } & Partial<GeminiMetadata>;

// シードのメタデータをもとに類似曲の提案とメタデータを1回のAPI呼び出しで取得
export async function getSimilarTrackSuggestions(
  seed: {
    title: string;
    artist: string;
    genre_tags?: string[];
    bpm?: number;
    camelot?: string;
    energy?: number;
    is_vocal?: boolean;
    release_year?: number;
  },
  subSeeds: { title: string; artist: string; genre_tags?: string[] }[],
  count: number
): Promise<TrackSuggestion[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return [];

  const genres = seed.genre_tags?.join(", ") || "unknown";
  const subGenreStr = subSeeds.flatMap((s) => s.genre_tags ?? []).filter(Boolean);
  const subInfo = subGenreStr.length ? `Sub-influences: ${subGenreStr.join(", ")}` : "";

  const prompt = `You are a DJ and music expert. List ${count} real songs to mix with "${seed.title}" by ${seed.artist}.
Genre: ${genres}. BPM≈${seed.bpm || "?"}, Era: ${seed.release_year || "?"}.${subInfo ? " " + subInfo : ""}
Rules: match genre closely, BPM within ±15, same era ±10 years, exclude the seed itself.
Return ONLY a JSON array with full metadata for each song. No explanation.
Each object must have: title, artist, bpm (integer), key (e.g. "F# minor"), camelot (e.g. "11A"), energy (float 0-1), danceability (float 0-1), is_vocal (boolean), genre_tags (string array max 4), release_year (integer), confidence ("high"/"medium"/"low").`;

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    });
    const data = (await res.json()) as any;
    if (!res.ok || data?.error) return [];
    const text = extractText(data);
    const parsed = parseJson(text);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((m: any) => {
        if (!m.title || !m.artist) return null;
        const meta = (() => { try { return sanitize(m); } catch { return null; } })();
        return { title: String(m.title), artist: String(m.artist), ...meta };
      })
      .filter(Boolean) as TrackSuggestion[];
  } catch {
    return [];
  }
}

// 音声ファイルベースでメタデータを解析（低信頼度トラック向けフォールバック）
export async function getMetadataFromAudio(
  title: string,
  artist: string,
  audioBase64: string
): Promise<GeminiMetadata | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Analyze this 30-second audio preview of "${title}" by ${artist}.
Provide music metadata in JSON format. Return ONLY the JSON object, no explanation.
{
  "bpm": <integer, actual detected tempo>,
  "key": <string, detected musical key e.g. "F# minor">,
  "camelot": <string, Camelot wheel notation e.g. "11A">,
  "energy": <float 0-1>,
  "danceability": <float 0-1>,
  "is_vocal": <boolean>,
  "genre_tags": <string array max 4>,
  "release_year": <integer, estimate from audio style if unknown>,
  "confidence": "high"
}`;

  try {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "audio/mpeg", data: audioBase64 } },
          ],
        }],
      }),
    });
    const data = (await res.json()) as any;
    const text = extractText(data);
    return sanitize(parseJson(text));
  } catch {
    return null;
  }
}
