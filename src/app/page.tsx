"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { type Track, type Mode, type SavedPlaylist, type SimilarFilters } from "@/types";
import AuthModal from "@/components/AuthModal";
import SearchPanel from "@/components/SearchPanel";
import SeedPanel from "@/components/SeedPanel";
import PlaylistPanel from "@/components/PlaylistPanel";

const CACHE_KEY = "dj_gemini_v1";
function cacheKey(title: string, artist: string) {
  return `${title}|||${artist}`.toLowerCase();
}
function readCache(): Record<string, any> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}"); } catch { return {}; }
}
function writeCache(cache: Record<string, any>) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota full */ }
}
function applyCache(
  tracks: { id: string; title: string; artist: string }[],
  metadata: (any | null)[]
): { uncachedIndices: number[]; results: (any | null)[] } {
  const cache = readCache();
  const results: (any | null)[] = new Array(tracks.length).fill(null);
  const uncachedIndices: number[] = [];
  tracks.forEach((t, i) => {
    const hit = cache[cacheKey(t.title, t.artist)];
    if (hit) { results[i] = hit; }
    else { uncachedIndices.push(i); }
  });
  const newCache = { ...cache };
  uncachedIndices.forEach((origIdx, pos) => {
    const m = metadata[pos];
    if (m) {
      results[origIdx] = m;
      newCache[cacheKey(tracks[origIdx].title, tracks[origIdx].artist)] = m;
    }
  });
  if (uncachedIndices.length > 0) writeCache(newCache);
  return { uncachedIndices, results };
}

const DEFAULT_FILTERS: SimilarFilters = {
  bpmRange: null,
  sameKey: false,
  camelotAdjacent: false,
  selectedGenres: [],
  energyLevel: null,
  sameArtist: false,
  decade: null,
  excludePlaylist: false,
};

export default function Home() {
  const { session, userProfile, signOut } = useAuth();
  const [query, setQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showUserMenu]);
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
  const [seedError, setSeedError] = useState<string | null>(null);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("Playlist 1");

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
      setSimilarTracks(data.tracks ?? []);
      if (data._debug) setSeedError(String(data._debug));
    } catch (e) {
      setSimilarTracks([]);
      setSeedError(String(e));
    }
    setLoading(false);
  };

  const authHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${session?.access_token ?? ""}`,
  });

  const updateSavedPlaylist = async (id: string, tracks: Track[]) => {
    const res = await fetch("/api/playlist", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id, tracks }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    loadPlaylists();
  };

  const addTrackToSavedPlaylist = async (playlistId: string, track: Track) => {
    const target = savedPlaylists.find((p) => p.id === playlistId);
    if (!target) return;
    if (target.tracks.find((t) => t.id === track.id)) return;
    await updateSavedPlaylist(playlistId, [...target.tracks, track]);
  };

  const savePlaylist = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: playlistName, tracks: playlist }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    if (data.playlist) loadPlaylists();
  };

  const loadPlaylists = async () => {
    if (!session?.access_token) return;
    const res = await fetch("/api/playlist", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setSavedPlaylists(data.playlists ?? []);
  };

  const deletePlaylist = async (id: string) => {
    await fetch("/api/playlist", {
      method: "DELETE",
      headers: authHeaders(),
      body: JSON.stringify({ id }),
    });
    loadPlaylists();
  };

  const togglePublic = async (id: string, isPublic: boolean) => {
    await fetch("/api/playlist", {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify({ id, is_public: isPublic }),
    });
    loadPlaylists();
  };

  const analyzeSeed = async (track: Track) => {
    setSeedAnalyzing(true);
    setSeedError(null);
    const artist = track.artists[0]?.name ?? "";
    const cached = readCache()[cacheKey(track.name, artist)];
    if (cached) {
      setMainSeed((prev) => prev ? { ...prev, bpm: prev.bpm || cached.bpm, key: cached.key || prev.key, camelot: cached.camelot, energy: cached.energy, danceability: cached.danceability, is_vocal: cached.is_vocal, genre_tags: cached.genre_tags, release_year: prev.release_year || cached.release_year } : prev);
      setSeedAnalyzing(false);
      return;
    }
    try {
      const res = await fetch("/api/track-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks: [{ id: track.id, title: track.name, artist }] }),
      });
      const data = await res.json();
      if (data._debug) setSeedError(String(data._debug));
      const m = data.metadata?.[0];
      if (m) {
        writeCache({ ...readCache(), [cacheKey(track.name, artist)]: m });
        setMainSeed((prev) => prev ? { ...prev, bpm: prev.bpm || m.bpm, key: m.key || prev.key, camelot: m.camelot, energy: m.energy, danceability: m.danceability, is_vocal: m.is_vocal, genre_tags: m.genre_tags, release_year: prev.release_year || m.release_year } : prev);
      } else {
        setSeedError((prev) => prev ?? "metadata[0] is null");
      }
    } catch (e) {
      setSeedError(String(e));
    }
    setSeedAnalyzing(false);
  };

  const setAsMainSeed = (track: Track) => { setMainSeed(track); analyzeSeed(track); };
  const addToSubSeed = async (track: Track) => {
    if (subSeeds.find((t) => t.id === track.id) || mainSeed?.id === track.id) return;
    setSubSeeds((prev) => [...prev, track]);
    const artist = track.artists[0]?.name ?? "";
    let m = readCache()[cacheKey(track.name, artist)] ?? null;
    if (!m) {
      try {
        const res = await fetch("/api/track-metadata", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: [{ id: track.id, title: track.name, artist }] }),
        });
        const data = await res.json();
        m = data.metadata?.[0] ?? null;
        if (m) writeCache({ ...readCache(), [cacheKey(track.name, artist)]: m });
      } catch { /* ignore */ }
    }
    if (m) {
      setSubSeeds((prev) => prev.map((t) => t.id === track.id ? { ...t, genre_tags: m.genre_tags, energy: m.energy, danceability: m.danceability, is_vocal: m.is_vocal, camelot: m.camelot, bpm: t.bpm || m.bpm, release_year: m.release_year } : t));
    }
  };
  const removeSubSeed = (id: string) => setSubSeeds(subSeeds.filter((t) => t.id !== id));
  const addToPlaylist = (track: Track) => { if (!playlist.find((t) => t.id === track.id)) setPlaylist([...playlist, track]); };
  const removeFromPlaylist = (id: string) => setPlaylist(playlist.filter((t) => t.id !== id));
  const isInPlaylist = (track: Track) => !!playlist.find((t) => t.id === track.id);

  const availableGenres = Array.from(
    new Set(similarTracks.flatMap((t) => t.genre_tags ?? []).filter(Boolean))
  ).sort();

  useEffect(() => {
    if (similarTracks.length > 0) setFilters((f) => ({ ...f, selectedGenres: [] }));
  }, [similarTracks]);

  const filteredSimilar = similarTracks.filter((track) => {
    if (filters.bpmRange && mainSeed?.bpm && track.bpm && Math.abs(track.bpm - mainSeed.bpm) > filters.bpmRange) return false;
    if (filters.sameArtist && mainSeed && track.artists[0]?.name !== mainSeed.artists[0]?.name) return false;
    if (filters.sameKey && mainSeed?.key && track.key && track.key !== mainSeed.key) return false;
    if (filters.camelotAdjacent && mainSeed?.camelot && track.camelot && !isCamelotAdjacent(mainSeed.camelot, track.camelot)) return false;
    if (filters.selectedGenres.length > 0 && track.genre_tags?.length) {
      const selected = new Set(filters.selectedGenres.map((g) => g.toLowerCase()));
      if (!track.genre_tags.some((g) => selected.has(g.toLowerCase()))) return false;
    }
    if (filters.energyLevel && track.energy !== undefined) {
      const e = track.energy;
      if (filters.energyLevel === "high" && e < 0.7) return false;
      if (filters.energyLevel === "medium" && (e < 0.4 || e >= 0.7)) return false;
      if (filters.energyLevel === "low" && e >= 0.4) return false;
    }
    if (filters.decade && track.release_year) {
      if (`${Math.floor(track.release_year / 10) * 10}s` !== filters.decade) return false;
    }
    if (filters.excludePlaylist && playlist.find((t) => t.id === track.id)) return false;
    return true;
  });

  const displayTracks = mode === "similar" ? filteredSimilar : tracks;

  useEffect(() => { loadPlaylists(); }, [session?.access_token]);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#fff", overflow: "hidden" }}>
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* サイドバー */}
      <div style={{
        width: "200px",
        background: "#f5f5f7",
        borderRight: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* ロゴ */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: 34, height: 34,
              background: "linear-gradient(135deg, #3C3489, #26215C)",
              borderRadius: "9px",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 10px rgba(63,52,137,0.45)",
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="2.2" fill="white" opacity="0.95"/>
                <circle cx="10" cy="10" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/>
                <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1.1" opacity="0.5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.01em" }}>Ripple</div>
              <div style={{ fontSize: "10px", color: "#aeaeb2", marginTop: "1px" }}>Find Your Sound</div>
            </div>
          </div>
        </div>

        {/* ナビ */}
        <nav style={{ padding: "10px 8px", flex: 1 }}>
          <div style={{ fontSize: "10px", color: "#aeaeb2", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 8px 6px" }}>
            Library
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 10px", borderRadius: "8px",
            background: "rgba(83,74,183,0.1)",
          }}>
            <span style={{ fontSize: "15px" }}>🔍</span>
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#534AB7" }}>Search</span>
          </div>

          <div style={{ fontSize: "10px", color: "#aeaeb2", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "12px 8px 6px" }}>
            Playlist
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px",
            padding: "8px 10px", borderRadius: "8px",
            color: "#6e6e73",
          }}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
                <circle cx="4" cy="10" r="2" fill="#6e6e73"/>
                <path d="M 4 7.5 A 2.5 2.5 0 0 1 4 12.5" fill="none" stroke="#6e6e73" strokeWidth="1.8" strokeLinecap="round"/>
                <path d="M 4 4.5 A 5.5 5.5 0 0 1 4 15.5" fill="none" stroke="#6e6e73" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M 4 1.5 A 8.5 8.5 0 0 1 4 18.5" fill="none" stroke="#6e6e73" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            <span style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {playlistName.length > 12 ? playlistName.slice(0, 12) + "…" : playlistName}
            </span>
            {playlist.length > 0 && (
              <span style={{ marginLeft: "auto", background: "#534AB7", color: "#fff", borderRadius: "8px", padding: "1px 6px", fontSize: "10px", fontWeight: 700, flexShrink: 0 }}>
                {playlist.length}
              </span>
            )}
          </div>
        </nav>

        {/* フッター: 認証UI */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
          {session ? (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "8px",
                  padding: "7px 10px", borderRadius: "9px",
                  background: showUserMenu ? "rgba(83,74,183,0.08)" : "none",
                  border: "none", cursor: "pointer",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { if (!showUserMenu) e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                onMouseLeave={(e) => { if (!showUserMenu) e.currentTarget.style.background = "none"; }}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(83,74,183,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, color: "#534AB7", fontWeight: 700 }}>
                  {(userProfile?.user_id ?? "?")[0].toUpperCase()}
                </div>
                <span style={{ fontSize: "12px", fontWeight: 500, color: "#1d1d1f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" as const }}>
                  {userProfile?.user_id ?? "…"}
                </span>
                <span style={{ fontSize: "10px", color: "#aeaeb2" }}>⋯</span>
              </button>

              {showUserMenu && (
                <div ref={userMenuRef} style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: "#fff", borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)", zIndex: 51, overflow: "hidden" }}>
                  <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(0,0,0,0.07)" }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "#1d1d1f" }}>{userProfile?.user_id}</div>
                    <div style={{ fontSize: "11px", color: "#aeaeb2", marginTop: "1px" }}>{session.user?.email}</div>
                  </div>
                  <button
                    onClick={async () => { await signOut(); setShowUserMenu(false); }}
                    style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", color: "#ff3b30", fontSize: "13px", fontWeight: 500, cursor: "pointer", textAlign: "left" as const }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,59,48,0.06)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                  >
                    ログアウト
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                width: "100%", padding: "9px 10px",
                background: "rgba(83,74,183,0.08)",
                border: "1px solid rgba(83,74,183,0.18)",
                borderRadius: "9px",
                color: "#534AB7",
                fontSize: "13px", fontWeight: 600,
                cursor: "pointer",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(83,74,183,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(83,74,183,0.08)")}
            >
              新規登録 / ログイン
            </button>
          )}
        </div>
      </div>

      {/* メインコンテンツ */}
      <SearchPanel
        query={query} setQuery={setQuery} search={search} loading={loading}
        mode={mode} displayTracks={displayTracks} mainSeed={mainSeed}
        subSeeds={subSeeds} setAsMainSeed={setAsMainSeed} addToSubSeed={addToSubSeed}
        addToPlaylist={addToPlaylist} removeFromPlaylist={removeFromPlaylist} isInPlaylist={isInPlaylist}
        filteredSimilarCount={filteredSimilar.length} metadataLoading={metadataLoading}
        savedPlaylists={savedPlaylists} addTrackToSavedPlaylist={addTrackToSavedPlaylist}
        onResetSimilar={() => { setSimilarTracks([]); setMode("search"); setFilters(DEFAULT_FILTERS); }}
      />

      {/* 右パネル */}
      <div style={{
        width: "260px",
        background: "#fafafa",
        borderLeft: "1px solid rgba(0,0,0,0.08)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
        flexShrink: 0,
      }}>
        <SeedPanel
          mainSeed={mainSeed} setMainSeed={setMainSeed}
          subSeeds={subSeeds} removeSubSeed={removeSubSeed}
          exploreSimilar={exploreSimilar}
          filters={filters} setFilters={setFilters}
          similarCount={similarCount} setSimilarCount={setSimilarCount}
          seedAnalyzing={seedAnalyzing} seedError={seedError}
          playlistCount={playlist.length}
          availableGenres={availableGenres}
        />
        <div style={{ height: "1px", background: "rgba(0,0,0,0.07)", margin: "0 16px" }} />
        <PlaylistPanel
          playlist={playlist} removeFromPlaylist={removeFromPlaylist}
          savedPlaylists={savedPlaylists} playlistName={playlistName}
          setPlaylistName={setPlaylistName} savePlaylist={savePlaylist}
          deletePlaylist={deletePlaylist} setPlaylist={setPlaylist}
          togglePublic={togglePublic}
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
  if (ca.t === cb.t) { const diff = Math.abs(ca.n - cb.n); return diff === 1 || diff === 11; }
  return ca.n === cb.n;
}
