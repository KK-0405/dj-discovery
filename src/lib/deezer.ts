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
  reason?: string;
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


export async function searchTracks(query: string): Promise<Track[]> {
  const encoded = encodeURIComponent(query);
  const res = await fetch(
    `https://api.deezer.com/search?q=${encoded}&limit=50&order=RELEVANCE`
  );
  const data = (await res.json()) as any;
  const tracks: Track[] = (data?.data ?? []).map(mapTrack);

  // クエリの単語が曲名・アーティスト名に含まれるものを上位に
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(Boolean);
  const sorted = tracks.sort((a, b) => relevanceScore(b, words, lowerQuery) - relevanceScore(a, words, lowerQuery));

  // Deezerの個別トラックエンドポイントからBPMを並列取得
  const withBpm = await Promise.all(
    sorted.map(async (track) => {
      if (track.bpm) return track; // 既にBPMあり
      try {
        const r = await fetch(`https://api.deezer.com/track/${track.id}`);
        const d = (await r.json()) as any;
        if (d?.bpm) return { ...track, bpm: Math.round(d.bpm) };
      } catch { /* ignore */ }
      return track;
    })
  );

  return withBpm;
}

function relevanceScore(track: Track, words: string[], fullQuery: string): number {
  const title = track.name.toLowerCase();
  const artist = (track.artists[0]?.name ?? "").toLowerCase();
  let score = 0;
  // 完全一致が最高点
  if (title === fullQuery) score += 100;
  if (artist === fullQuery) score += 50;
  // 前方一致
  if (title.startsWith(fullQuery)) score += 40;
  if (artist.startsWith(fullQuery)) score += 20;
  // 部分一致（各ワード）
  for (const w of words) {
    if (title.includes(w)) score += 10;
    if (artist.includes(w)) score += 5;
  }
  return score;
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
