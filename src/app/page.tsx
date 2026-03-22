"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { type Track, type Mode, type SavedPlaylist, type SimilarFilters, type HistoryEntry } from "@/types";
import { useTheme } from "@/lib/theme-context";
import { useMobile } from "@/lib/use-mobile";
import AuthModal from "@/components/AuthModal";
import SearchPanel from "@/components/SearchPanel";
import SeedPanel from "@/components/SeedPanel";
import PlaylistPanel from "@/components/PlaylistPanel";

const HISTORY_KEY = "dj_history_v1";
const HISTORY_MAX = 20;
function readHistory(): HistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function writeHistory(entries: HistoryEntry[]) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); } catch { /* quota */ }
}
function pushHistory(entry: HistoryEntry): HistoryEntry[] {
  const existing = readHistory();
  const filtered = existing.filter((e) => e.id !== entry.id);
  const updated = [entry, ...filtered].slice(0, HISTORY_MAX);
  writeHistory(updated);
  return updated;
}

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
  const { C, isDark, setIsDark } = useTheme();
  const isMobile = useMobile();
  const [mobileSheet, setMobileSheet] = useState<"none" | "seed" | "playlist" | "panel" | "menu">("none");
  const swipeTouchStart = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    swipeTouchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!swipeTouchStart.current || mobileSheet !== "none") return;
    const dx = e.changedTouches[0].clientX - swipeTouchStart.current.x;
    const dy = e.changedTouches[0].clientY - swipeTouchStart.current.y;
    swipeTouchStart.current = null;
    // 水平方向が支配的、かつ 60px 以上のスワイプのみ判定
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) setMobileSheet("menu");   // 右スワイプ → 左パネル
    else setMobileSheet("panel");          // 左スワイプ → 右パネル
  }, [mobileSheet]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarMounted, setSidebarMounted] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("dj_sidebar_v1");
    if (saved !== null) setSidebarOpen(saved === "1");
    setSidebarMounted(true);
  }, []);
  const toggleSidebar = () => setSidebarOpen((v) => {
    const next = !v;
    localStorage.setItem("dj_sidebar_v1", next ? "1" : "0");
    return next;
  });
  const { session, userProfile, loading: authLoading, signOut, refreshProfile } = useAuth();
  const [query, setQuery] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [userIdSaving, setUserIdSaving] = useState(false);
  const [userIdError, setUserIdError] = useState<string | null>(null);

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [scrollKey, setScrollKey] = useState(0);
  const [seedAnalyzing, setSeedAnalyzing] = useState(false);
  const [seedError, setSeedError] = useState<string | null>(null);
  const [chatFilterIds, setChatFilterIds] = useState<string[] | null>(null);
  const [chatFilterMessage, setChatFilterMessage] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<SavedPlaylist[]>([]);
  const [playlistName, setPlaylistName] = useState("Playlist");
  const [viewingPlaylist, setViewingPlaylist] = useState<SavedPlaylist | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => { setHistory(readHistory()); }, []);

  // ブラウザ履歴 (pushState / popstate) によるナビゲーション
  const navigateTo = useCallback((newMode: Mode) => {
    window.history.pushState({ mode: newMode }, "");
    setMode(newMode);
  }, []);
  useEffect(() => {
    // 初期状態を記録
    window.history.replaceState({ mode: "search" }, "");
    const handler = (e: PopStateEvent) => {
      const m = (e.state?.mode as Mode) ?? "search";
      setMode(m);
    };
    window.addEventListener("popstate", handler);
    return () => window.removeEventListener("popstate", handler);
  }, []);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    setMode("search");
    setTracks([]);
    setSimilarTracks([]);
    setScrollKey((k) => k + 1);
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
    setScrollKey((k) => k + 1);
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
      if (data.tracks?.length > 0) {
        setHistory(pushHistory({
          id: mainSeed.id,
          savedAt: Date.now(),
          mainSeed,
          subSeeds,
          similarTracks: data.tracks,
        }));
      }
    } catch (e) {
      setSimilarTracks([]);
      setSeedError(String(e));
    }
    setLoading(false);
  };

  const exploreSimilarMore = async () => {
    if (!mainSeed) return;
    setLoadingMore(true);
    try {
      const excludeTitles = similarTracks.map((t) => t.name);
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
          excludeTitles,
        }),
      });
      const data = await res.json();
      setSimilarTracks((prev) => [...prev, ...(data.tracks ?? [])]);
    } catch (e) {
      setSeedError(String(e));
    }
    setLoadingMore(false);
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

  const addTracksToExistingPlaylist = async (playlistId: string, tracks: Track[]) => {
    const target = savedPlaylists.find((p) => p.id === playlistId);
    if (!target) return;
    const existingIds = new Set(target.tracks.map((t) => t.id));
    const merged = [...target.tracks, ...tracks.filter((t) => !existingIds.has(t.id))];
    await updateSavedPlaylist(playlistId, merged);
  };

  const savePlaylist = async (): Promise<string | null> => {
    if (playlist.length === 0) return null;
    console.log("[savePlaylist] session:", session ? "exists" : "null", "access_token:", session?.access_token ? "set" : "empty");
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ name: playlistName, tracks: playlist }),
    });
    const text = await res.text();
    console.log("[savePlaylist] status:", res.status, "body:", text);
    let data: any;
    try { data = JSON.parse(text); } catch { throw new Error(`レスポンス解析失敗: ${text.slice(0, 100)}`); }
    if (data.error) throw new Error(data.error);
    if (data.playlist) loadPlaylists();
    return null;
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
    setViewingPlaylist((prev) => prev?.id === id ? { ...prev, is_public: isPublic } : prev);
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
    if (similarTracks.length > 0) {
      setFilters((f) => ({ ...f, selectedGenres: [] }));
      setChatFilterIds(null);
      setChatFilterMessage("");
    }
  }, [similarTracks]);

  const onChatFilter = async (instruction: string) => {
    if (!instruction.trim() || similarTracks.length === 0) return;
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat-filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, tracks: similarTracks, mainSeed }),
      });
      const data = await res.json();
      if (data.ids) {
        setChatFilterIds(data.ids);
        setChatFilterMessage(data.message ?? "");
      } else {
        setChatFilterMessage("絞り込みに失敗しました");
      }
    } catch {
      setChatFilterMessage("エラーが発生しました");
    }
    setChatLoading(false);
  };

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
    if (chatFilterIds !== null && !chatFilterIds.includes(track.id)) return false;
    return true;
  });

  const displayTracks = mode === "playlist" ? (viewingPlaylist?.tracks ?? []) : mode === "similar" ? filteredSimilar : tracks;

  useEffect(() => { loadPlaylists(); }, [session?.access_token]);

  return (
    <div
      style={{ display: "flex", flexDirection: isMobile ? "column" : "row", height: isMobile ? "100dvh" : "100vh", background: C.bg, overflow: "hidden" }}
      onTouchStart={isMobile ? handleTouchStart : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {showUserSettings && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUserSettings(false); }}
        >
          <div style={{ background: C.bg, borderRadius: "14px", padding: "24px", width: "340px", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)" : "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: C.t1, marginBottom: "20px" }}>ユーザー設定</div>

            {/* ダークモード切替 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", marginBottom: "12px", borderBottom: `1px solid ${C.sep}` }}>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: C.t1 }}>ダークモード</div>
                <div style={{ fontSize: "11px", color: C.t3, marginTop: "2px" }}>{isDark ? "ダーク" : "ライト"}</div>
              </div>
              <button
                onClick={() => setIsDark(!isDark)}
                style={{
                  width: 44, height: 26, borderRadius: 13,
                  background: isDark ? "#555555" : C.s3,
                  border: "none", cursor: "pointer", padding: 0,
                  position: "relative", transition: "background 0.2s",
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: 20, height: 20, borderRadius: "50%",
                  background: "#fff",
                  position: "absolute", top: 3,
                  left: isDark ? 21 : 3,
                  transition: "left 0.2s",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
                }} />
              </button>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.t2, display: "block", marginBottom: "6px" }}>ID</label>
              <input
                value={newUserId}
                onChange={(e) => { setNewUserId(e.target.value); setUserIdError(null); }}
                placeholder="新しいID"
                style={{ width: "100%", padding: "9px 12px", border: `1px solid ${C.sepStrong}`, borderRadius: "8px", fontSize: "14px", outline: "none", boxSizing: "border-box" as const, color: C.t1, background: C.s1 }}
              />
              {userIdError && <div style={{ fontSize: "12px", color: C.red, marginTop: "6px" }}>{userIdError}</div>}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowUserSettings(false)}
                style={{ padding: "8px 16px", border: `1px solid ${C.sepStrong}`, borderRadius: "8px", background: "none", fontSize: "13px", fontWeight: 500, cursor: "pointer", color: C.t1 }}
              >
                キャンセル
              </button>
              <button
                disabled={userIdSaving || !newUserId.trim()}
                onClick={async () => {
                  const trimmed = newUserId.trim();
                  if (!trimmed) return;
                  setUserIdSaving(true);
                  setUserIdError(null);
                  const { data: conflict } = await supabase.from("users").select("id").eq("user_id", trimmed).single();
                  if (conflict && conflict.id !== session?.user?.id) {
                    setUserIdError("このIDはすでに使われています");
                    setUserIdSaving(false);
                    return;
                  }
                  const { error } = await supabase.from("users").update({ user_id: trimmed }).eq("id", session?.user?.id);
                  if (error) {
                    setUserIdError("保存に失敗しました");
                  } else {
                    await refreshProfile();
                    setShowUserSettings(false);
                  }
                  setUserIdSaving(false);
                }}
                style={{ padding: "8px 16px", border: "none", borderRadius: "8px", background: C.acc, color: C.bg, fontSize: "13px", fontWeight: 600, cursor: userIdSaving ? "not-allowed" : "pointer", opacity: userIdSaving || !newUserId.trim() ? 0.6 : 1 }}
              >
                {userIdSaving ? "保存中…" : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* サイドバー開時のバックドロップ — 削除: デスクトップでは backdrop がメインコンテンツの全クリックをブロックするため */}

      {/* サイドバー (デスクトップのみ) — YouTube オーバーレイスタイル */}
      {!isMobile && sidebarMounted && <div style={{
        position: "fixed",
        left: 0,
        top: 0,
        bottom: 0,
        zIndex: 40,
        width: sidebarOpen ? "180px" : "44px",
        background: C.s1,
        borderRight: `1px solid ${C.sep}`,
        display: "flex",
        flexDirection: "column",
        transition: "width 200ms ease-in-out",
        overflow: "hidden",
      }}>

        {/* ヘッダー行: ハンバーガー + アプリ名 */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: sidebarOpen ? "8px 16px" : "8px 2px", height: "56px", flexShrink: 0, justifyContent: sidebarOpen ? "flex-start" : "center" }}>
          <button
            onClick={toggleSidebar}
            title={sidebarOpen ? "閉じる" : "開く"}
            style={{ width: 36, height: 36, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.t2, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = C.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </button>
          <div
            onClick={() => { setQuery(""); setTracks([]); setSimilarTracks([]); setMode("search"); setMainSeed(null); setSubSeeds([]); setFilters(DEFAULT_FILTERS); setViewingPlaylist(null); setSeedError(null); }}
            style={{ display: sidebarOpen ? "flex" : "none", alignItems: "center", gap: "8px", cursor: "pointer", flex: 1, minWidth: 0, whiteSpace: "nowrap" }}
          >
            <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #3C3489, #26215C)", borderRadius: "7px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(63,52,137,0.4)" }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.2" fill="white" opacity="0.95"/><circle cx="10" cy="10" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/><circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1.1" opacity="0.5"/></svg>
            </div>
            <span style={{ fontSize: "18px", fontWeight: 700, color: C.t1, letterSpacing: "-0.02em" }}>Ripple</span>
          </div>
        </div>

        {/* ミニナビ (collapsed 時) */}
        {!sidebarOpen && (
          <nav style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", padding: "4px 0" }}>
            {/* Search */}
            <div
              title="Search"
              onClick={() => { setQuery(""); setTracks([]); setSimilarTracks([]); setMode("search"); setMainSeed(null); setSubSeeds([]); setFilters(DEFAULT_FILTERS); setViewingPlaylist(null); setSeedError(null); }}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: mode === "search" && !viewingPlaylist ? C.accDim : "transparent", color: mode === "search" && !viewingPlaylist ? C.acc : C.t2 }}
              onMouseEnter={(e) => { if (!(mode === "search" && !viewingPlaylist)) (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
              onMouseLeave={(e) => { if (!(mode === "search" && !viewingPlaylist)) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            {/* History */}
            <div
              title="History"
              onClick={() => history.length > 0 ? navigateTo("history") : toggleSidebar()}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: mode === "history" ? C.accDim : "transparent", color: mode === "history" ? C.acc : C.t2 }}
              onMouseEnter={(e) => { if (mode !== "history") (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
              onMouseLeave={(e) => { if (mode !== "history") (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="12 8 12 12 14 14"/><path d="M3.05 11a9 9 0 1 0 .5-4"/><polyline points="3 3 3 7 7 7"/>
              </svg>
            </div>
            {/* Playlists */}
            <div
              title="Playlists"
              onClick={() => navigateTo("playlists")}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: mode === "playlists" ? C.accDim : "transparent", color: mode === "playlists" ? C.acc : C.t2 }}
              onMouseEnter={(e) => { if (mode !== "playlists") (e.currentTarget as HTMLDivElement).style.background = C.hover; }}
              onMouseLeave={(e) => { if (mode !== "playlists") (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
                <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </div>
          </nav>
        )}

        {/* フルナビ (expanded 時) */}
        {sidebarOpen && <nav style={{ padding: "10px 8px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "4px 8px 6px" }}>
            Library
          </div>
          <div
            onClick={() => { setQuery(""); setTracks([]); setSimilarTracks([]); setMode("search"); setMainSeed(null); setSubSeeds([]); setFilters(DEFAULT_FILTERS); setViewingPlaylist(null); setSeedError(null); }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: mode === "search" && !viewingPlaylist ? C.accDim : "none", cursor: "pointer" }}
            onMouseEnter={(e) => { if (!(mode === "search" && !viewingPlaylist)) e.currentTarget.style.background = C.hover; }}
            onMouseLeave={(e) => { if (!(mode === "search" && !viewingPlaylist)) e.currentTarget.style.background = "none"; }}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={mode === "search" && !viewingPlaylist ? C.acc : C.t2} strokeWidth="1.6" strokeLinecap="round">
              <circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
            </svg>
            <span style={{ fontSize: "13px", fontWeight: 600, color: mode === "search" && !viewingPlaylist ? C.acc : C.t2 }}>Search</span>
          </div>

          {history.length > 0 && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 8px 6px" }}>
                <span style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>History</span>
                <button
                  onClick={() => { writeHistory([]); setHistory([]); }}
                  style={{ fontSize: "9px", color: C.t3, background: "none", border: "none", cursor: "pointer", padding: "0 2px" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = C.t2)}
                  onMouseLeave={(e) => (e.currentTarget.style.color = C.t3)}
                >
                  全削除
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1px", maxHeight: "185px", overflowY: "auto" }}>
                {history.map((entry) => {
                  const isActive = mainSeed?.id === entry.mainSeed.id && mode === "similar";
                  const thumb = entry.mainSeed.album.images[0]?.url;
                  const age = Date.now() - entry.savedAt;
                  const relTime = age < 3600000 ? `${Math.max(1, Math.floor(age / 60000))}分前`
                    : age < 86400000 ? `${Math.floor(age / 3600000)}時間前`
                    : age < 604800000 ? `${Math.floor(age / 86400000)}日前`
                    : `${Math.floor(age / 604800000)}週前`;
                  return (
                    <button
                      key={entry.id}
                      onClick={() => { setMainSeed(entry.mainSeed); setSubSeeds(entry.subSeeds); setSimilarTracks(entry.similarTracks); setMode("similar"); setViewingPlaylist(null); setFilters(DEFAULT_FILTERS); setScrollKey((k) => k + 1); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderRadius: "8px", background: isActive ? C.accDim : "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = C.hover; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "none"; }}
                    >
                      {thumb ? (
                        <img src={thumb} alt="" style={{ width: 22, height: 22, borderRadius: "4px", objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 22, height: 22, borderRadius: "4px", background: C.accDim, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "12px", fontWeight: isActive ? 600 : 500, color: isActive ? C.acc : C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {entry.mainSeed.name}
                        </div>
                        <div style={{ fontSize: "10px", color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {relTime} · {entry.similarTracks.length}曲
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Playlists セクション: 残りスペースを埋めてスクロール */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", borderTop: `1px solid ${C.sep}`, marginTop: "8px" }}>
            <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", padding: "10px 8px 6px", flexShrink: 0 }}>
              Playlists
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
              {session && savedPlaylists.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                  {savedPlaylists.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => { setViewingPlaylist(p); setMode("playlist"); setScrollKey((k) => k + 1); }}
                      style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderRadius: "8px", background: viewingPlaylist?.id === p.id ? C.accDim : "none", border: "none", cursor: "pointer", textAlign: "left" }}
                      onMouseEnter={(e) => { if (viewingPlaylist?.id !== p.id) e.currentTarget.style.background = C.hover; }}
                      onMouseLeave={(e) => { if (viewingPlaylist?.id !== p.id) e.currentTarget.style.background = "none"; }}
                    >
                      <div style={{ width: 22, height: 22, borderRadius: "4px", overflow: "hidden", flexShrink: 0, background: C.accDim, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                        {p.tracks.slice(0, 4).map((t, i) => (
                          <img key={i} src={t.album.images[0]?.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: viewingPlaylist?.id === p.id ? 600 : 500, color: viewingPlaylist?.id === p.id ? C.acc : C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                        {p.name}
                      </span>
                      <span style={{ fontSize: "10px", color: C.t3, flexShrink: 0 }}>{p.tracks.length}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div style={{ padding: "6px 10px", fontSize: "11px", color: "#aeaeb2" }}>
                  {session ? "保存済みなし" : "ログインで表示"}
                </div>
              )}
            </div>
          </div>
        </nav>}


        {/* 認証フッター — 常時表示、sidebarOpen で見た目を切り替え */}
        <div style={{ flexShrink: 0, marginTop: sidebarOpen ? 0 : "auto", borderTop: `1px solid ${C.sep}`, padding: sidebarOpen ? "12px 10px" : "12px 0", display: "flex", justifyContent: sidebarOpen ? "stretch" : "center" }}>
          {authLoading ? (
            <div style={{ width: sidebarOpen ? "100%" : 36, height: sidebarOpen ? 40 : 36, borderRadius: sidebarOpen ? "9px" : "50%", background: C.s2 }} />
          ) : session ? (
            sidebarOpen ? (
              <div style={{ position: "relative", width: "100%" }}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "7px 10px", borderRadius: "9px", background: showUserMenu ? C.accDim : "none", border: "none", cursor: "pointer", transition: "background 0.15s" }}
                  onMouseEnter={(e) => { if (!showUserMenu) e.currentTarget.style.background = C.hover; }}
                  onMouseLeave={(e) => { if (!showUserMenu) e.currentTarget.style.background = "none"; }}
                >
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accDim, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", flexShrink: 0, color: C.acc, fontWeight: 700 }}>
                    {(userProfile?.user_id ?? "?")[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 500, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "left" as const }}>
                    {userProfile?.user_id ?? "No ID"}
                  </span>
                  <span style={{ fontSize: "10px", color: C.t3 }}>⋯</span>
                </button>
                {showUserMenu && (
                  <div ref={userMenuRef} style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, right: 0, background: C.bg, borderRadius: "10px", boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.08)" : "0 4px 20px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)", zIndex: 51, overflow: "hidden" }}>
                    <div style={{ padding: "10px 14px 8px", borderBottom: `1px solid ${C.sep}` }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: C.t1 }}>{userProfile?.user_id}</div>
                      <div style={{ fontSize: "11px", color: C.t3, marginTop: "1px" }}>{userProfile?.user_id ?? "No ID"}</div>
                    </div>
                    <button
                      onClick={() => { setShowUserMenu(false); setNewUserId(userProfile?.user_id ?? ""); setUserIdError(null); setShowUserSettings(true); }}
                      style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", color: C.t1, fontSize: "13px", fontWeight: 500, cursor: "pointer", textAlign: "left" as const, borderBottom: `1px solid ${C.sep}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.hover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      ユーザー設定
                    </button>
                    <button
                      onClick={() => signOut()}
                      style={{ width: "100%", padding: "10px 14px", background: "none", border: "none", color: C.red, fontSize: "13px", fontWeight: 500, cursor: "pointer", textAlign: "left" as const }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = C.redDim)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      ログアウト
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={toggleSidebar}
                title={userProfile?.user_id ?? "アカウント"}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: C.accDim, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.acc, fontSize: "14px", fontWeight: 700, flexShrink: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.hover; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.accDim; }}
              >
                {(userProfile?.user_id ?? "?")[0].toUpperCase()}
              </button>
            )
          ) : sidebarOpen ? (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{ width: "100%", padding: "9px 10px", background: C.accDim, border: `1px solid ${C.accBorder}`, borderRadius: "9px", color: C.acc, fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.accBorder)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.accDim)}
            >
              新規登録 / ログイン
            </button>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              title="ログイン"
              style={{ width: 36, height: 36, borderRadius: "50%", border: `1px solid ${C.accBorder}`, background: C.accDim, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: C.acc, flexShrink: 0 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.hover; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = C.accDim; }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
          )}
        </div>
      </div>}

      {/* サイドバーのフットプリント */}
      {!isMobile && <div style={{ width: sidebarOpen ? "180px" : "44px", flexShrink: 0, transition: "width 200ms ease-in-out" }} />}

      {/* メインコンテンツ */}
      <SearchPanel
        query={query} setQuery={setQuery} search={search} loading={loading} scrollKey={scrollKey}
        mode={mode} displayTracks={displayTracks} mainSeed={mainSeed}
        subSeeds={subSeeds} setAsMainSeed={setAsMainSeed} removeMainSeed={() => setMainSeed(null)} addToSubSeed={addToSubSeed} removeSubSeed={removeSubSeed}
        addToPlaylist={addToPlaylist} removeFromPlaylist={removeFromPlaylist} isInPlaylist={isInPlaylist}
        filteredSimilarCount={filteredSimilar.length} metadataLoading={metadataLoading}
        onResetSimilar={() => { setSimilarTracks([]); navigateTo("search"); setFilters(DEFAULT_FILTERS); setViewingPlaylist(null); }}
        onSearchMore={exploreSimilarMore}
        loadingMore={loadingMore}
        viewingPlaylist={viewingPlaylist}
        togglePublic={togglePublic}
        onOpenMenu={undefined}
        onOpenPanel={undefined}
        historyEntries={history}
        onClearHistory={() => { writeHistory([]); setHistory([]); }}
        onLoadHistoryEntry={(entry) => { setMainSeed(entry.mainSeed); setSubSeeds(entry.subSeeds); setSimilarTracks(entry.similarTracks); navigateTo("similar"); setViewingPlaylist(null); setFilters(DEFAULT_FILTERS); setScrollKey((k) => k + 1); }}
        savedPlaylistsAll={savedPlaylists}
        hasSession={!!session}
        onLoadSavedPlaylist={(p) => { setViewingPlaylist(p); navigateTo("playlist"); setScrollKey((k) => k + 1); }}
        onNavigate={navigateTo}
        showLogo={!isMobile && !sidebarOpen}
      />

      {/* 右パネル (768px以上で常時表示) */}
      {!isMobile && (
        <div style={{
          width: "260px",
          background: C.bg2,
          borderLeft: `1px solid ${C.sep}`,
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
            hasSimilar={similarTracks.length > 0}
            chatFilterIds={chatFilterIds}
            chatFilterMessage={chatFilterMessage}
            chatLoading={chatLoading}
            onChatFilter={onChatFilter}
            onClearChatFilter={() => { setChatFilterIds(null); setChatFilterMessage(""); }}
          />
          <div style={{ height: "1px", background: "rgba(0,0,0,0.07)", margin: "0 16px" }} />
          <PlaylistPanel
            playlist={playlist} removeFromPlaylist={removeFromPlaylist}
            playlistName={playlistName} setPlaylistName={setPlaylistName}
            savePlaylist={savePlaylist} setPlaylist={setPlaylist}
            savedPlaylists={savedPlaylists}
            addTracksToExistingPlaylist={addTracksToExistingPlaylist}
          />
        </div>
      )}

      {/* モバイル: 右パネルドロワー (グリッドボタンから開く) */}
      {isMobile && mobileSheet === "panel" && (
        <div
          onClick={() => setMobileSheet("none")}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, right: 0, bottom: 0,
              width: "min(300px, 88vw)",
              background: C.bg2,
              borderLeft: `1px solid ${C.sep}`,
              display: "flex", flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.2)",
              animation: "slide-in-right 0.25s cubic-bezier(0.32,0.72,0,1)",
            }}
          >
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
              <SeedPanel
                mainSeed={mainSeed} setMainSeed={setMainSeed}
                subSeeds={subSeeds} removeSubSeed={removeSubSeed}
                exploreSimilar={() => { exploreSimilar(); setMobileSheet("none"); }}
                filters={filters} setFilters={setFilters}
                similarCount={similarCount} setSimilarCount={setSimilarCount}
                seedAnalyzing={seedAnalyzing} seedError={seedError}
                playlistCount={playlist.length}
                availableGenres={availableGenres}
                hasSimilar={similarTracks.length > 0}
                chatFilterIds={chatFilterIds}
                chatFilterMessage={chatFilterMessage}
                chatLoading={chatLoading}
                onChatFilter={onChatFilter}
                onClearChatFilter={() => { setChatFilterIds(null); setChatFilterMessage(""); }}
              />
              <div style={{ height: "1px", background: C.sep, margin: "0 16px" }} />
              <PlaylistPanel
                playlist={playlist} removeFromPlaylist={removeFromPlaylist}
                playlistName={playlistName} setPlaylistName={setPlaylistName}
                savePlaylist={savePlaylist} setPlaylist={setPlaylist}
                savedPlaylists={savedPlaylists}
                addTracksToExistingPlaylist={addTracksToExistingPlaylist}
              />
            </div>
          </div>
        </div>
      )}

      {/* モバイル: ボトムシート (seed / playlist) */}
      {isMobile && (mobileSheet === "seed" || mobileSheet === "playlist") && (
        <div
          onClick={() => setMobileSheet("none")}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
        >
          <div
            className="sheet-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0,
              background: C.bg2,
              borderRadius: "20px 20px 0 0",
              maxHeight: "87vh",
              display: "flex", flexDirection: "column",
              boxShadow: "0 -4px 24px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
              <div style={{ width: 36, height: 4, background: C.s3, borderRadius: 2 }} />
            </div>
            <div style={{ flex: 1, overflowY: "auto", paddingBottom: "env(safe-area-inset-bottom)" }}>
              {mobileSheet === "seed" && (
                <SeedPanel
                  mainSeed={mainSeed} setMainSeed={setMainSeed}
                  subSeeds={subSeeds} removeSubSeed={removeSubSeed}
                  exploreSimilar={() => { exploreSimilar(); setMobileSheet("none"); }}
                  filters={filters} setFilters={setFilters}
                  similarCount={similarCount} setSimilarCount={setSimilarCount}
                  seedAnalyzing={seedAnalyzing} seedError={seedError}
                  playlistCount={playlist.length}
                  availableGenres={availableGenres}
                  hasSimilar={similarTracks.length > 0}
                  chatFilterIds={chatFilterIds}
                  chatFilterMessage={chatFilterMessage}
                  chatLoading={chatLoading}
                  onChatFilter={onChatFilter}
                  onClearChatFilter={() => { setChatFilterIds(null); setChatFilterMessage(""); }}
                />
              )}
              {mobileSheet === "playlist" && (
                <PlaylistPanel
                  playlist={playlist} removeFromPlaylist={removeFromPlaylist}
                  playlistName={playlistName} setPlaylistName={setPlaylistName}
                  savePlaylist={savePlaylist} setPlaylist={setPlaylist}
                  savedPlaylists={savedPlaylists}
                  addTracksToExistingPlaylist={addTracksToExistingPlaylist}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* モバイル: 左ドロワー (menu) */}
      {isMobile && mobileSheet === "menu" && (
        <div
          onClick={() => setMobileSheet("none")}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)" }}
        >
          <div
            className="drawer-enter"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: 0, left: 0, bottom: 0,
              width: "280px",
              background: C.s1,
              display: "flex", flexDirection: "column",
              boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
              overflowY: "auto",
              paddingTop: "env(safe-area-inset-top)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            {/* ロゴ + 閉じるボタン */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "20px 16px 16px", borderBottom: `1px solid ${C.sep}` }}>
              <div style={{ width: 30, height: 30, background: "linear-gradient(135deg, #3C3489, #26215C)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 2px 8px rgba(63,52,137,0.4)" }}>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="2.2" fill="white" opacity="0.95"/><circle cx="10" cy="10" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/><circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1.1" opacity="0.5"/></svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 700, color: C.t1 }}>Ripple</div>
                <div style={{ fontSize: "10px", color: C.t3 }}>Find Your Sound</div>
              </div>
              <button onClick={() => setMobileSheet("none")} style={{ width: 30, height: 30, border: "none", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.t3, borderRadius: "6px" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>
              </button>
            </div>

            {/* ダークモード */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: `1px solid ${C.sep}` }}>
              <span style={{ fontSize: "14px", color: C.t1, fontWeight: 500 }}>{isDark ? "ダーク" : "ライト"}</span>
              <button onClick={() => setIsDark(!isDark)} style={{ width: 44, height: 26, borderRadius: 13, background: isDark ? "#555555" : C.s3, border: "none", cursor: "pointer", padding: 0, position: "relative", transition: "background 0.2s" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: isDark ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
              </button>
            </div>

            {/* 履歴 */}
            {history.length > 0 && (
              <div style={{ padding: "14px 16px 8px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <span style={{ fontSize: "11px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>History</span>
                  <button onClick={() => { writeHistory([]); setHistory([]); }} style={{ fontSize: "11px", color: C.t3, background: "none", border: "none", cursor: "pointer" }}>全削除</button>
                </div>
                {history.slice(0, 10).map((entry) => {
                  const thumb = entry.mainSeed.album.images[0]?.url;
                  return (
                    <button key={entry.id} onClick={() => { setMainSeed(entry.mainSeed); setSubSeeds(entry.subSeeds); setSimilarTracks(entry.similarTracks); setMode("similar"); setViewingPlaylist(null); setFilters(DEFAULT_FILTERS); setScrollKey((k) => k + 1); setMobileSheet("none"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                      {thumb ? <img src={thumb} alt="" style={{ width: 38, height: 38, borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} /> : <div style={{ width: 38, height: 38, borderRadius: "6px", background: C.accDim, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.mainSeed.name}</div>
                        <div style={{ fontSize: "11px", color: C.t3 }}>{entry.similarTracks.length}曲</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* プレイリスト */}
            {session && savedPlaylists.length > 0 && (
              <div style={{ padding: "14px 16px 8px", borderTop: `1px solid ${C.sep}` }}>
                <div style={{ fontSize: "11px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>Playlists</div>
                {savedPlaylists.map((p) => (
                  <button key={p.id} onClick={() => { setViewingPlaylist(p); setMode("playlist"); setScrollKey((k) => k + 1); setMobileSheet("none"); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", border: "none", background: "none", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ width: 38, height: 38, borderRadius: "6px", overflow: "hidden", flexShrink: 0, background: C.accDim, display: "grid", gridTemplateColumns: "1fr 1fr" }}>
                      {p.tracks.slice(0, 4).map((t, i) => <img key={i} src={t.album.images[0]?.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "13px", fontWeight: 500, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                      <div style={{ fontSize: "11px", color: C.t3 }}>{p.tracks.length}曲</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 認証 */}
            <div style={{ marginTop: "auto", padding: "14px 16px", borderTop: `1px solid ${C.sep}` }}>
              {session ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.accDim, display: "flex", alignItems: "center", justifyContent: "center", color: C.acc, fontWeight: 700, fontSize: "14px" }}>{(userProfile?.user_id ?? "?")[0].toUpperCase()}</div>
                    <span style={{ fontSize: "13px", fontWeight: 500, color: C.t1 }}>{userProfile?.user_id ?? "No ID"}</span>
                  </div>
                  <button onClick={() => signOut()} style={{ padding: "7px 14px", border: `1px solid ${C.sep}`, borderRadius: "8px", background: "none", color: C.red, fontSize: "13px", fontWeight: 500, cursor: "pointer" }}>ログアウト</button>
                </div>
              ) : (
                <button onClick={() => { setShowAuthModal(true); setMobileSheet("none"); }} style={{ width: "100%", padding: "12px", background: C.acc, border: "none", borderRadius: "10px", color: C.bg, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  新規登録 / ログイン
                </button>
              )}
            </div>
          </div>
        </div>
      )}
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
