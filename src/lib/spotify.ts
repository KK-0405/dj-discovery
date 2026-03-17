const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET!;

// SpotifyはHTTPS直接接続（プロキシ経由だとブロックされる）
const fetchWithProxy = (url: string, init?: RequestInit) => fetch(url, init);

// アクセストークンのキャッシュ
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) return cachedToken;

  const res = await fetchWithProxy("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  const data = (await res.json()) as any;
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedToken!;
}

const KEY_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function formatKey(key: number, mode: number): string {
  if (key === -1) return "";
  return `${KEY_NAMES[key]}${mode === 0 ? "m" : ""}`;
}

export type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  bpm: number;
  key: string;
  url: string;
};

export async function searchTracks(query: string): Promise<Track[]> {
  const token = await getAccessToken();

  const res = await fetchWithProxy(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const data = (await res.json()) as any;
  const items = data?.tracks?.items ?? [];

  if (items.length === 0) return [];

  // BPM・キーをバッチ取得
  const ids = items.map((t: any) => t.id).join(",");
  const featRes = await fetchWithProxy(
    `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const featData = (await featRes.json()) as any;
  const features = featData?.audio_features ?? [];

  return items.map((t: any, i: number) => {
    const feat = features[i];
    return {
      id: t.id,
      name: t.name,
      artists: t.artists.map((a: any) => ({ name: a.name })),
      album: {
        name: t.album.name,
        images: t.album.images,
      },
      duration_ms: t.duration_ms,
      bpm: feat ? Math.round(feat.tempo) : 0,
      key: feat ? formatKey(feat.key, feat.mode) : "",
      url: t.external_urls.spotify,
    };
  });
}

export async function getSimilarTracks(artist: string, track: string): Promise<Track[]> {
  const token = await getAccessToken();

  // まずトラックIDを取得
  const searchRes = await fetchWithProxy(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(`${track} ${artist}`)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const searchData = (await searchRes.json()) as any;
  const seedTrack = searchData?.tracks?.items?.[0];

  if (!seedTrack) return [];

  // レコメンデーション取得
  const recRes = await fetchWithProxy(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seedTrack.id}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  const recData = (await recRes.json()) as any;
  const tracks = recData?.tracks ?? [];

  if (tracks.length === 0) return [];

  // BPM・キーをバッチ取得
  const ids = tracks.map((t: any) => t.id).join(",");
  const featRes = await fetchWithProxy(
    `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const featData = (await featRes.json()) as any;
  const features = featData?.audio_features ?? [];

  return tracks.map((t: any, i: number) => {
    const feat = features[i];
    return {
      id: t.id,
      name: t.name,
      artists: t.artists.map((a: any) => ({ name: a.name })),
      album: {
        name: t.album.name,
        images: t.album.images,
      },
      duration_ms: t.duration_ms,
      bpm: feat ? Math.round(feat.tempo) : 0,
      key: feat ? formatKey(feat.key, feat.mode) : "",
      url: t.external_urls.spotify,
    };
  });
}
