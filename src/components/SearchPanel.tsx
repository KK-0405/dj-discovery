"use client";

import { useEffect, useRef, useState } from "react";
import { type Track, type Mode } from "@/types";

const C = {
  bg: "#000",
  s1: "#1c1c1e",
  s2: "#2c2c2e",
  s3: "#3a3a3c",
  acc: "#fc3c44",
  accDim: "rgba(252,60,68,0.12)",
  t1: "#fff",
  t2: "rgba(235,235,245,0.6)",
  t3: "rgba(235,235,245,0.3)",
  sep: "rgba(84,84,88,0.4)",
  blue: "#0a84ff",
  blueDim: "rgba(10,132,255,0.15)",
  green: "#30d158",
  greenDim: "rgba(48,209,88,0.12)",
  purple: "#bf5af2",
  purpleDim: "rgba(191,90,242,0.15)",
  yellow: "#ffd60a",
  yellowDim: "rgba(255,214,10,0.12)",
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
  addToSubSeed: (track: Track) => void;
  addToPlaylist: (track: Track) => void;
  isInPlaylist: (track: Track) => boolean;
  filteredSimilarCount: number;
  metadataLoading: boolean;
};

type MatchBadge = { label: string; color: string; bg: string };

function getMatchBadges(track: Track, seed: Track | null): MatchBadge[] {
  if (!seed) return [];
  const badges: MatchBadge[] = [];

  if (track.bpm && seed.bpm) {
    const diff = Math.abs(track.bpm - seed.bpm);
    if (diff <= 5) {
      badges.push({ label: `${track.bpm} BPM ≈`, color: C.green, bg: C.greenDim });
    } else if (diff <= 15) {
      badges.push({ label: `${track.bpm} BPM ±${diff}`, color: "rgba(48,209,88,0.7)", bg: C.greenDim });
    } else {
      badges.push({ label: `${track.bpm} BPM`, color: C.t3, bg: "rgba(255,255,255,0.06)" });
    }
  }

  if (track.camelot && seed.camelot) {
    if (track.camelot === seed.camelot) {
      badges.push({ label: `${track.camelot} Key ≈`, color: C.blue, bg: C.blueDim });
    } else if (isCamelotAdjacent(seed.camelot, track.camelot)) {
      badges.push({ label: `${track.camelot} 隣接`, color: "rgba(10,132,255,0.7)", bg: C.blueDim });
    }
  }

  if (track.genre_tags?.length && seed.genre_tags?.length) {
    const seedSet = new Set(seed.genre_tags.map((g) => g.toLowerCase()));
    track.genre_tags.filter((g) => seedSet.has(g.toLowerCase())).slice(0, 2).forEach((g) => {
      badges.push({ label: g, color: C.yellow, bg: C.yellowDim });
    });
  }

  if (track.release_year && seed.release_year) {
    const tDec = Math.floor(track.release_year / 10) * 10;
    const sDec = Math.floor(seed.release_year / 10) * 10;
    if (tDec === sDec) {
      badges.push({ label: `${tDec}s`, color: C.purple, bg: C.purpleDim });
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

  const handleQueryChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        const results: Track[] = (data.tracks ?? []).slice(0, 7);
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#060606" }}>

      {/* 検索バー */}
      <div style={{ padding: "16px 20px 14px", borderBottom: `1px solid ${C.sep}` }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <div ref={inputWrapRef} style={{ flex: 1, position: "relative" }}>
            <span style={{
              position: "absolute", left: "13px", top: "50%", transform: "translateY(-50%)",
              color: C.t3, fontSize: "15px", pointerEvents: "none", lineHeight: 1,
            }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="曲名・アーティストを入力..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => { if (e.key === "Enter" && !isComposing) { setShowSuggestions(false); search(); } }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              style={{
                width: "100%",
                padding: "11px 14px 11px 38px",
                background: C.s1,
                border: "none",
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
                position: "absolute",
                top: "calc(100% + 6px)",
                left: 0, right: 0,
                background: C.s2,
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
                zIndex: 100,
                overflow: "hidden",
              }}>
                {suggestions.map((t, idx) => (
                  <div
                    key={t.id}
                    onMouseDown={() => selectSuggestion(t)}
                    style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "9px 14px",
                      cursor: "pointer",
                      borderBottom: idx < suggestions.length - 1 ? `1px solid ${C.sep}` : "none",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = C.s3)}
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
            onClick={() => { setShowSuggestions(false); search(); }}
            style={{
              padding: "11px 20px",
              background: C.acc,
              border: "none", borderRadius: "10px",
              color: "#fff", fontSize: "14px", fontWeight: 600,
              cursor: "pointer", flexShrink: 0,
              boxShadow: "0 2px 8px rgba(252,60,68,0.3)",
            }}
          >
            検索
          </button>
        </div>
      </div>

      {/* モードバー */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 20px",
        borderBottom: `1px solid ${C.sep}`,
        background: "#060606",
      }}>
        <span style={{ fontSize: "12px", color: C.t3, fontWeight: 500 }}>
          {mode === "search" ? "検索結果" : `類似曲 ${filteredSimilarCount}曲`}
        </span>
        {metadataLoading && (
          <span style={{ fontSize: "11px", color: C.acc, marginLeft: "4px" }}>
            ✦ Gemini 解析中...
          </span>
        )}
      </div>

      {/* トラックリスト */}
      <div
        ref={listRef}
        style={{ flex: 1, overflowY: "auto", padding: "8px 12px" }}
      >
        {loading && (
          <div style={{ color: C.t3, fontSize: "13px", textAlign: "center", padding: "40px 0" }}>
            読み込み中...
          </div>
        )}
        {mode === "search" && !loading && displayTracks.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎵</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: C.t2, marginBottom: "6px" }}>曲を検索してみよう</div>
            <div style={{ fontSize: "13px", color: C.t3 }}>曲名またはアーティスト名を入力してSeedを選択</div>
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
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "10px 10px",
                borderRadius: "10px",
                background: isMain ? C.accDim : "transparent",
                marginBottom: "2px",
                transition: "background 0.12s",
              }}
              onMouseEnter={(e) => { if (!isMain) e.currentTarget.style.background = C.s1; }}
              onMouseLeave={(e) => { if (!isMain) e.currentTarget.style.background = "transparent"; }}
            >
              {/* アルバムアート + プレビュー */}
              <div style={{ position: "relative", flexShrink: 0, width: 46, height: 46 }}>
                <img
                  src={track.album.images[0]?.url}
                  alt={track.album.name}
                  width={46} height={46}
                  style={{ borderRadius: "8px", display: "block", objectFit: "cover" }}
                />
                {track.preview && (
                  <button
                    onClick={() => togglePreview(track)}
                    className="preview-btn"
                    style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(0,0,0,0.6)",
                      backdropFilter: "blur(2px)",
                      border: "none", borderRadius: "8px",
                      cursor: "pointer", color: "#fff", fontSize: "14px",
                      opacity: playingId === track.id ? 1 : 0,
                      transition: "opacity 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                    onMouseLeave={(e) => { if (playingId !== track.id) e.currentTarget.style.opacity = "0"; }}
                  >
                    {playingId === track.id ? "⏹" : "▶"}
                  </button>
                )}
              </div>

              {/* トラック情報 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  color: isMain ? C.acc : C.t1,
                  fontSize: "14px", fontWeight: 500,
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

                {/* BPM + Camelot + Energy */}
                <div style={{ display: "flex", gap: "5px", alignItems: "center", marginTop: "4px", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "11px",
                    color: track.bpm ? C.green : C.t3,
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {track.bpm ? `${track.bpm} BPM` : "— BPM"}
                  </span>
                  {track.camelot && (
                    <span style={{
                      fontSize: "10px", color: C.blue,
                      background: C.blueDim,
                      padding: "1px 6px", borderRadius: "4px",
                      fontWeight: 600,
                    }}>
                      {track.camelot}
                    </span>
                  )}
                  {track.energy !== undefined && (
                    <span style={{ fontSize: "11px", color: C.t3 }}>
                      E:{Math.round(track.energy * 10)}
                    </span>
                  )}
                  {track.is_vocal !== undefined && (
                    <span style={{ fontSize: "11px", color: C.t3 }}>{track.is_vocal ? "🎤" : "🎸"}</span>
                  )}
                  {track.genre_tags?.slice(0, 2).map((g) => (
                    <span key={g} style={{
                      fontSize: "10px", color: C.t3,
                      background: "rgba(255,255,255,0.07)",
                      padding: "1px 5px", borderRadius: "4px",
                    }}>{g}</span>
                  ))}
                </div>

                {/* 類似モード: マッチバッジ */}
                {mode === "similar" && (
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px", flexWrap: "wrap" }}>
                    {badges.length > 0 ? badges.map((b, i) => (
                      <span key={i} style={{
                        fontSize: "10px", color: b.color,
                        background: b.bg,
                        padding: "1px 6px", borderRadius: "5px",
                        fontWeight: 500, whiteSpace: "nowrap",
                      }}>
                        {b.label}
                      </span>
                    )) : (
                      <span style={{ fontSize: "11px", color: C.t3 }}>一致なし</span>
                    )}
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              {mode === "search" && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => setAsMainSeed(track)}
                    style={{
                      padding: "5px 10px",
                      background: isMain ? C.acc : "rgba(255,255,255,0.08)",
                      border: "none", borderRadius: "8px",
                      color: isMain ? "#fff" : C.t2,
                      fontSize: "11px", fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {isMain ? "★ メイン" : "メイン"}
                  </button>
                  <button
                    onClick={() => addToSubSeed(track)}
                    style={{
                      padding: "5px 10px",
                      background: inSubSeed ? C.greenDim : "rgba(255,255,255,0.08)",
                      border: "none", borderRadius: "8px",
                      color: inSubSeed ? C.green : C.t2,
                      fontSize: "11px", fontWeight: 600,
                      cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {inSubSeed ? "✓ サブ" : "+ サブ"}
                  </button>
                </div>
              )}
              {mode === "similar" && (
                <button
                  onClick={() => addToPlaylist(track)}
                  style={{
                    padding: "5px 12px",
                    background: inPlaylist ? C.accDim : "rgba(255,255,255,0.08)",
                    border: "none", borderRadius: "8px",
                    color: inPlaylist ? C.acc : C.t2,
                    fontSize: "11px", fontWeight: 600,
                    cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  }}
                >
                  {inPlaylist ? "✓ 追加済み" : "+ リスト"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
