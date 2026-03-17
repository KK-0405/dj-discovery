export type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  bpm: number;
  key: string;
  url: string;
  preview?: string;
  // Gemini metadata (populated after analysis)
  camelot?: string;
  energy?: number;
  danceability?: number;
  is_vocal?: boolean;
  genre_tags?: string[];
  release_year?: number;
};

function mapTrack(t: any): Track {
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

async function fetchBpm(trackId: string, artist: string, title: string): Promise<number> {
  try {
    const res = await fetch(`https://api.deezer.com/track/${trackId}`);
    const data = (await res.json()) as any;
    if (data?.bpm) return Math.round(data.bpm);
  } catch { /* fall through */ }

  const apiKey = process.env.GETSONGBPM_API_KEY;
  if (!apiKey) return 0;
  try {
    const query = encodeURIComponent(`${artist} ${title}`);
    const searchRes = await fetch(
      `https://api.getsongbpm.com/search/?api_key=${apiKey}&type=song&lookup=${query}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://getsongbpm.com/",
        },
      }
    );
    if (!searchRes.ok) return 0;
    const searchData = (await searchRes.json()) as any;
    const songId = searchData?.search?.[0]?.song_id;
    if (!songId) return 0;

    const songRes = await fetch(
      `https://api.getsongbpm.com/song/?api_key=${apiKey}&id=${songId}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json",
          "Referer": "https://getsongbpm.com/",
        },
      }
    );
    if (!songRes.ok) return 0;
    const songData = (await songRes.json()) as any;
    return songData?.song?.tempo ? Math.round(Number(songData.song.tempo)) : 0;
  } catch {
    return 0;
  }
}

export async function searchTracks(query: string): Promise<Track[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=50`
  );
  const data = (await res.json()) as any;
  return (data?.data ?? []).map(mapTrack);
}

export async function getSimilarTracks(artist: string, track: string, limit = 50): Promise<Track[]> {
  const searchRes = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(`${track} ${artist}`)}&limit=1`
  );
  const searchData = (await searchRes.json()) as any;
  const seed = searchData?.data?.[0];
  if (!seed) return [];

  const artistId = seed.artist?.id;
  if (!artistId) return [];

  const radioRes = await fetch(
    `https://api.deezer.com/artist/${artistId}/radio?limit=${limit}`
  );
  const radioData = (await radioRes.json()) as any;
  const tracks: any[] = radioData?.data ?? [];

  return tracks.map((t) => mapTrack(t));
}
