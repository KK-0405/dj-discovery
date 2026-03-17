"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { type Track, type Mode, type SavedPlaylist, type SimilarFilters } from "@/types";
import SearchPanel from "@/components/SearchPanel";
import SeedPanel from "@/components/SeedPanel";
import PlaylistPanel from "@/components/PlaylistPanel";

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
  const [filters, setFilters] = useState<SimilarFilters>({ bpmRange: null, sameArtist: false });
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("DJ Discovery Playlist");

  const search = async () => {
    if (!query) return;
    setLoading(true);
    setMode("search");
    setSimilarTracks([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch (e) {
      setTracks([]);
    }
    setLoading(false);
  };

  const exploreSimilar = async () => {
    if (!mainSeed) return;
    setLoading(true);
    setMode("similar");
    try {
      const artist = mainSeed.artists[0].name;
      const track = mainSeed.name;
      const res = await fetch(
        `/api/similar?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
      );
      const data = await res.json();
      setSimilarTracks(data.tracks ?? []);
    } catch (e) {
      setSimilarTracks([]);
    }
    setLoading(false);
  };

  const exportToYouTube = async (existingPlaylistId: string | null) => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/youtube/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: playlistName,
        tracks: playlist,
        existingPlaylistId,
      }),
    });
    const data = await res.json();
    if (data.url) {
      window.open(data.url, "_blank");
    } else {
      alert("エラーが発生しました");
    }
  };

  const savePlaylist = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playlistName, tracks: playlist }),
    });
    const data = await res.json();
    if (data.playlist) {
      alert("プレイリストを保存しました！");
      loadPlaylists();
    }
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

  const setAsMainSeed = (track: Track) => setMainSeed(track);

  const addToSubSeed = (track: Track) => {
    if (subSeeds.find((t) => t.id === track.id)) return;
    if (mainSeed?.id === track.id) return;
    setSubSeeds([...subSeeds, track]);
  };

  const removeSubSeed = (id: string) => setSubSeeds(subSeeds.filter((t) => t.id !== id));

  const addToPlaylist = (track: Track) => {
    if (playlist.find((t) => t.id === track.id)) return;
    setPlaylist([...playlist, track]);
  };

  const removeFromPlaylist = (id: string) => setPlaylist(playlist.filter((t) => t.id !== id));

  const isInPlaylist = (track: Track) => !!playlist.find((t) => t.id === track.id);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const filteredSimilar = similarTracks.filter((track) => {
    if (filters.bpmRange && mainSeed?.bpm) {
      if (Math.abs(track.bpm - mainSeed.bpm) > filters.bpmRange) return false;
    }
    if (filters.sameArtist && mainSeed) {
      if (track.artists[0]?.name !== mainSeed.artists[0]?.name) return false;
    }
    return true;
  });

  const displayTracks = mode === "similar" ? filteredSimilar : tracks;

  useEffect(() => {
    loadPlaylists();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", fontFamily: "sans-serif", color: "#fff" }}>

      {/* サイドバートグルボタン（常時表示） */}
      <div style={{ width: "48px", background: "#0a0a0a", borderRight: "0.5px solid #333", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "1rem", gap: "8px", flexShrink: 0 }}>
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

      {/* サイドバー（開閉） */}
      {sidebarOpen && (
        <div style={{ width: "200px", background: "#0a0a0a", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "4px", borderRight: "0.5px solid #333", flexShrink: 0 }}>
          <div style={{ fontSize: "16px", fontWeight: 500, color: "#fff", marginBottom: "1.5rem", paddingLeft: "8px" }}>DJ Discovery</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#1db954", color: "#fff", fontSize: "13px", fontWeight: 500 }}>Search</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Discovery Graph</div>
          <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Playlist Builder</div>
          <div style={{ marginTop: "auto", paddingTop: "12px" }}>
            {session && (
              <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
                {session.user?.email}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 検索パネル */}
      <SearchPanel
        query={query}
        setQuery={setQuery}
        search={search}
        loading={loading}
        mode={mode}
        displayTracks={displayTracks}
        mainSeed={mainSeed}
        subSeeds={subSeeds}
        setAsMainSeed={setAsMainSeed}
        addToSubSeed={addToSubSeed}
        addToPlaylist={addToPlaylist}
        isInPlaylist={isInPlaylist}
        filteredSimilarCount={filteredSimilar.length}
      />

      {/* 右パネル */}
      <div style={{ width: "240px", background: "#0d0d0d", borderLeft: "0.5px solid #333", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>
        <SeedPanel
          mainSeed={mainSeed}
          setMainSeed={setMainSeed}
          subSeeds={subSeeds}
          removeSubSeed={removeSubSeed}
          exploreSimilar={exploreSimilar}
          filters={filters}
          setFilters={setFilters}
        />
        <div style={{ borderTop: "0.5px solid #333" }} />
        <PlaylistPanel
          session={session}
          playlist={playlist}
          removeFromPlaylist={removeFromPlaylist}
          savedPlaylists={savedPlaylists}
          playlistName={playlistName}
          setPlaylistName={setPlaylistName}
          savePlaylist={savePlaylist}
          deletePlaylist={deletePlaylist}
          setPlaylist={setPlaylist}
          exportToYouTube={exportToYouTube}
        />
      </div>

    </div>
  );
}