import { ProxyAgent, fetch as undiciFetch } from "undici";

const API_KEY = process.env.LASTFM_API_KEY!;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const PROXY_URL = process.env.HTTP_PROXY;
const GETSONGBPM_API_KEY = process.env.GETSONGBPM_API_KEY!;

const fetchWithProxy = async (url: string) => {
  if (PROXY_URL) {
    const proxyAgent = new ProxyAgent(PROXY_URL);
    return undiciFetch(url, { dispatcher: proxyAgent });
  }
  return fetch(url);
};

async function getBpmAndKey(artist: string, track: string): Promise<{ bpm: number; key: string }> {
  try {
    const res = await fetchWithProxy(
      `https://api.getsongbpm.com/search/?api_key=${GETSONGBPM_API_KEY}&type=both&lookup=song:${encodeURIComponent(track)}+artist:${encodeURIComponent(artist)}`
    );
    const data = await res.json() as any;
    const song = data.search?.[0];
    if (!song) return { bpm: 0, key: "" };
    const bpm = Math.round(parseFloat(song.tempo)) || 0;
    const key = song.key_of || "";
    return { bpm, key };
  } catch {
    return { bpm: 0, key: "" };
  }
}

async function getItunesArtwork(artist: string, track: string): Promise<string | null> {
  try {
    const res = await fetchWithProxy(
      `https://itunes.apple.com/search?term=${encodeURIComponent(`${artist} ${track}`)}&media=music&limit=1`
    );
    const data = await res.json() as any;
    const artwork = data.results?.[0]?.artworkUrl100;
    return artwork ? artwork.replace("100x100", "300x300") : null;
  } catch {
    return null;
  }
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
  const res = await fetchWithProxy(
    `${BASE_URL}?method=track.search&track=${encodeURIComponent(query)}&api_key=${API_KEY}&format=json&limit=20`
  );
  const data = await res.json() as any;
  const tracks = data.results?.trackmatches?.track ?? [];

  return Promise.all(tracks.map(async (t: any, i: number) => {
    try {
      const infoRes = await fetchWithProxy(
        `${BASE_URL}?method=track.getInfo&artist=${encodeURIComponent(t.artist)}&track=${encodeURIComponent(t.name)}&api_key=${API_KEY}&format=json`
      );
      const infoData = await infoRes.json() as any;
      let imageUrl =
        infoData.track?.album?.image?.[2]?.["#text"] ||
        infoData.track?.album?.image?.[1]?.["#text"] || "";

      if (!imageUrl || imageUrl.includes("2a96cbd8b46e442fc41c2b86b821562f")) {
        imageUrl = await getItunesArtwork(t.artist, t.name) || `https://picsum.photos/seed/${i}/48`;
      }

      const { bpm, key } = await getBpmAndKey(t.artist, t.name);

      return {
        id: t.mbid || `search-${i}-${t.name}-${t.artist}`,
        name: t.name,
        artists: [{ name: t.artist }],
        album: {
          name: infoData.track?.album?.title || "",
          images: [{ url: imageUrl }],
        },
        duration_ms: 0,
        bpm,
        key,
        url: t.url,
      };
    } catch {
      const imageUrl = await getItunesArtwork(t.artist, t.name) || `https://picsum.photos/seed/${i}/48`;
      return {
        id: `search-${i}-${t.name}-${t.artist}`,
        name: t.name,
        artists: [{ name: t.artist }],
        album: {
          name: "",
          images: [{ url: imageUrl }],
        },
        duration_ms: 0,
        bpm: 0,
        key: "",
        url: t.url,
      };
    }
  }));
}

export async function getSimilarTracks(artist: string, track: string): Promise<Track[]> {
  const res = await fetchWithProxy(
    `${BASE_URL}?method=track.getsimilar&artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}&api_key=${API_KEY}&format=json&limit=20`
  );
  const data = await res.json() as any;
  const tracks = data.similartracks?.track ?? [];

  return Promise.all(tracks.map(async (t: any, i: number) => {
    try {
      const infoRes = await fetchWithProxy(
        `${BASE_URL}?method=track.getInfo&artist=${encodeURIComponent(t.artist.name)}&track=${encodeURIComponent(t.name)}&api_key=${API_KEY}&format=json`
      );
      const infoData = await infoRes.json() as any;
      let imageUrl =
        infoData.track?.album?.image?.[2]?.["#text"] ||
        infoData.track?.album?.image?.[1]?.["#text"] || "";

      if (!imageUrl || imageUrl.includes("2a96cbd8b46e442fc41c2b86b821562f")) {
        imageUrl = await getItunesArtwork(t.artist.name, t.name) || `https://picsum.photos/seed/${i}/48`;
      }

      const { bpm, key } = await getBpmAndKey(t.artist.name, t.name);

      return {
        id: t.mbid || `similar-${i}-${t.name}-${t.artist.name}`,
        name: t.name,
        artists: [{ name: t.artist.name }],
        album: {
          name: infoData.track?.album?.title || "",
          images: [{ url: imageUrl }],
        },
        duration_ms: t.duration * 1000 || 0,
        bpm,
        key,
        url: t.url,
      };
    } catch {
      const imageUrl = await getItunesArtwork(t.artist.name, t.name) || `https://picsum.photos/seed/${i}/48`;
      return {
        id: `similar-${i}-${t.name}-${t.artist.name}`,
        name: t.name,
        artists: [{ name: t.artist.name }],
        album: {
          name: "",
          images: [{ url: imageUrl }],
        },
        duration_ms: t.duration * 1000 || 0,
        bpm: 0,
        key: "",
        url: t.url,
      };
    }
  }));
}