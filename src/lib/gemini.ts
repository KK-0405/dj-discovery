export type GeminiMetadata = {
  bpm: number;
  key: string;
  camelot: string;
  energy: number;
  is_vocal: boolean;
  genre_tags: string[];
  release_year: number;
  confidence: "high" | "medium" | "low";
};

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent";
async function geminiPost(apiKey: string, body: object, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${GEMINI_API}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as any;
    // 503/429 は一時的な過負荷 → バックオフして再試行
    if ((res.status === 503 || res.status === 429) && attempt < retries) {
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
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
    is_vocal: typeof m.is_vocal === "boolean" ? m.is_vocal : true,
    genre_tags: Array.isArray(m.genre_tags) ? m.genre_tags.slice(0, 6) : [],
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

Each object: { bpm: integer, key: string (format: "X major" or "X minor", e.g. "E major", "F# minor"), camelot: string, energy: float 0-1, is_vocal: boolean, genre_tags: string[], release_year: integer, confidence: "high"|"medium"|"low" }`;

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

export type TrackSuggestion = { title: string; artist: string; reason?: string } & Partial<GeminiMetadata>;

export type SimilarResult = {
  suggestions: TrackSuggestion[];
  japaneseSeed?: boolean;
  error?: string;
};

/**
 * Gemini にアーティストの出身国・主要市場を問い合わせ、日本圏かどうか返す。
 * テキストの文字種ではなく、レーベル所在地・活動国などの実世界の情報で判断させる。
 */
async function detectArtistOrigin(
  apiKey: string,
  artist: string,
  title: string,
): Promise<boolean> {
  const prompt = `Is the artist "${artist}" (known for the song "${title}") a Japanese artist?

Judge based on the artist's ACTUAL nationality, record label country, and primary music market — NOT by how their name is written.
Examples:
- "クイーン" is Queen, a British band → NOT Japanese
- "RADWIMPS" is a Japanese band → IS Japanese
- "YOASOBI" is a Japanese duo → IS Japanese
- "Daft Punk" is French → NOT Japanese

Reply with ONLY this JSON (no other text): {"is_japanese":true} or {"is_japanese":false}`;

  try {
    const result = await geminiPost(apiKey, {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 20 },
    });
    if (!result?.__ok) return isJapaneseContext(title, artist);
    const text = extractText(result.__data);
    const parsed = parseJson(text);
    if (typeof parsed?.is_japanese === "boolean") return parsed.is_japanese;
  } catch { /* ignore */ }
  // フォールバック: テキスト解析
  return isJapaneseContext(title, artist);
}

export function isJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
}

// ひらがな・漢字を含む = 強い日本語指標（カタカナのみは外来語表記の可能性があるため弱い指標）
function hasStrongJapanese(text: string): boolean {
  return /[\u3040-\u309F\u4E00-\u9FAF]/.test(text);
}

const JAPANESE_GENRE_RE = /j-?pop|j-?rock|j-?indie|j-?r&b|japanese|anime|vocaloid|city.?pop|ボカロ|邦楽/i;

export function isJapaneseContext(title: string, artist: string, genre_tags?: string[]): boolean {
  // ひらがな・漢字がタイトルにある → 確実に日本語コンテンツ
  if (hasStrongJapanese(title)) return true;
  // ジャンルタグで日本語音楽と明示されている
  if ((genre_tags ?? []).some((g) => JAPANESE_GENRE_RE.test(g))) return true;
  // ひらがな・漢字がアーティスト名にある → 日本人アーティスト
  if (hasStrongJapanese(artist)) return true;
  // タイトルとアーティスト名の両方がカタカナを含む → 日本語コンテンツの可能性が高い
  // (例: チャットモンチー / シャングリラ)
  // アーティスト名だけカタカナでタイトルが英字 → 外来語表記の可能性が高い
  // (例: クイーン / Bohemian Rhapsody → Queen と判断すべき)
  return isJapanese(artist) && isJapanese(title);
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

// 既知のカラオケ専門アーティスト（アーティスト名で完全排除）
const KARAOKE_ARTISTS = [
  /歌っちゃ王/,
  /うたっちゃ王/,
  /カラオケ?J?P?O?P?/i,
  /歌之王/,
  /カラオケボックス/,
  /JOYSOUND/i,
  /DAM カラオケ/i,
  /Karaoke King/i,
  /Karaoke All Stars/i,
  /Karaoke Playbacks/i,
  /Karaoke Version/i,
  /歌手名/,
];

function isKaraokeOrCover(title: string, artist: string): boolean {
  const combined = `${title} ${artist}`;
  if (KARAOKE_KEYWORDS.some((re) => re.test(combined))) return true;
  if (KARAOKE_ARTISTS.some((re) => re.test(artist))) return true;
  return false;
}

function buildSimilarPrompt(
  seed: { title: string; artist: string; genre_tags?: string[]; bpm?: number; camelot?: string; energy?: number; release_year?: number },
  subSeeds: { title: string; artist: string; genre_tags?: string[] }[],
  count: number,
  excludeTitles: string[] = [],
  japaneseSeedOverride?: boolean,
  excludeAnthems?: boolean,
  instruction?: string
): string {
  const genres = seed.genre_tags?.join(", ") || "unknown";
  const subGenreStr = subSeeds.flatMap((s) => s.genre_tags ?? []).filter(Boolean);
  const subInfo = subGenreStr.length ? `Sub-influences: ${subGenreStr.join(", ")}` : "";
  const excludeStr = excludeTitles.length
    ? `\n- Do NOT include these already-listed songs: ${excludeTitles.slice(0, 20).join(", ")}.`
    : "";

  const japaneseSeed = japaneseSeedOverride ?? isJapaneseContext(seed.title, seed.artist, seed.genre_tags);

  const katakanaNote = !japaneseSeed
    ? `\nIMPORTANT CONTEXT: The seed artist "${seed.artist}" may be written in Japanese katakana (e.g. "クイーン" = Queen, "ビートルズ" = The Beatles, "マイケル・ジャクソン" = Michael Jackson). Katakana is only a phonetic script used to write foreign names in Japanese — it does NOT make an artist Japanese. Always identify the artist's TRUE nationality and origin, and recommend music based on that.`
    : "";

  const langRule = japaneseSeed
    ? `- ⚠️ LANGUAGE IS JAPANESE. You MUST write title and artist in Japanese script (漢字・ひらがな・カタカナ). Romaji is ABSOLUTELY FORBIDDEN. WRONG: "Yoru ni Kakeru" / CORRECT: "夜に駆ける". Every single title must contain Japanese characters if the song is Japanese.`
    : `- ⚠️ WESTERN/INTERNATIONAL ARTISTS ONLY. The seed is a NON-Japanese, NON-Asian artist (even if their name appears in katakana). You MUST NOT include any Japanese, Korean, Chinese, or other Asian artists. ZERO Japanese songs allowed — not even famous ones. Artists like YOASOBI, Ado, Kenshi Yonezu, Official HIGE DANdism, BTS, Twice, etc. are STRICTLY FORBIDDEN. Only recommend artists from US, UK, Europe, Latin America, Africa, or Australia.`;

  const territoryRule = japaneseSeed
    ? `- TERRITORY: Japanese music ecosystem. Prioritise Japanese domestic releases. International tracks only if extremely well-known in Japan.`
    : `- TERRITORY: Western/International ONLY (US, UK, Europe, Latin America, Australia, etc.). Zero tolerance for Asian music. If you are tempted to recommend a Japanese or Korean artist — stop and pick a Western alternative instead.`;

  return `You are an expert DJ and music curator with deep knowledge of music history, production, and DJ technique.${katakanaNote}

TASK: Output a JSON array of EXACTLY ${count} songs that a DJ could mix with "${seed.title}" by ${seed.artist}.

Seed info — Genre: ${genres}. BPM≈${seed.bpm || "?"}, Camelot: ${seed.camelot || "?"}, Era: ${seed.release_year || "?"}, Energy: ${seed.energy ?? "?"}.${subInfo ? " " + subInfo : ""}

SELECTION PHILOSOPHY — choose tracks based on OVERALL SIMILARITY, prioritized in this order:
1. GENRE FIDELITY (highest priority): Stay true to the seed's genre(s). If the seed is Hip-Hop, the majority of results MUST be Hip-Hop. If J-Pop, results must be J-Pop. Do NOT drift into adjacent genres unless explicitly needed to fill the count. Genre loyalty overrides all other criteria.
2. LYRICAL & EMOTIONAL THEMES: Match the seed's lyrical subject matter, emotional tone, and narrative mood. If the seed is about anxiety, uncertainty, or the future, prioritize tracks with similar themes. These thematic connections are as important as sonic ones.
3. MUSICAL COMPATIBILITY: Similar BPM (±8 BPM) and matching energy level.
4. PRODUCTION STYLE & ERA: Same production aesthetic, era, cultural context.
- ${excludeAnthems ? "ANTHEM BAN — ABSOLUTE, NON-NEGOTIABLE RULE:\n- HARD EXCLUDE any track with 100 million or more streams/plays on ANY platform (Spotify, YouTube, Apple Music, etc.). Tracks with 1億再生以上 are strictly forbidden.\n- HARD EXCLUDE any track that reached #1 on major national charts (Billboard Hot 100, UK Singles Chart, Oricon, etc.).\n- HARD EXCLUDE any track that won or was nominated for Grammy Record/Song/Album of the Year, or equivalent top-tier global awards.\n- HARD EXCLUDE tracks so widely known they appear in TV commercials, movie trailers, or sports events (e.g. \"Bohemian Rhapsody\", \"Billie Jean\", \"Smells Like Teen Spirit\", \"Shape of You\", \"Blinding Lights\", \"Rolling in the Deep\", \"Uptown Funk\", \"Happy\").\n- YOU MUST ONLY INCLUDE: album deep cuts, B-sides, underground/cult favorites, tracks known primarily to scene insiders and dedicated fans.\n- When in doubt whether a track is too famous — EXCLUDE IT. Aggressively err toward obscurity.\n- Target: 0% mega-hits. 100% hidden gems." : "Include well-known anthems and classics. Aim for roughly 80% well-known hits, 20% deeper cuts."}
- Draw from the same scene, label, producers, collaborators, or regional music community as the seed when relevant.

${instruction ? `\nUSER INSTRUCTION (highest priority — override defaults if needed): ${instruction}\n` : ""}
CRITICAL RULES (violations are not acceptable):
1. Aim for ${count} elements. You MAY return fewer if you cannot find enough genuinely related tracks — quality over quantity. Never pad with unrelated songs just to hit the number.
2. Stay within the seed's genre. Only widen to adjacent genres if you have exhausted the primary genre AND the adjacent genre is musically close (e.g. Hip-Hop → R&B is OK; Hip-Hop → Pop is NOT).
3. Exclude the seed song itself.${excludeStr}
4. EXCLUDE karaoke, カラオケ, cover versions, tribute recordings, instrumental covers, BGM collections, sound-alike tracks. Only original artist recordings. NEVER include artists such as "歌っちゃ王", "Karaoke Version", "Karaoke All Stars", or any karaoke/cover label artist.
5. ${langRule}
6. Every object must have ALL fields — do not omit any field or output partial objects.
7. ${territoryRule}
8. Do NOT pad the list with generic chart hits just to reach ${count}. Every track must have a real musical reason to appear.

OUTPUT FORMAT: A raw JSON array only. No markdown fences, no explanation, no text before or after the array.
Array length must be ${count}. Start with [ and end with ].

Each element: {"title":"...","artist":"...","bpm":128,"key":"F# minor" (always "X major" or "X minor" format),"camelot":"2A","energy":0.7,"is_vocal":true,"genre_tags":["House","Deep House","Nu-Disco","Electronic"],"release_year":2005,"confidence":"high","reason":"..."}

The "genre_tags" field: provide 3–6 specific genre labels that accurately describe this track. Include the primary genre plus subgenres, scene labels, and mood/era descriptors (e.g. ["Techno","Minimal Techno","Detroit Techno","Dark","Rave"]). Be specific — avoid vague labels like "Electronic" or "Music" alone.

The "reason" field: ALWAYS write in Japanese. Write exactly 4–5 sentences (target ~400 chars) covering ALL of the following:
  (1) SIMILARITY: Explain specifically what connects this track to the seed — describe shared qualities in detail (genre, lyrical themes, emotional tone, groove feel, tempo atmosphere, vocal character, production style, era influence, shared genre DNA, etc.). Mention thematic or lyrical connections if they exist. Go beyond generic descriptions.
  (2) TRACK BACKGROUND: Include a notable fact about this track (チャート記録・売上・受賞歴・映画/ドラマ/CMタイアップ・有名サンプリング元・著名アーティストによるカバー etc.). If no major fact is known, give a vivid description of what makes the track special or memorable.
  (3) DJ ADVICE: Add one concrete, practical comment for DJs — e.g. where in a set this track works best, what kind of crowd energy to expect, a transition tip (key change note, BPM feel, energy build/drop), or what to play after it.
  Write as an enthusiastic, knowledgeable DJ friend. Natural Japanese, no stiff phrasing.

REMEMBER: Aim for ${count} songs. Return fewer if needed — never sacrifice relevance to hit the count.`;
}

async function fetchSuggestions(
  apiKey: string,
  prompt: string,
  japaneseSeed: boolean = false
): Promise<{ suggestions: TrackSuggestion[]; error?: string }> {
  const result = await geminiPost(apiKey, {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: 16384 },
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
      // 非日本語シードの場合、日本語文字・日本語ジャンルを含む曲を除外
      if (!japaneseSeed) {
        if (isJapanese(String(m.title)) || isJapanese(String(m.artist))) return null;
        if (Array.isArray(m.genre_tags) && m.genre_tags.some((g: string) => JAPANESE_GENRE_RE.test(String(g)))) return null;
      }
      const meta = (() => { try { return sanitize(m); } catch { return null; } })();
      const reason = typeof m.reason === "string" && m.reason.trim() ? m.reason.trim() : undefined;
      return { title: String(m.title), artist: String(m.artist), reason, ...meta };
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
  count: number,
  excludeTitles: string[] = [],
  excludeAnthems: boolean = false,
  instruction?: string
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
    // isJapaneseContext で楽観的に推測しつつ、detectArtistOrigin と並列実行
    const optimisticJapanese = isJapaneseContext(seed.title, seed.artist, seed.genre_tags);
    const buffered = Math.min(Math.ceil(count * 2), 50);

    const [japaneseSeed, first] = await Promise.all([
      detectArtistOrigin(apiKey, seed.artist, seed.title),
      fetchSuggestions(
        apiKey,
        buildSimilarPrompt(seed, subSeeds, buffered, excludeTitles, optimisticJapanese, excludeAnthems, instruction),
        optimisticJapanese
      ),
    ]);

    if (first.error) return first;

    // 楽観的推測が外れた場合は正しい判定で再取得
    let suggestions = first.suggestions;
    if (japaneseSeed !== optimisticJapanese) {
      const retryPrompt = buildSimilarPrompt(seed, subSeeds, buffered, excludeTitles, japaneseSeed, excludeAnthems, instruction);
      const retried = await fetchSuggestions(apiKey, retryPrompt, japaneseSeed);
      if (!retried.error && retried.suggestions.length > 0) {
        suggestions = retried.suggestions;
      }
    }

    // 不足分を再リクエスト（最大1回）
    if (suggestions.length < buffered) {
      const need = buffered - suggestions.length;
      const alreadyHave = suggestions.map((s) => `"${s.title}" by ${s.artist}`);
      const promptN = buildSimilarPrompt(seed, subSeeds, need, alreadyHave, japaneseSeed, excludeAnthems, instruction);
      const next = await fetchSuggestions(apiKey, promptN, japaneseSeed);
      if (!next.error && next.suggestions.length > 0) {
        suggestions = [...suggestions, ...next.suggestions];
      }
    }

    return { suggestions, japaneseSeed };
  } catch (e) {
    return { suggestions: [], error: String(e) };
  }
}
