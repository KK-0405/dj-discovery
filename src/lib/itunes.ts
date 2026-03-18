import { type Track } from "@/lib/deezer";

function mapItunesTrack(t: any): Track {
  const artwork = (t.artworkUrl100 as string | undefined)?.replace("100x100bb", "300x300bb") ?? "";
  return {
    id: `it_${t.trackId}`,
    name: t.trackName ?? "",
    artists: [{ name: t.artistName ?? "" }],
    album: {
      name: t.collectionName ?? "",
      images: artwork ? [{ url: artwork }] : [],
    },
    duration_ms: t.trackTimeMillis ?? 0,
    bpm: 0,
    key: "",
    url: t.trackViewUrl ?? "",
    preview: t.previewUrl ?? undefined,
    release_year: t.releaseDate ? parseInt(t.releaseDate.slice(0, 4)) : undefined,
  };
}

async function fetchDeezerBpm(title: string, artist: string): Promise<number> {
  try {
    const q = encodeURIComponent(`${title} ${artist}`);
    const res = await fetch(`https://api.deezer.com/search?q=${q}&limit=1`);
    const data = (await res.json()) as any;
    const hit = data?.data?.[0];
    if (!hit?.id) return 0;
    if (hit.bpm) return Math.round(hit.bpm);
    const detail = await fetch(`https://api.deezer.com/track/${hit.id}`);
    const d = (await detail.json()) as any;
    return d?.bpm ? Math.round(d.bpm) : 0;
  } catch {
    return 0;
  }
}

function isJapanese(text: string): boolean {
  return /[\u3040-\u30FF\u4E00-\u9FFF]/.test(text);
}

async function itunesSearch(term: string, attribute: string, locale: string, limit: number): Promise<Track[]> {
  try {
    const encoded = encodeURIComponent(term);
    const attrParam = attribute ? `&attribute=${attribute}` : "";
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encoded}&media=music&entity=song&${locale}&limit=${limit}${attrParam}`
    );
    const data = (await res.json()) as any;
    return (data?.results ?? []).filter((t: any) => t.trackId).map(mapItunesTrack);
  } catch {
    return [];
  }
}

export type ArtistSuggestion = {
  id: string;
  name: string;
  genre?: string;
};

export async function searchArtists(query: string): Promise<ArtistSuggestion[]> {
  const locale = isJapanese(query) ? "country=JP&lang=ja_jp" : "country=US&lang=en_us";
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=musicArtist&${locale}&limit=4`
    );
    const data = (await res.json()) as any;
    return (data?.results ?? [])
      .filter((r: any) => r.artistId && r.artistName)
      .map((r: any) => ({
        id: `artist_${r.artistId}`,
        name: r.artistName as string,
        genre: r.primaryGenreName as string | undefined,
      }));
  } catch {
    return [];
  }
}

export async function searchTracks(query: string): Promise<Track[]> {
  const locale = isJapanese(query) ? "country=JP&lang=ja_jp" : "country=US&lang=en_us";

  // 3種類で並列検索：全体・アーティスト名・曲名
  const [byTerm, byArtist, bySong] = await Promise.all([
    itunesSearch(query, "", locale, 20),
    itunesSearch(query, "artistTerm", locale, 10),
    itunesSearch(query, "songTerm", locale, 10),
  ]);

  // 重複排除（id基準）してマージ
  const seen = new Set<string>();
  const tracks: Track[] = [];
  for (const t of [...byTerm, byArtist[0], bySong[0], ...byArtist.slice(1), ...bySong.slice(1)].filter(Boolean) as Track[]) {
    if (!seen.has(t.id)) { seen.add(t.id); tracks.push(t); }
  }
  tracks.splice(25);

  const enriched = await Promise.all(
    tracks.map(async (track) => {
      const bpm = await fetchDeezerBpm(track.name, track.artists[0]?.name ?? "");
      return bpm ? { ...track, bpm } : track;
    })
  );

  return enriched;
}
