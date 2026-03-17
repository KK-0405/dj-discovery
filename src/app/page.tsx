"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { type Track, type Mode, type SavedPlaylist, type SimilarFilters } from "@/types";
import SearchPanel from "@/components/SearchPanel";
import SeedPanel from "@/components/SeedPanel";
import PlaylistPanel from "@/components/PlaylistPanel";

const DEFAULT_FILTERS: SimilarFilters = {
  bpmRange: null,
  sameKey: false,
  camelotAdjacent: false,
  genreMatch: false,
  energyLevel: null,
  danceabilityHigh: false,
  sameArtist: false,
  decade: null,
  vocalType: null,
};

export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainSeed, setMainSeed] = useState<Track | null>(null);
  const [subSeeds, setSubSeeds] = useState<Track[]>([]);
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [mode, setMode] = useState<Mode>("search");
  const [filters, setFilters] = useState<SimilarFilters>(DEFAULT_FILTERS);
  const [similarCount, setSimilarCount] = useState<10 | 20 | 30>(20);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [seedAnalyzing, setSeedAnalyzing] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("DJ Discovery Playlist");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    setMode("search");
    setSimilarTracks([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch {
      setTracks([]);
    }
    setLoading(false);
  };

  const fetchGeminiMetadata = async (trackList: Track[], seed: Track | null) => {
    setMetadataLoading(true);
    try {
      // シード曲も含めてメタデータ取得
      const targets = seed ? [seed, ...trackList] : trackList;
      const res = await fetch("/api/track-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: targets.map((t) => ({
            id: t.id,
            title: t.name,
            artist: t.artists[0]?.name ?? "",
            preview: t.preview,
          })),
        }),
      });
      const data = await res.json();
      const metadata: (any | null)[] = data.metadata ?? [];

      // シード曲のメタデータを更新
      if (seed && metadata[0]) {
        const m = metadata[0];
        setMainSeed((prev) =>
          prev ? {
            ...prev,
            key: m.key || prev.key,
            camelot: m.camelot,
            energy: m.energy,
            danceability: m.danceability,
            is_vocal: m.is_vocal,
            genre_tags: m.genre_tags,
            release_year: m.release_year,
            bpm: prev.bpm || m.bpm,
          } : prev
        );
      }

      // 類似曲のメタデータを更新
      const trackMetadata = seed ? metadata.slice(1) : metadata;
      setSimilarTracks((prev) =>
        prev.map((track, i) => {
          const m = trackMetadata[i];
          if (!m) return track;
          return {
            ...track,
            key: m.key || track.key,
            camelot: m.camelot,
            energy: m.energy,
            danceability: m.danceability,
            is_vocal: m.is_vocal,
            genre_tags: m.genre_tags,
            release_year: m.release_year,
            bpm: track.bpm || m.bpm,
          };
        })
      );
    } catch {
      // ignore
    }
    setMetadataLoading(false);
  };

  const exploreSimilar = async () => {
    if (!mainSeed) return;
    setLoading(true);
    setMode("similar");
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seed: {
            title: mainSeed.name,
            artist: mainSeed.artists[0]?.name ?? "",
            genre_tags: mainSeed.genre_tags,
            bpm: mainSeed.bpm,
            camelot: mainSeed.camelot,
            energy: mainSeed.energy,
            danceability: mainSeed.danceability,
            is_vocal: mainSeed.is_vocal,
            release_year: mainSeed.release_year,
          },
          subSeeds: subSeeds.map((t) => ({
            title: t.name,
            artist: t.artists[0]?.name ?? "",
            genre_tags: t.genre_tags,
          })),
          count: similarCount,
        }),
      });
      const data = await res.json();
      const fetched: Track[] = data.tracks ?? [];
      setSimilarTracks(fetched);
    } catch {
      setSimilarTracks([]);
    }
    setLoading(false);
  };

  const exportToYouTube = async (existingPlaylistId: string | null) => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/youtube/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: playlistName, tracks: playlist, existingPlaylistId }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    else alert("エラーが発生しました");
  };

  const savePlaylist = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playlistName, tracks: playlist }),
    });
    const data = await res.json();
    if (data.playlist) { alert("プレイリストを保存しました！"); loadPlaylists(); }
  };

  const loadPlaylists = async () => {
    const res = await fetch("/api/playlist");
    const data = await res.json();
    setSavedPlaylists(data.playlists ?? []);
  };

  const deletePlaylist = async (id: string) => {
    await fetch("/api/playlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadPlaylists();
  };

  const analyzeSeed = async (track: Track) => {
    setSeedAnalyzing(true);
    try {
      const res = await fetch("/api/track-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: [{ id: track.id, title: track.name, artist: track.artists[0]?.name ?? "", preview: track.preview }],
        }),
      });
      const data = await res.json();
      const m = data.metadata?.[0];
      if (m) {
        setMainSeed((prev) => prev ? {
          ...prev,
          key: m.key || prev.key,
          camelot: m.camelot,
          energy: m.energy,
          danceability: m.danceability,
          is_vocal: m.is_vocal,
          genre_tags: m.genre_tags,
          release_year: prev.release_year || m.release_year,
          bpm: prev.bpm || m.bpm,
        } : prev);
      }
    } catch { /* ignore */ }
    setSeedAnalyzing(false);
  };

  const setAsMainSeed = (track: Track) => {
    setMainSeed(track);
    analyzeSeed(track);
  };
  const addToSubSeed = async (track: Track) => {
    if (subSeeds.find((t) => t.id === track.id)) return;
    if (mainSeed?.id === track.id) return;
    setSubSeeds((prev) => [...prev, track]);
    try {
      const res = await fetch("/api/track-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tracks: [{ id: track.id, title: track.name, artist: track.artists[0]?.name ?? "", preview: track.preview }],
        }),
      });
      const data = await res.json();
      const m = data.metadata?.[0];
      if (m) {
        setSubSeeds((prev) => prev.map((t) => t.id === track.id ? {
          ...t,
          genre_tags: m.genre_tags,
          energy: m.energy,
          danceability: m.danceability,
          is_vocal: m.is_vocal,
          camelot: m.camelot,
          bpm: t.bpm || m.bpm,
          release_year: m.release_year,
        } : t));
      }
    } catch { /* ignore */ }
  };
  const removeSubSeed = (id: string) => setSubSeeds(subSeeds.filter((t) => t.id !== id));
  const addToPlaylist = (track: Track) => {
    if (playlist.find((t) => t.id === track.id)) return;
    setPlaylist([...playlist, track]);
  };
  const removeFromPlaylist = (id: string) => setPlaylist(playlist.filter((t) => t.id !== id));
  const isInPlaylist = (track: Track) => !!playlist.find((t) => t.id === track.id);

  const filteredSimilar = similarTracks.filter((track) => {
    // BPM範囲
    if (filters.bpmRange && mainSeed?.bpm && track.bpm) {
      if (Math.abs(track.bpm - mainSeed.bpm) > filters.bpmRange) return false;
    }
    // 同じアーティスト
    if (filters.sameArtist && mainSeed) {
      if (track.artists[0]?.name !== mainSeed.artists[0]?.name) return false;
    }
    // 同じキー
    if (filters.sameKey && mainSeed?.key && track.key) {
      if (track.key !== mainSeed.key) return false;
    }
    // Camelot隣接（同じ or ±1）
    if (filters.camelotAdjacent && mainSeed?.camelot && track.camelot) {
      if (!isCamelotAdjacent(mainSeed.camelot, track.camelot)) return false;
    }
    // ジャンル一致
    if (filters.genreMatch && mainSeed?.genre_tags?.length && track.genre_tags?.length) {
      const seedGenres = new Set(mainSeed.genre_tags.map((g) => g.toLowerCase()));
      if (!track.genre_tags.some((g) => seedGenres.has(g.toLowerCase()))) return false;
    }
    // エネルギーレベル
    if (filters.energyLevel && track.energy !== undefined) {
      const e = track.energy;
      if (filters.energyLevel === "high" && e < 0.7) return false;
      if (filters.energyLevel === "medium" && (e < 0.4 || e >= 0.7)) return false;
      if (filters.energyLevel === "low" && e >= 0.4) return false;
    }
    // ダンサビリティ
    if (filters.danceabilityHigh && track.danceability !== undefined) {
      if (track.danceability < 0.6) return false;
    }
    // ボーカル
    if (filters.vocalType && track.is_vocal !== undefined) {
      if (filters.vocalType === "vocal" && !track.is_vocal) return false;
      if (filters.vocalType === "instrumental" && track.is_vocal) return false;
    }
    // リリース年代
    if (filters.decade && track.release_year) {
      const decade = `${Math.floor(track.release_year / 10) * 10}s`;
      if (decade !== filters.decade) return false;
    }
    return true;
  });

  const displayTracks = mode === "similar" ? filteredSimilar : tracks;

  useEffect(() => { loadPlaylists(); }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", fontFamily: "sans-serif", color: "#fff" }}>

      {/* サイドバートグル */}
      <div style={{ width: "48px", background: "#0a0a0a", borderRight: "0.5px solid #333", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1rem", flexShrink: 0 }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          title="メニュー"
          style={{ width: "32px", height: "32px", background: "transparent", border: "none", color: "#888", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", borderRadius: "6px", padding: 0 }}
        >
          <span style={{ display: "block", width: "16px", height: "1.5px", background: "currentColor" }} />
          <span style={{ display: "block", width: "16px", height: "1.5px", background: "currentColor" }} />
          <span style={{ display: "block", width: "16px", height: "1.5px", background: "currentColor" }} />
        </button>
      </div>

      {sidebarOpen && (
        <div style={{ width: "200px", background: "#0a0a0a", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "4px", borderRight: "0.5px solid #333", flexShrink: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#fff", marginBottom: "1.5rem", paddingLeft: "8px" }}>DJ Discovery</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#1db954", color: "#fff", fontSize: "13px", fontWeight: 500 }}>Search</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Discovery Graph</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Playlist Builder</div>
          <div style={{ marginTop: "auto" }}>
            {session && <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>{session.user?.email}</div>}
          </div>
        </div>
      )}

      <SearchPanel
        query={query} setQuery={setQuery} search={search} loading={loading}
        mode={mode} displayTracks={displayTracks} mainSeed={mainSeed}
        subSeeds={subSeeds} setAsMainSeed={setAsMainSeed} addToSubSeed={addToSubSeed}
        addToPlaylist={addToPlaylist} isInPlaylist={isInPlaylist}
        filteredSimilarCount={filteredSimilar.length} metadataLoading={metadataLoading}
      />

      <div style={{ width: "240px", background: "#0d0d0d", borderLeft: "0.5px solid #333", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
        <SeedPanel
          mainSeed={mainSeed} setMainSeed={setMainSeed}
          subSeeds={subSeeds} removeSubSeed={removeSubSeed}
          exploreSimilar={exploreSimilar}
          filters={filters} setFilters={setFilters}
          similarCount={similarCount} setSimilarCount={setSimilarCount}
          seedAnalyzing={seedAnalyzing}
        />
        <div style={{ borderTop: "0.5px solid #333" }} />
        <PlaylistPanel
          session={session} playlist={playlist} removeFromPlaylist={removeFromPlaylist}
          savedPlaylists={savedPlaylists} playlistName={playlistName}
          setPlaylistName={setPlaylistName} savePlaylist={savePlaylist}
          deletePlaylist={deletePlaylist} setPlaylist={setPlaylist}
          exportToYouTube={exportToYouTube}
        />
      </div>
    </div>
  );
}

function isCamelotAdjacent(a: string, b: string): boolean {
  if (a === b) return true;
  const parseC = (s: string) => {
    const m = s.match(/^(\d+)([AB])$/);
    if (!m) return null;
    return { n: parseInt(m[1]), t: m[2] };
  };
  const ca = parseC(a), cb = parseC(b);
  if (!ca || !cb) return false;
  // 同じ内/外輪で隣接
  if (ca.t === cb.t) {
    const diff = Math.abs(ca.n - cb.n);
    return diff === 1 || diff === 11;
  }
  // 同じ番号で内/外輪切り替え
  return ca.n === cb.n;
}
