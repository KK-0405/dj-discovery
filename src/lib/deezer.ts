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
  };
}

export async function searchTracks(query: string): Promise<Track[]> {
  const res = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=20`
  );
  const data = (await res.json()) as any;
  const tracks = (data?.data ?? []).map(mapTrack);

  // BPMはsearch APIでは返らないので /track/{id} で補完
  return Promise.all(
    tracks.map(async (track: Track, i: number) => {
      if (track.bpm) return track;
      try {
        const bpmRes = await fetch(`https://api.deezer.com/track/${(data.data as any[])[i].id}`);
        const bpmData = (await bpmRes.json()) as any;
        return { ...track, bpm: bpmData?.bpm ? Math.round(bpmData.bpm) : 0 };
      } catch { return track; }
    })
  );
}

export async function getSimilarTracks(artist: string, track: string): Promise<Track[]> {
  // シード曲を検索してアーティストIDを取得
  const searchRes = await fetch(
    `https://api.deezer.com/search?q=${encodeURIComponent(`${track} ${artist}`)}&limit=1`
  );
  const searchData = (await searchRes.json()) as any;
  const seed = searchData?.data?.[0];
  if (!seed) return [];

  const artistId = seed.artist?.id;
  if (!artistId) return [];

  // アーティストラジオ（類似曲）を取得
  const radioRes = await fetch(
    `https://api.deezer.com/artist/${artistId}/radio?limit=20`
  );
  const radioData = (await radioRes.json()) as any;
  const tracks: any[] = radioData?.data ?? [];

  // BPMがない曲は /track/{id} で補完
  return Promise.all(
    tracks.map(async (t) => {
      let bpm = t.bpm ? Math.round(t.bpm) : 0;
      if (!bpm) {
        try {
          const bpmRes = await fetch(`https://api.deezer.com/track/${t.id}`);
          const bpmData = (await bpmRes.json()) as any;
          bpm = bpmData?.bpm ? Math.round(bpmData.bpm) : 0;
        } catch { /* skip */ }
      }
      return { ...mapTrack(t), bpm };
    })
  );
}
