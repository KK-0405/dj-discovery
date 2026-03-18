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

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent";
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

export type SimilarResult = {
  suggestions: TrackSuggestion[];
  error?: string;
};

function isJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// カラオケ・カバー・トリビュートを検出するキーワード
const KARAOKE_KEYWORDS = [
  /karaoke/i, /カラオケ/, /kara ?oke/i,
  /\btribute\b/i, /トリビュート/,
  /\bcover\b/i, /カバー/,
  /instrumental version/i, /インスト版/,
  /as made famous/i, /in the style of/i,
  /originally performed/i, /originally by/i,
  /sound ?alike/i, /bgm集/, /bgm collection/i,
  /\(re-?recorded\)/i, /\[re-?recorded\]/i,
];

function isKaraokeOrCover(title: string, artist: string): boolean {
  const combined = `${title} ${artist}`;
  return KARAOKE_KEYWORDS.some((re) => re.test(combined));
}

function buildSimilarPrompt(
  seed: { title: string; artist: string; genre_tags?: string[]; bpm?: number; release_year?: number },
  subSeeds: { title: string; artist: string; genre_tags?: string[] }[],
  count: number,
  excludeTitles: string[] = []
): string {
  const genres = seed.genre_tags?.join(", ") || "unknown";
  const subGenreStr = subSeeds.flatMap((s) => s.genre_tags ?? []).filter(Boolean);
  const subInfo = subGenreStr.length ? `Sub-influences: ${subGenreStr.join(", ")}` : "";
  const excludeStr = excludeTitles.length
    ? `\n- Do NOT include these already-listed songs: ${excludeTitles.slice(0, 20).join(", ")}.`
    : "";

  const japaneseSeed = isJapanese(seed.title) || isJapanese(seed.artist);
  const langRule = japaneseSeed
    ? "- Output title and artist fields in Japanese (use Japanese characters — kanji/kana — not romaji). Japanese songs should have Japanese titles."
    : "- Output title and artist fields in English (use Latin alphabet).";

  return `You are a DJ and music expert.

TASK: Output a JSON array of EXACTLY ${count} songs that a DJ could mix with "${seed.title}" by ${seed.artist}.

Seed info — Genre: ${genres}. BPM≈${seed.bpm || "?"}, Era: ${seed.release_year || "?"}.${subInfo ? " " + subInfo : ""}

CRITICAL RULES (violations are not acceptable):
1. The JSON array MUST contain EXACTLY ${count} elements. Count to ${count} before finishing.
2. If close genre matches run out, WIDEN the search — same era, adjacent genres, similar BPM. NEVER output fewer than ${count} entries.
3. Exclude the seed song itself.${excludeStr}
4. EXCLUDE karaoke, カラオケ, cover versions, tribute recordings, instrumental covers, BGM collections, sound-alike tracks. Only original artist recordings.
5. ${langRule}
6. Every object must have ALL fields — do not omit any field or output partial objects.

OUTPUT FORMAT: A raw JSON array only. No markdown fences, no explanation, no text before or after the array.
Array length must be ${count}. Start with [ and end with ].

Each element: {"title":"...","artist":"...","bpm":128,"key":"F# minor","camelot":"2A","energy":0.7,"danceability":0.8,"is_vocal":true,"genre_tags":["House"],"release_year":2005,"confidence":"high"}

REMEMBER: ${count} songs total. Output all ${count} now.`;
}

async function fetchSuggestions(
  apiKey: string,
  prompt: string
): Promise<{ suggestions: TrackSuggestion[]; error?: string }> {
  const result = await geminiPost(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 4096 },
  });
  if (!result || !result.__ok || result.__data?.error) {
    return { suggestions: [], error: `HTTP ${result?.__status}: ${JSON.stringify(result?.__data?.error ?? result?.__data)}` };
  }
  const text = extractText(result.__data);
  let parsed: any[];
  try {
    parsed = parseJson(text);
    if (!Array.isArray(parsed)) return { suggestions: [], error: `JSONパース失敗: ${text.slice(0, 200)}` };
  } catch {
    return { suggestions: [], error: `JSONパース失敗: ${text.slice(0, 200)}` };
  }

  const suggestions = parsed
    .map((m: any) => {
      if (!m.title || !m.artist) return null;
      // カラオケ・カバーをコード側でも除外
      if (isKaraokeOrCover(String(m.title), String(m.artist))) return null;
      const meta = (() => { try { return sanitize(m); } catch { return null; } })();
      return { title: String(m.title), artist: String(m.artist), ...meta };
    })
    .filter(Boolean) as TrackSuggestion[];

  return { suggestions };
}

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
): Promise<SimilarResult> {
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
    return { suggestions: mockSongs.slice(0, count).map((s) => ({ ...s, ...mockMetadata(s.title) })) };
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { suggestions: [], error: "GEMINI_API_KEY not set" };

  try {
    // Deezerミス・カラオケフィルター分を見越して多めにリクエスト
    const buffered = Math.min(Math.ceil(count * 1.5), 50);

    // 1回目（バッファ込みで多めに取得）
    const prompt1 = buildSimilarPrompt(seed, subSeeds, buffered);
    const first = await fetchSuggestions(apiKey, prompt1);
    if (first.error) return first;

    let suggestions = first.suggestions;

    // 不足分を再リクエスト（最大2回）
    for (let retry = 0; retry < 2 && suggestions.length < buffered; retry++) {
      const need = buffered - suggestions.length;
      const alreadyHave = suggestions.map((s) => `"${s.title}" by ${s.artist}`);
      const promptN = buildSimilarPrompt(seed, subSeeds, need, alreadyHave);
      const next = await fetchSuggestions(apiKey, promptN);
      if (next.error || next.suggestions.length === 0) break;
      suggestions = [...suggestions, ...next.suggestions];
    }

    return { suggestions };
  } catch (e) {
    return { suggestions: [], error: String(e) };
  }
}
