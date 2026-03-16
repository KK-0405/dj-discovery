import { ProxyAgent, fetch as undiciFetch } from "undici";

const API_KEY = process.env.LASTFM_API_KEY!;
const BASE_URL = "https://ws.audioscrobbler.com/2.0/";
const PROXY_URL = process.env.HTTP_PROXY;

const fetchWithProxy = async (url: string) => {
  if (PROXY_URL) {
    const proxyAgent = new ProxyAgent(PROXY_URL);
    return undiciFetch(url, { dispatcher: proxyAgent });
  }
  return fetch(url);
};

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

      return {
        id: t.mbid || `${i}-${t.name}`,
        name: t.name,
        artists: [{ name: t.artist }],
        album: {
          name: infoData.track?.album?.title || "",
          images: [{ url: imageUrl }],
        },
        duration_ms: 0,
        bpm: 0,
        key: "",
        url: t.url,
      };
    } catch {
      const imageUrl = await getItunesArtwork(t.artist, t.name) || `https://picsum.photos/seed/${i}/48`;
      return {
        id: t.mbid || `${i}-${t.name}`,
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

      return {
        id: t.mbid || `${i}-${t.name}`,
        name: t.name,
        artists: [{ name: t.artist.name }],
        album: {
          name: infoData.track?.album?.title || "",
          images: [{ url: imageUrl }],
        },
        duration_ms: t.duration * 1000 || 0,
        bpm: 0,
        key: "",
        url: t.url,
      };
    } catch {
      const imageUrl = await getItunesArtwork(t.artist.name, t.name) || `https://picsum.photos/seed/${i}/48`;
      return {
        id: t.mbid || `${i}-${t.name}`,
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