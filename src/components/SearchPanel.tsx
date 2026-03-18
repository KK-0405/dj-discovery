"use client";

import { useEffect, useRef, useState } from "react";
import { type Track, type Mode, type SavedPlaylist } from "@/types";
import { type ArtistSuggestion } from "@/lib/itunes";

const C = {
  bg: "#ffffff",
  s1: "#f5f5f7",
  s2: "#e8e8ed",
  s3: "#d2d2d7",
  acc: "#534AB7",
  accDim: "rgba(83,74,183,0.1)",
  t1: "#1d1d1f",
  t2: "#6e6e73",
  t3: "#aeaeb2",
  sep: "rgba(0,0,0,0.08)",
  green: "#34c759",
  greenDim: "rgba(52,199,89,0.1)",
  blue: "#007aff",
  blueDim: "rgba(0,122,255,0.1)",
  orange: "#ff9500",
  orangeDim: "rgba(255,149,0,0.1)",
  purple: "#af52de",
  purpleDim: "rgba(175,82,222,0.1)",
} as const;

type Props = {
  query: string;
  setQuery: (q: string) => void;
  search: () => void;
  loading: boolean;
  mode: Mode;
  displayTracks: Track[];
  mainSeed: Track | null;
  subSeeds: Track[];
  setAsMainSeed: (track: Track) => void;
  removeMainSeed: () => void;
  addToSubSeed: (track: Track) => void;
  removeSubSeed: (id: string) => void;
  addToPlaylist: (track: Track) => void;
  removeFromPlaylist: (id: string) => void;
  isInPlaylist: (track: Track) => boolean;
  filteredSimilarCount: number;
  metadataLoading: boolean;
  onResetSimilar: () => void;
  onSearchMore: () => void;
  loadingMore: boolean;
  viewingPlaylist: SavedPlaylist | null;
  togglePublic: (id: string, isPublic: boolean) => Promise<void>;
};

type MatchBadge = { label: string; color: string; bg: string };

function getMatchBadges(track: Track, seed: Track | null): MatchBadge[] {
  if (!seed) return [];
  const badges: MatchBadge[] = [];

  if (track.bpm && seed.bpm) {
    const diff = Math.abs(track.bpm - seed.bpm);
    if (diff <= 5) {
      badges.push({ label: `${track.bpm} BPM`, color: "#1b7a34", bg: C.greenDim });
    } else if (diff <= 15) {
      badges.push({ label: `${track.bpm} BPM`, color: C.green, bg: C.greenDim });
    } else {
      badges.push({ label: `${track.bpm} BPM`, color: C.t2, bg: C.s1 });
    }
  }

  if (track.camelot && seed.camelot) {
    if (track.camelot === seed.camelot) {
      badges.push({ label: `${track.camelot} Key ≈`, color: "#0055cc", bg: C.blueDim });
    } else if (isCamelotAdjacent(seed.camelot, track.camelot)) {
      badges.push({ label: `${track.camelot} 隣接`, color: C.blue, bg: C.blueDim });
    }
  }

  if (track.genre_tags?.length && seed.genre_tags?.length) {
    const seedSet = new Set(seed.genre_tags.map((g) => g.toLowerCase()));
    track.genre_tags.filter((g) => seedSet.has(g.toLowerCase())).slice(0, 2).forEach((g) => {
      badges.push({ label: g, color: "#b06c00", bg: C.orangeDim });
    });
  }

  if (track.release_year && seed.release_year) {
    const tDec = Math.floor(track.release_year / 10) * 10;
    const sDec = Math.floor(seed.release_year / 10) * 10;
    if (tDec === sDec) {
      badges.push({ label: `${tDec}s`, color: "#7a35a8", bg: C.purpleDim });
    }
  }

  return badges;
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

export default function SearchPanel({
  query, setQuery, search, loading, mode, displayTracks,
  mainSeed, subSeeds, setAsMainSeed, addToSubSeed,
  removeMainSeed, removeSubSeed,
  addToPlaylist, removeFromPlaylist, isInPlaylist, filteredSimilarCount, metadataLoading,
  onResetSimilar, onSearchMore, loadingMore, viewingPlaylist, togglePublic,
}: Props) {
  const [togglingPublic, setTogglingPublic] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playingTrack, setPlayingTrack] = useState<Track | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.6);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isSearchExecuted = useRef(false);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  type PublicPlaylist = { id: string; name: string; slug: string | null; created_by: string; track_count: number; artwork_url: string | null };
  const [publicPlaylists, setPublicPlaylists] = useState<PublicPlaylist[]>([]);
  useEffect(() => {
    fetch("/api/public-playlists").then((r) => r.json()).then((d) => setPublicPlaylists(d.playlists ?? [])).catch(() => {});
  }, []);

  const prevFirstIdRef = useRef<string | null>(null);
  useEffect(() => {
    const firstId = displayTracks[0]?.id ?? null;
    if (firstId !== prevFirstIdRef.current) {
      listRef.current?.scrollTo({ top: 0 });
      prevFirstIdRef.current = firstId;
    }
  }, [displayTracks]);

  const handleQueryChange = (value: string) => {
    isSearchExecuted.current = false;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
    if (value.trim().length < 2) { setSuggestions([]); setArtistSuggestions([]); setShowSuggestions(false); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    debounceRef.current = setTimeout(async () => {
      if (isSearchExecuted.current) return;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`, { signal: controller.signal });
        const data = await res.json();
        if (isSearchExecuted.current) return;
        const tracks: Track[] = (data.tracks ?? []).slice(0, 6);
        const artists: ArtistSuggestion[] = (data.artists ?? []).slice(0, 3);
        setSuggestions(tracks);
        setArtistSuggestions(artists);
        setShowSuggestions(tracks.length > 0 || artists.length > 0);
      } catch { if (!controller.signal.aborted) { setSuggestions([]); setArtistSuggestions([]); } }
    }, 300);
  };

  const selectSuggestion = (track: Track) => {
    setQuery(`${track.name} ${track.artists[0]?.name ?? ""}`.trim());
    setShowSuggestions(false);
    setSuggestions([]);
    setArtistSuggestions([]);
    search();
  };

  const selectArtist = (artist: ArtistSuggestion) => {
    setQuery(artist.name);
    setShowSuggestions(false);
    setSuggestions([]);
    setArtistSuggestions([]);
    search();
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const stopPreview = () => {
    audioRef.current?.pause();
    if (progressRef.current) clearInterval(progressRef.current);
    setPlayingId(null);
    setPlayingTrack(null);
    setProgress(0);
  };

  const startAudio = (url: string, track: Track) => {
    const audio = new Audio(url);
    audio.volume = volume;
    audio.onended = () => { setPlayingId(null); setPlayingTrack(null); setProgress(0); if (progressRef.current) clearInterval(progressRef.current); };
    audio.play();
    audioRef.current = audio;
    setPlayingId(track.id);
    setPlayingTrack(track);
    setProgress(0);
    progressRef.current = setInterval(() => {
      if (!audioRef.current || audioRef.current.duration === 0) return;
      setProgress(audioRef.current.currentTime / audioRef.current.duration);
    }, 200);
  };

  const togglePreview = async (track: Track) => {
    if (playingId === track.id) { stopPreview(); return; }
    stopPreview();

    // まず既存の preview URL を試す
    if (track.preview) {
      // audio load を試みて失敗したらフレッシュURLを取得し直す
      const audio = new Audio(track.preview);
      audio.volume = volume;
      let started = false;
      audio.oncanplay = () => {
        if (started) return;
        started = true;
        audio.oncanplay = null;
        audio.onerror = null;
        // 再生開始
        audio.onended = () => { setPlayingId(null); setPlayingTrack(null); setProgress(0); if (progressRef.current) clearInterval(progressRef.current); };
        audio.play();
        audioRef.current = audio;
        setPlayingId(track.id);
        setPlayingTrack(track);
        setProgress(0);
        progressRef.current = setInterval(() => {
          if (!audioRef.current || audioRef.current.duration === 0) return;
          setProgress(audioRef.current.currentTime / audioRef.current.duration);
        }, 200);
      };
      audio.onerror = async () => {
        if (started) return;
        started = true;
        // URLが期限切れ → Deezerから再取得
        try {
          const res = await fetch(`/api/preview?id=${track.id}`);
          const data = await res.json();
          if (data.preview) startAudio(data.preview, track);
        } catch { /* 取得失敗 → 無音のまま */ }
      };
      // load を開始（oncanplay / onerror を待つ）
      audio.load();
      return;
    }

    // preview なし → Deezerからフレッシュ取得を試みる
    try {
      const res = await fetch(`/api/preview?id=${track.id}`);
      const data = await res.json();
      if (data.preview) startAudio(data.preview, track);
    } catch { /* 取得失敗 */ }
  };

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioRef.current.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = ratio * audioRef.current.duration;
    setProgress(ratio);
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>

      {/* 検索バー */}
      <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.sep}`, background: C.bg }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div ref={inputWrapRef} style={{ flex: 1, position: "relative" }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke={C.t3} strokeWidth="1.6" strokeLinecap="round" style={{ position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}>
              <circle cx="6.5" cy="6.5" r="4.5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
            </svg>
            <input
              type="text"
              placeholder="曲名・アーティストを入力..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !isComposing) {
                  isSearchExecuted.current = true;
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
                  setShowSuggestions(false);
                  setSuggestions([]);
                  setArtistSuggestions([]);
                  search();
                }
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              style={{
                width: "100%",
                padding: "11px 14px 11px 38px",
                background: C.s1,
                border: `1px solid ${C.sep}`,
                borderRadius: "10px",
                color: C.t1,
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />

            {/* オートコンプリート */}
            {showSuggestions && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: C.bg,
                borderRadius: "12px",
                boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)",
                zIndex: 100,
                overflow: "hidden",
              }}>
                {/* アーティスト候補 */}
                {artistSuggestions.length > 0 && (
                  <>
                    <div style={{ padding: "6px 14px 4px", fontSize: "10px", fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.05em", background: C.s1 }}>
                      アーティスト
                    </div>
                    {artistSuggestions.map((a, idx) => (
                      <div
                        key={a.id}
                        onMouseDown={() => selectArtist(a)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "8px 14px", cursor: "pointer",
                          background: C.s1,
                          borderBottom: idx < artistSuggestions.length - 1 ? `1px solid ${C.sep}` : `1px solid ${C.sep}`,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = C.s2)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = C.s1)}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%",
                          background: C.accDim,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "14px", flexShrink: 0,
                        }}>👤</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ color: C.t1, fontSize: "13px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.name}</div>
                          {a.genre && <div style={{ color: C.t3, fontSize: "11px", marginTop: "1px" }}>{a.genre}</div>}
                        </div>
                        <span style={{ marginLeft: "auto", fontSize: "10px", color: C.acc, fontWeight: 600, flexShrink: 0 }}>アーティスト</span>
                      </div>
                    ))}
                    {suggestions.length > 0 && (
                      <div style={{ padding: "6px 14px 4px", fontSize: "10px", fontWeight: 600, color: C.t3, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        曲
                      </div>
                    )}
                  </>
                )}

                {/* 曲候補 */}
                {suggestions.map((t, idx) => (
                  <div
                    key={t.id}
                    onMouseDown={() => selectSuggestion(t)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 14px", cursor: "pointer",
                      borderBottom: idx < suggestions.length - 1 ? `1px solid ${C.sep}` : "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.s1)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    {t.album.images[0]?.url && (
                      <img src={t.album.images[0].url} width={36} height={36} style={{ borderRadius: "6px", flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: C.t1, fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                      <div style={{ color: C.t2, fontSize: "11px", marginTop: "1px" }}>{t.artists[0]?.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              isSearchExecuted.current = true;
              if (debounceRef.current) clearTimeout(debounceRef.current);
              if (abortRef.current) { abortRef.current.abort(); abortRef.current = null; }
              setShowSuggestions(false);
              setSuggestions([]);
              setArtistSuggestions([]);
              search();
            }}
            style={{
              padding: "11px 20px",
              background: C.acc,
              border: "none", borderRadius: "10px",
              color: "#fff", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(88,86,214,0.3)",
            }}
          >
            検索
          </button>
        </div>
      </div>

      {/* モードバー */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "7px 20px",
        borderBottom: `1px solid ${C.sep}`,
        background: C.s1,
      }}>
        <span style={{ fontSize: "11px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {mode === "search" ? "検索結果"
            : mode === "playlist" ? `📋 ${viewingPlaylist?.name ?? "プレイリスト"} — ${displayTracks.length}曲`
            : `類似曲 — ${filteredSimilarCount}曲`}
        </span>
        {metadataLoading && (
          <span style={{ fontSize: "11px", color: C.acc }}>✦ Gemini 解析中...</span>
        )}

        {/* プレイリストモード: 公開/非公開トグル */}
        {mode === "playlist" && viewingPlaylist && (
          <button
            onClick={async () => {
              if (togglingPublic) return;
              setTogglingPublic(true);
              try { await togglePublic(viewingPlaylist.id, !viewingPlaylist.is_public); }
              finally { setTogglingPublic(false); }
            }}
            disabled={togglingPublic}
            style={{
              marginLeft: "auto",
              padding: "3px 10px",
              background: viewingPlaylist.is_public ? "rgba(83,74,183,0.08)" : C.s1,
              border: `1px solid ${viewingPlaylist.is_public ? "rgba(83,74,183,0.3)" : C.s3}`,
              borderRadius: "6px",
              color: viewingPlaylist.is_public ? C.acc : C.t2,
              fontSize: "11px", fontWeight: 600,
              cursor: togglingPublic ? "default" : "pointer",
              opacity: togglingPublic ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {togglingPublic ? "..." : viewingPlaylist.is_public ? "🌐 公開中" : "🔒 非公開"}
          </button>
        )}

        {(mode === "similar" || mode === "playlist") && (
          <button
            onClick={onResetSimilar}
            style={{
              marginLeft: mode === "playlist" ? "8px" : "auto",
              padding: "3px 10px",
              background: "none",
              border: `1px solid ${C.s3}`,
              borderRadius: "6px",
              color: C.t3,
              fontSize: "11px",
              fontWeight: 500,
              cursor: "pointer",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.t2; e.currentTarget.style.color = C.t2; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.s3; e.currentTarget.style.color = C.t3; }}
          >
            ✕ 閉じる
          </button>
        )}
      </div>

      {/* トラックリスト */}
      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "8px 12px", background: C.bg }}>
        {loading && (
          <div style={{ color: C.t3, fontSize: "13px", textAlign: "center", padding: "48px 0" }}>読み込み中...</div>
        )}
        {mode === "search" && !loading && displayTracks.length === 0 && (
          <div style={{ padding: "40px 20px 24px" }}>
            {/* ヘッダー */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
                <svg width="40" height="40" viewBox="0 0 20 20" fill="none">
                  <circle cx="4" cy="10" r="2" fill={C.t3}/>
                  <path d="M 4 7.5 A 2.5 2.5 0 0 1 4 12.5" fill="none" stroke={C.t3} strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M 4 4.5 A 5.5 5.5 0 0 1 4 15.5" fill="none" stroke={C.t3} strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M 4 1.5 A 8.5 8.5 0 0 1 4 18.5" fill="none" stroke={C.t3} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ fontSize: "17px", fontWeight: 600, color: C.t2, marginBottom: "5px" }}>曲を検索してみよう</div>
              <div style={{ fontSize: "13px", color: C.t3 }}>曲名またはアーティスト名を入力して Seed を選択</div>
            </div>

            {/* 公開プレイリスト */}
            {publicPlaylists.length > 0 && (
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
                  みんなのプレイリスト
                </div>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                  gap: "16px",
                }}>
                  {publicPlaylists.map((pl) => (
                    <a
                      key={pl.id}
                      href={pl.slug ? `/playlist/${pl.slug}` : "#"}
                      style={{ textDecoration: "none", display: "block" }}
                    >
                      {/* アートワーク */}
                      <div style={{
                        width: "100%", aspectRatio: "1 / 1",
                        borderRadius: "10px",
                        overflow: "hidden",
                        background: C.accDim,
                        marginBottom: "8px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                      }}>
                        {pl.artwork_url ? (
                          <img
                            src={pl.artwork_url}
                            alt={pl.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <svg width="32" height="32" viewBox="0 0 20 20" fill="none">
                              <circle cx="4" cy="10" r="2" fill={C.acc} opacity="0.6"/>
                              <path d="M 4 7.5 A 2.5 2.5 0 0 1 4 12.5" fill="none" stroke={C.acc} strokeWidth="1.8" strokeLinecap="round" opacity="0.6"/>
                              <path d="M 4 4.5 A 5.5 5.5 0 0 1 4 15.5" fill="none" stroke={C.acc} strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                              <path d="M 4 1.5 A 8.5 8.5 0 0 1 4 18.5" fill="none" stroke={C.acc} strokeWidth="1.2" strokeLinecap="round" opacity="0.25"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* テキスト */}
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", fontWeight: 600, color: C.t1, marginBottom: "2px" }}>
                        {pl.name}
                      </div>
                      <div style={{ fontSize: "11px", color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {pl.created_by} · {pl.track_count}曲
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {displayTracks.map((track) => {
          const badges = mode === "similar" ? getMatchBadges(track, mainSeed) : [];
          const isMain = mainSeed?.id === track.id;
          const inSubSeed = !!subSeeds.find((t) => t.id === track.id);
          const inPlaylist = isInPlaylist(track);

          return (
            <div
              key={track.id}
              onClick={() => setSelectedTrack(track)}
              style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "10px 10px",
                borderRadius: "10px",
                background: isMain ? C.accDim : "transparent",
                marginBottom: "2px",
                transition: "background 0.1s",
                cursor: "pointer",
              }}
              onMouseEnter={(e) => { if (!isMain) e.currentTarget.style.background = C.s1; }}
              onMouseLeave={(e) => { if (!isMain) e.currentTarget.style.background = "transparent"; }}
            >
              {/* アルバムアート */}
              <div style={{ position: "relative", flexShrink: 0, width: 46, height: 46 }}>
                <img
                  src={track.album.images[0]?.url}
                  alt={track.album.name}
                  width={46} height={46}
                  style={{ borderRadius: "8px", display: "block", objectFit: "cover", boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); togglePreview(track); }}
                  style={{
                    position: "absolute", inset: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: playingId === track.id ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.45)",
                    border: "none", borderRadius: "8px",
                    cursor: "pointer", color: "#fff", fontSize: "16px",
                    opacity: playingId === track.id ? 1 : 0,
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={(e) => { if (playingId !== track.id) e.currentTarget.style.opacity = "0"; }}
                >
                  {playingId === track.id ? "⏸" : "▶"}
                </button>
                {playingId === track.id && (
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "3px", borderRadius: "0 0 8px 8px", background: "rgba(255,255,255,0.3)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${progress * 100}%`, background: "#fff", transition: "width 0.2s linear" }} />
                  </div>
                )}
              </div>

              {/* トラック情報 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: playingId === track.id ? C.acc : isMain ? C.acc : C.t1,
                  fontSize: "14px", fontWeight: playingId === track.id ? 600 : 500,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  lineHeight: 1.3,
                }}>
                  {track.name}
                </div>
                <div style={{
                  color: C.t2, fontSize: "12px", marginTop: "1px",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {track.artists.map((a) => a.name).join(", ")}
                  {track.release_year && <span style={{ color: C.t3 }}> · {track.release_year}</span>}
                </div>

                {/* BPM + Camelot + メタ */}
                <div style={{ display: "flex", gap: "5px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                  {/* 類似モードではBPMをマッチバッジ側に表示するためここでは非表示 */}
                  {mode !== "similar" && (
                    <span style={{ fontSize: "11px", color: track.bpm ? "#1b7a34" : C.t3, fontWeight: 500 }}>
                      {track.bpm ? `${track.bpm} BPM` : "— BPM"}
                    </span>
                  )}
                  {track.camelot && (
                    <span style={{ fontSize: "10px", color: C.blue, background: C.blueDim, padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                      {track.camelot}
                    </span>
                  )}
                  {track.energy !== undefined && (
                    <span style={{ fontSize: "11px", color: C.t3 }}>E:{Math.round(track.energy * 10)}</span>
                  )}
                </div>

                {/* 類似モード: マッチバッジ + 理由 */}
                {mode === "similar" && (
                  <>
                    <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                      {badges.length > 0 ? badges.map((b, i) => (
                        <span key={i} style={{ fontSize: "10px", color: b.color, background: b.bg, padding: "1px 6px", borderRadius: "5px", fontWeight: 500, whiteSpace: "nowrap" }}>
                          {b.label}
                        </span>
                      )) : (
                        <span style={{ fontSize: "11px", color: C.t3 }}>一致なし</span>
                      )}
                    </div>
                    {track.reason && (
                      <div style={{ marginTop: "3px", fontSize: "10px", color: C.t2, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {track.reason}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* アクション */}
              {(mode === "search" || mode === "playlist") && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); isMain ? removeMainSeed() : setAsMainSeed(track); }}
                    style={{
                      padding: "5px 10px",
                      background: isMain ? C.acc : C.s1,
                      border: `1px solid ${isMain ? C.acc : C.s2}`,
                      borderRadius: "8px",
                      color: isMain ? "#fff" : C.t2,
                      fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {isMain ? "★ メイン" : "メイン"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); inSubSeed ? removeSubSeed(track.id) : addToSubSeed(track); }}
                    style={{
                      padding: "5px 10px",
                      background: inSubSeed ? C.greenDim : C.s1,
                      border: `1px solid ${inSubSeed ? "#34c759" : C.s2}`,
                      borderRadius: "8px",
                      color: inSubSeed ? "#1b7a34" : C.t2,
                      fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {inSubSeed ? "✓ サブ" : "サブ"}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); inPlaylist ? removeFromPlaylist(track.id) : addToPlaylist(track); }}
                    style={{
                      padding: "5px 10px",
                      background: inPlaylist ? C.accDim : C.s1,
                      border: `1px solid ${inPlaylist ? C.acc : C.s2}`,
                      borderRadius: "8px",
                      color: inPlaylist ? C.acc : C.t2,
                      fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {inPlaylist ? "✓ リスト" : "リスト"}
                  </button>
                </div>
              )}
              {mode === "similar" && (
                <button
                  onClick={(e) => { e.stopPropagation(); inPlaylist ? removeFromPlaylist(track.id) : addToPlaylist(track); }}
                  style={{
                    padding: "5px 12px",
                    background: inPlaylist ? C.accDim : C.s1,
                    border: `1px solid ${inPlaylist ? C.acc : C.s2}`,
                    borderRadius: "8px",
                    color: inPlaylist ? C.acc : C.t2,
                    fontSize: "11px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  {inPlaylist ? "✓ リスト" : "リスト"}
                </button>
              )}
            </div>
          );
        })}

        {mode === "similar" && displayTracks.length > 0 && (
          <div style={{ padding: "12px 4px 8px", display: "flex", justifyContent: "center" }}>
            <button
              onClick={loadingMore ? undefined : onSearchMore}
              disabled={loadingMore}
              style={{
                padding: "9px 24px",
                background: C.accDim,
                border: `1px solid rgba(83,74,183,0.2)`,
                borderRadius: "20px",
                color: C.acc,
                fontSize: "13px",
                fontWeight: 600,
                cursor: loadingMore ? "default" : "pointer",
                transition: "background 0.15s",
                display: "flex", alignItems: "center", gap: "8px",
                opacity: loadingMore ? 0.85 : 1,
              }}
              onMouseEnter={(e) => { if (!loadingMore) e.currentTarget.style.background = "rgba(83,74,183,0.18)"; }}
              onMouseLeave={(e) => { if (!loadingMore) e.currentTarget.style.background = C.accDim; }}
            >
              {loadingMore ? (
                <>
                  <svg
                    width="16" height="16" viewBox="0 0 20 20" fill="none"
                    style={{ animation: "ripple-spin 1s linear infinite", flexShrink: 0 }}
                  >
                    <circle cx="10" cy="10" r="2.2" fill={C.acc} opacity="0.9" />
                    <circle cx="10" cy="10" r="5" stroke={C.acc} strokeWidth="1.6" strokeLinecap="round"
                      strokeDasharray="23.6 7.8" opacity="0.75" fill="none" />
                    <circle cx="10" cy="10" r="8" stroke={C.acc} strokeWidth="1.1" strokeLinecap="round"
                      strokeDasharray="37.7 12.6" opacity="0.5" fill="none" />
                  </svg>
                  検索中…
                </>
              ) : (
                "+ さらに検索"
              )}
            </button>
          </div>
        )}
      </div>

      {/* ミニプレーヤーバー */}
      {playingId && playingTrack && (
        <div style={{
          borderTop: `1px solid ${C.sep}`,
          background: C.s1,
          padding: "10px 14px 12px",
          flexShrink: 0,
        }}>
          {/* シークバー */}
          <div
            onClick={handleSeek}
            style={{
              height: "4px", borderRadius: "2px", background: C.s3,
              cursor: "pointer", marginBottom: "10px", position: "relative",
            }}
          >
            <div style={{ height: "100%", width: `${progress * 100}%`, borderRadius: "2px", background: C.acc, transition: "width 0.2s linear" }} />
          </div>

          {/* コントロール行 */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* アルバムアート */}
            <img
              src={playingTrack.album.images[0]?.url}
              alt={playingTrack.album.name}
              style={{ width: 32, height: 32, borderRadius: "6px", flexShrink: 0, objectFit: "cover" }}
            />

            {/* 曲情報 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: C.t1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {playingTrack.name}
              </div>
              <div style={{ fontSize: "11px", color: C.t2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {playingTrack.artists.map((a) => a.name).join(", ")}
              </div>
            </div>

            {/* 再生/停止 */}
            <button
              onClick={() => togglePreview(playingTrack)}
              style={{
                width: 30, height: 30,
                background: C.acc, border: "none", borderRadius: "50%",
                color: "#fff", fontSize: "13px",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }}
            >
              ⏸
            </button>

            {/* 音量 */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={volume === 0 ? C.t3 : C.t2} strokeWidth="1.6" strokeLinecap="round">
                <path d="M2 5.5h2.5l4-3v11l-4-3H2z"/>
                {volume > 0 && <path d="M11 5.5a3 3 0 0 1 0 5"/>}
                {volume > 0.5 && <path d="M12.5 3.5a5.5 5.5 0 0 1 0 9"/>}
              </svg>
              <input
                type="range"
                min={0} max={1} step={0.02}
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                style={{ width: "72px", cursor: "pointer", accentColor: C.acc }}
              />
            </div>
          </div>
        </div>
      )}

      {/* トラック詳細モーダル */}
      {selectedTrack && (
        <div
          onClick={() => setSelectedTrack(null)}
          style={{
            position: "fixed", inset: 0, zIndex: 1000,
            background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: C.bg, borderRadius: "16px",
              width: "100%", maxWidth: "420px",
              overflow: "hidden",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.07)",
            }}
          >
            {/* ヘッダー：アルバムアート + 基本情報 */}
            <div style={{ display: "flex", gap: "14px", padding: "20px 20px 16px", alignItems: "flex-start" }}>
              <img
                src={selectedTrack.album.images[0]?.url}
                alt={selectedTrack.album.name}
                style={{ width: 96, height: 96, borderRadius: "10px", flexShrink: 0, objectFit: "cover", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}
              />
              <div style={{ flex: 1, minWidth: 0, paddingTop: "2px" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, color: C.t1, lineHeight: 1.3, marginBottom: "5px" }}>
                  {selectedTrack.name}
                </div>
                <div style={{ fontSize: "13px", color: C.t2, marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedTrack.artists.map((a) => a.name).join(", ")}
                </div>
                <div style={{ fontSize: "11px", color: C.t3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedTrack.album.name}
                  {selectedTrack.release_year && ` · ${selectedTrack.release_year}`}
                </div>
                {selectedTrack.is_vocal !== undefined && (
                  <div style={{ marginTop: "6px" }}>
                    <span style={{
                      fontSize: "10px", fontWeight: 600, padding: "2px 8px", borderRadius: "20px",
                      background: selectedTrack.is_vocal ? C.purpleDim : C.s2,
                      color: selectedTrack.is_vocal ? C.purple : C.t3,
                    }}>
                      {selectedTrack.is_vocal ? "ボーカルあり" : "インスト"}
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTrack(null)}
                style={{
                  background: C.s1, border: "none", borderRadius: "50%",
                  width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: C.t2, fontSize: "16px", flexShrink: 0, lineHeight: 1,
                }}
              >×</button>
            </div>

            {/* スタット */}
            <div style={{ padding: "0 20px 16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                <div style={{ background: C.s1, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>BPM</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: selectedTrack.bpm ? "#1b7a34" : C.t3 }}>
                    {selectedTrack.bpm || "—"}
                  </div>
                </div>
                <div style={{ background: C.s1, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Key</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: selectedTrack.camelot ? C.blue : C.t3 }}>
                    {selectedTrack.camelot || "—"}
                  </div>
                  {selectedTrack.key && <div style={{ fontSize: "10px", color: C.t3, marginTop: "1px" }}>{selectedTrack.key}</div>}
                </div>
                <div style={{ background: C.s1, borderRadius: "10px", padding: "10px 12px" }}>
                  <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>Energy</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: selectedTrack.energy !== undefined ? C.acc : C.t3 }}>
                    {selectedTrack.energy !== undefined ? `${Math.round(selectedTrack.energy * 100)}` : "—"}
                    {selectedTrack.energy !== undefined && <span style={{ fontSize: "11px", fontWeight: 500, color: C.t3 }}>%</span>}
                  </div>
                </div>
              </div>

              {/* エネルギー・ダンサビリティ バー */}
              {(selectedTrack.energy !== undefined || selectedTrack.danceability !== undefined) && (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "14px" }}>
                  {selectedTrack.energy !== undefined && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "11px", color: C.t3 }}>エネルギー</span>
                        <span style={{ fontSize: "11px", color: C.t2, fontWeight: 600 }}>{Math.round(selectedTrack.energy * 100)}%</span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: C.s2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${selectedTrack.energy * 100}%`, borderRadius: "2px", background: C.acc }} />
                      </div>
                    </div>
                  )}
                  {selectedTrack.danceability !== undefined && (
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                        <span style={{ fontSize: "11px", color: C.t3 }}>ダンサビリティ</span>
                        <span style={{ fontSize: "11px", color: C.t2, fontWeight: 600 }}>{Math.round(selectedTrack.danceability * 100)}%</span>
                      </div>
                      <div style={{ height: "4px", borderRadius: "2px", background: C.s2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${selectedTrack.danceability * 100}%`, borderRadius: "2px", background: C.orange }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ジャンルタグ */}
              {selectedTrack.genre_tags && selectedTrack.genre_tags.length > 0 && (
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "4px" }}>
                  {selectedTrack.genre_tags.map((g, i) => (
                    <span key={i} style={{
                      padding: "3px 10px", borderRadius: "20px",
                      background: C.orangeDim, color: "#b06c00",
                      fontSize: "11px", fontWeight: 500,
                    }}>{g}</span>
                  ))}
                </div>
              )}

              {/* 未解析メッセージ */}
              {selectedTrack.energy === undefined && (
                <div style={{ fontSize: "11px", color: C.t3, textAlign: "center", padding: "6px 0", fontStyle: "italic" }}>
                  ✦ Seed に設定するとメタデータを自動解析
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div style={{ padding: "12px 20px 18px", borderTop: `1px solid ${C.sep}`, display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                  onClick={() => togglePreview(selectedTrack)}
                  style={{
                    padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                    background: playingId === selectedTrack.id ? C.acc : C.s1,
                    border: `1px solid ${playingId === selectedTrack.id ? C.acc : C.s2}`,
                    color: playingId === selectedTrack.id ? "#fff" : C.t2,
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {playingId === selectedTrack.id ? "⏸ 停止" : "▶ プレビュー"}
                </button>
              {(mode === "search" || mode === "playlist") && (() => {
                const isMain = mainSeed?.id === selectedTrack.id;
                const inSub = !!subSeeds.find((t) => t.id === selectedTrack.id);
                return (
                  <>
                    <button
                      onClick={() => { isMain ? removeMainSeed() : setAsMainSeed(selectedTrack); }}
                      style={{
                        padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                        background: isMain ? C.acc : C.s1,
                        border: `1px solid ${isMain ? C.acc : C.s2}`,
                        color: isMain ? "#fff" : C.t2,
                        cursor: "pointer",
                      }}
                    >
                      {isMain ? "★ メイン" : "メイン"}
                    </button>
                    <button
                      onClick={() => { inSub ? removeSubSeed(selectedTrack.id) : addToSubSeed(selectedTrack); }}
                      style={{
                        padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                        background: inSub ? C.greenDim : C.s1,
                        border: `1px solid ${inSub ? C.green : C.s2}`,
                        color: inSub ? "#1b7a34" : C.t2,
                        cursor: "pointer",
                      }}
                    >
                      {inSub ? "✓ サブ" : "サブ"}
                    </button>
                  </>
                );
              })()}
              {(() => {
                const inPl = isInPlaylist(selectedTrack);
                return (
                  <button
                    onClick={() => { inPl ? removeFromPlaylist(selectedTrack.id) : addToPlaylist(selectedTrack); }}
                    style={{
                      padding: "7px 14px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                      background: inPl ? C.accDim : C.s1,
                      border: `1px solid ${inPl ? C.acc : C.s2}`,
                      color: inPl ? C.acc : C.t2,
                      cursor: "pointer",
                    }}
                  >
                    {inPl ? "✓ リスト" : "リスト"}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
