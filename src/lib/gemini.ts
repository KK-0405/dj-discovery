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

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";
async function geminiPost(apiKey: string, body: object): Promise<any> {
  const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as any;
  return { __data: data, __status: res.status, __ok: res.ok };
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

function mockMetadata(title: string): GeminiMetadata {
  // タイトルのハッシュ値で値をばらけさせる
  const h = [...title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xffff, 0);
  const bpms = [120, 124, 128, 132, 138, 140, 96, 100, 110, 115];
  const camelots = ["1A","2A","3A","4A","5A","6A","1B","2B","3B","4B","5B","6B","7A","8A"];
  const keys = ["C major","D minor","F major","G major","A minor","E major","B minor"];
  const genres = [["House","Deep House"],["Techno","Minimal"],["Disco","Funk"],["Hip-Hop","R&B"],["Pop","Synth-pop"]];
  return {
    bpm: bpms[h % bpms.length],
    key: keys[h % keys.length],
    camelot: camelots[h % camelots.length],
    energy: 0.4 + (h % 6) * 0.1,
    danceability: 0.5 + (h % 5) * 0.1,
    is_vocal: h % 3 !== 0,
    genre_tags: genres[h % genres.length],
    release_year: 2000 + (h % 24),
    confidence: "high",
  };
}

export async function getMetadataBatch(
  tracks: { title: string; artist: string }[]
): Promise<BatchResult> {
  if (process.env.GEMINI_MOCK === "true") {
    return { results: tracks.map((t) => mockMetadata(t.title)) };
  }
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
  if (process.env.GEMINI_MOCK === "true") {
    const mockSongs = [
      { title: "Get Lucky", artist: "Daft Punk" },
      { title: "One More Time", artist: "Daft Punk" },
      { title: "Around the World", artist: "Daft Punk" },
      { title: "Harder Better Faster Stronger", artist: "Daft Punk" },
      { title: "Le Freak", artist: "Chic" },
      { title: "Good Times", artist: "Chic" },
      { title: "Superstition", artist: "Stevie Wonder" },
      { title: "September", artist: "Earth Wind & Fire" },
      { title: "Boogie Wonderland", artist: "Earth Wind & Fire" },
      { title: "I Feel Love", artist: "Donna Summer" },
    ];
    return mockSongs.slice(0, count).map((s) => ({ ...s, ...mockMetadata(s.title) }));
  }
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
