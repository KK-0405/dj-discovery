"use client";

import { useEffect, useRef, useState } from "react";
import { type Track, type Mode } from "@/types";

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
  addToSubSeed: (track: Track) => void;
  addToPlaylist: (track: Track) => void;
  isInPlaylist: (track: Track) => boolean;
  filteredSimilarCount: number;
  metadataLoading: boolean;
};

type MatchBadge = { label: string; color: string; bg: string; border: string };

function getMatchBadges(track: Track, seed: Track | null): MatchBadge[] {
  if (!seed) return [];
  const badges: MatchBadge[] = [];

  // BPM
  if (track.bpm && seed.bpm) {
    const diff = Math.abs(track.bpm - seed.bpm);
    if (diff <= 5) {
      badges.push({ label: `BPM ${track.bpm} ≈ 完全一致`, color: "#1db954", bg: "#1db95420", border: "#1db95450" });
    } else if (diff <= 15) {
      badges.push({ label: `BPM ${track.bpm} (±${diff})`, color: "#a8e6cf", bg: "#1db95412", border: "#1db95430" });
    }
  } else if (track.bpm) {
    badges.push({ label: `BPM ${track.bpm}`, color: "#888", bg: "#1a1a1a", border: "#333" });
  }

  // Camelot / Key
  if (track.camelot && seed.camelot) {
    if (track.camelot === seed.camelot) {
      badges.push({ label: `Key ${track.camelot} 一致`, color: "#82b4ff", bg: "#1a3a6a", border: "#2a5aaa" });
    } else if (isCamelotAdjacent(seed.camelot, track.camelot)) {
      badges.push({ label: `Key ${track.camelot} 隣接`, color: "#82b4ff", bg: "#0d2040", border: "#1a3060" });
    }
  }

  // ジャンル
  if (track.genre_tags?.length && seed.genre_tags?.length) {
    const seedSet = new Set(seed.genre_tags.map((g) => g.toLowerCase()));
    const matched = track.genre_tags.filter((g) => seedSet.has(g.toLowerCase()));
    matched.forEach((g) => {
      badges.push({ label: g, color: "#e8b86d", bg: "#3a2a0a", border: "#6a4a10" });
    });
  }

  // 年代
  if (track.release_year && seed.release_year) {
    const tDec = Math.floor(track.release_year / 10) * 10;
    const sDec = Math.floor(seed.release_year / 10) * 10;
    if (tDec === sDec) {
      badges.push({ label: `${tDec}s`, color: "#b88aff", bg: "#2a1a4a", border: "#4a2a8a" });
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
  if (ca.t === cb.t) {
    const diff = Math.abs(ca.n - cb.n);
    return diff === 1 || diff === 11;
  }
  return ca.n === cb.n;
}

export default function SearchPanel({
  query, setQuery, search, loading, mode, displayTracks,
  mainSeed, subSeeds, setAsMainSeed, addToSubSeed,
  addToPlaylist, isInPlaylist, filteredSimilarCount, metadataLoading,
}: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [suggestions, setSuggestions] = useState<Track[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [displayTracks]);

  // 入力中にdebounceで候補取得
  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        const results: Track[] = (data.tracks ?? []).slice(0, 8);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch { setSuggestions([]); }
    }, 300);
  };

  const selectSuggestion = (track: Track) => {
    setQuery(`${track.name} ${track.artists[0]?.name ?? ""}`.trim());
    setShowSuggestions(false);
    setSuggestions([]);
    search();
  };

  // 外側クリックで候補を閉じる
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const togglePreview = (track: Track) => {
    if (!track.preview) return;
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(track.preview);
      audio.volume = 0.6;
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
      setPlayingId(track.id);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #333", display: "flex", gap: "12px", alignItems: "center" }}>
        <div ref={inputWrapRef} style={{ flex: 1, position: "relative" }}>
          <input
            type="text"
            placeholder="曲名・アーティストを入力"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            onKeyDown={(e) => { if (e.key === "Enter" && !isComposing) { setShowSuggestions(false); search(); } }}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            style={{ width: "100%", padding: "8px 14px", background: "#222", border: "0.5px solid #444", borderRadius: "8px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
          />
          {showSuggestions && (
            <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#1a1a1a", border: "0.5px solid #444", borderRadius: "8px", marginTop: "4px", zIndex: 100, overflow: "hidden" }}>
              {suggestions.map((t) => (
                <div
                  key={t.id}
                  onMouseDown={() => selectSuggestion(t)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", cursor: "pointer", borderBottom: "0.5px solid #2a2a2a" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {t.album.images[0]?.url && (
                    <img src={t.album.images[0].url} width={32} height={32} style={{ borderRadius: "3px", flexShrink: 0 }} />
                  )}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#fff", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                    <div style={{ color: "#888", fontSize: "11px" }}>{t.artists[0]?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => { setShowSuggestions(false); search(); }}
          style={{ padding: "8px 20px", background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
        >
          検索
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", padding: "0.75rem 1.5rem", borderBottom: "0.5px solid #222", alignItems: "center" }}>
        <div style={{ fontSize: "12px", color: "#666" }}>
          {mode === "search" ? "検索結果" : `類似曲 ${filteredSimilarCount}曲`}
        </div>
        {metadataLoading && (
          <div style={{ fontSize: "11px", color: "#1db954", marginLeft: "8px" }}>
            ✦ Gemini解析中...
          </div>
        )}
      </div>

      <div ref={listRef} style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading && <p style={{ color: "#888" }}>読み込み中...</p>}
        {mode === "search" && !loading && displayTracks.length === 0 && (
          <p style={{ color: "#555", fontSize: "13px" }}>曲を検索してSeedを選んでください</p>
        )}
        {displayTracks.map((track) => {
          const badges = mode === "similar" ? getMatchBadges(track, mainSeed) : [];
          return (
            <div
              key={track.id}
              style={{ display: "flex", alignItems: "center", gap: "12px", background: "#1a1a1a", border: mainSeed?.id === track.id ? "0.5px solid #1db954" : "0.5px solid transparent", borderRadius: "8px", padding: "10px 12px" }}
            >
              <div style={{ position: "relative", flexShrink: 0, width: 48, height: 48 }}>
                <img src={track.album.images[0]?.url} alt={track.album.name} width={48} height={48} style={{ borderRadius: "4px", display: "block" }} />
                {track.preview && (
                  <button
                    onClick={() => togglePreview(track)}
                    style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "4px", cursor: "pointer", color: "#fff", fontSize: "16px" }}
                  >
                    {playingId === track.id ? "■" : "▶"}
                  </button>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: "#888", fontSize: "12px" }}>{track.artists.map((a) => a.name).join(", ")}</div>

                {/* BPM・Key（常に表示） */}
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "3px", flexWrap: "wrap" }}>
                  <span style={{ color: "#1db954", fontSize: "11px", fontWeight: 500 }}>
                    {track.bpm ? `${track.bpm} BPM` : "-- BPM"}
                  </span>
                  {track.camelot && (
                    <span style={{ color: "#888", fontSize: "10px", background: "#222", padding: "1px 5px", borderRadius: "4px" }}>{track.camelot}</span>
                  )}
                </div>

                {/* 類似モード: 一致バッジ */}
                {mode === "similar" && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                    {badges.length > 0 ? badges.map((b, i) => (
                      <span key={i} style={{ fontSize: "10px", color: b.color, background: b.bg, border: `0.5px solid ${b.border}`, borderRadius: "4px", padding: "1px 6px", whiteSpace: "nowrap" }}>
                        {b.label}
                      </span>
                    )) : (
                      <span style={{ fontSize: "10px", color: "#777" }}>一致なし</span>
                    )}
                  </div>
                )}

                {/* ジャンルタグ + エネルギー等（常に表示） */}
                <div style={{ display: "flex", gap: "4px", marginTop: "3px", flexWrap: "wrap", alignItems: "center" }}>
                  {track.energy !== undefined && (
                    <span style={{ fontSize: "10px", color: "#aaa" }}>E:{Math.round(track.energy * 10)}</span>
                  )}
                  {track.is_vocal !== undefined && (
                    <span style={{ fontSize: "10px", color: "#aaa" }}>{track.is_vocal ? "🎤" : "🎸"}</span>
                  )}
                  {track.genre_tags?.slice(0, 3).map((g) => (
                    <span key={g} style={{ fontSize: "9px", color: "#bbb", background: "#2a2a2a", padding: "1px 5px", borderRadius: "3px" }}>{g}</span>
                  ))}
                </div>
              </div>

              {mode === "search" && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => setAsMainSeed(track)} style={{ padding: "4px 8px", background: mainSeed?.id === track.id ? "#1db954" : "#222", border: "none", borderRadius: "4px", color: mainSeed?.id === track.id ? "#fff" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {mainSeed?.id === track.id ? "★ メイン" : "メイン"}
                  </button>
                  <button onClick={() => addToSubSeed(track)} style={{ padding: "4px 8px", background: subSeeds.find((t) => t.id === track.id) ? "#333" : "#222", border: "none", borderRadius: "4px", color: subSeeds.find((t) => t.id === track.id) ? "#1db954" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {subSeeds.find((t) => t.id === track.id) ? "✓ サブ" : "+ サブ"}
                  </button>
                </div>
              )}
              {mode === "similar" && (
                <button onClick={() => addToPlaylist(track)} style={{ padding: "4px 10px", background: isInPlaylist(track) ? "#1db954" : "#222", border: "none", borderRadius: "4px", color: isInPlaylist(track) ? "#fff" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {isInPlaylist(track) ? "追加済み" : "+ プレイリスト"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
