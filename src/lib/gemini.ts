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
const MAX_RETRIES = 3;

async function geminiPost(apiKey: string, body: object): Promise<any> {
  let waitMs = 5000;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    if (res.status === 429) {
      if (attempt === MAX_RETRIES) return { __error: data, __status: 429 };
      // エラーレスポンスのretryDelayがあればそれを使う、なければ指数バックオフ
      const retryDelaySec = data?.error?.details?.find((d: any) => d.retryDelay)?.retryDelay;
      const delayMs = retryDelaySec
        ? Math.ceil(parseFloat(retryDelaySec) * 1000)
        : waitMs;
      await new Promise((r) => setTimeout(r, delayMs));
      waitMs *= 2;
      continue;
    }
    return { __data: data, __status: res.status, __ok: res.ok };
  }
}

function extractText(data: any): string {
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
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
};

export async function getMetadataBatch(
  tracks: { title: string; artist: string }[]
): Promise<BatchResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { results: tracks.map(() => null), error: "GEMINI_API_KEY not set" };

  const list = tracks.map((t, i) => `${i + 1}. "${t.title}" by ${t.artist}`).join("\n");

  const prompt = `You are a music expert. For each song below, return music metadata as a JSON array.
Return ONLY a JSON array, same order as input. No explanation, no markdown.

Songs:
${list}

Each object: { bpm: integer, key: string, camelot: string, energy: float 0-1, danceability: float 0-1, is_vocal: boolean, genre_tags: string[], release_year: integer, confidence: "high"|"medium"|"low" }`;

  try {
    const result = await geminiPost(apiKey, { contents: [{ parts: [{ text: prompt }] }] });
    if (!result || !result.__ok || result.__data?.error) {
      return { results: tracks.map(() => null), error: `HTTP ${result?.__status}: ${JSON.stringify(result?.__data?.error ?? result?.__error)}` };
    }
    const text = extractText(result.__data);
    const parsed = parseJson(text);
    if (!Array.isArray(parsed)) {
      return { results: tracks.map(() => null), error: "Not a JSON array" };
    }
    return {
      results: tracks.map((_, i) => {
        try { return parsed[i] ? sanitize(parsed[i]) : null; } catch { return null; }
      }),
    };
  } catch (e) {
    return { results: tracks.map(() => null), error: String(e) };
  }
}

export type TrackSuggestion = { title: string; artist: string } & Partial<GeminiMetadata>;

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
    const result = await geminiPost(apiKey, { contents: [{ parts: [{ text: prompt }] }] });
    if (!result || !result.__ok || result.__data?.error) return [];
    const text = extractText(result.__data);
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
