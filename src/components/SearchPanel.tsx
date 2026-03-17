"use client";

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
  bpmMin: string;
  bpmMax: string;
  setBpmMin: (v: string) => void;
  setBpmMax: (v: string) => void;
  showBpmFilter: boolean;
  setShowBpmFilter: (v: boolean) => void;
  filteredSimilarCount: number;
};

export default function SearchPanel({
  query, setQuery, search, loading, mode, displayTracks,
  mainSeed, subSeeds, setAsMainSeed, addToSubSeed,
  addToPlaylist, isInPlaylist, bpmMin, bpmMax,
  setBpmMin, setBpmMax, showBpmFilter, setShowBpmFilter,
  filteredSimilarCount,
}: Props) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

      <div style={{ padding: "1.25rem 1.5rem", borderBottom: "0.5px solid #333", display: "flex", gap: "12px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="曲名・アーティストを入力"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          style={{ flex: 1, padding: "8px 14px", background: "#222", border: "0.5px solid #444", borderRadius: "8px", color: "#fff", fontSize: "14px", outline: "none" }}
        />
        <button
          onClick={search}
          style={{ padding: "8px 20px", background: "#1db954", color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer" }}
        >
          検索
        </button>
      </div>

      <div style={{ display: "flex", gap: "8px", padding: "1rem 1.5rem", borderBottom: "0.5px solid #222", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontSize: "12px", color: "#666", marginRight: "4px" }}>
          {mode === "search" ? "検索結果" : "類似曲"}
        </div>
        {mode === "similar" && (
          <>
            <button
              onClick={() => setShowBpmFilter(!showBpmFilter)}
              style={{ padding: "4px 12px", background: bpmMin || bpmMax ? "#1db95422" : "#222", border: bpmMin || bpmMax ? "0.5px solid #1db954" : "0.5px solid transparent", borderRadius: "20px", color: bpmMin || bpmMax ? "#1db954" : "#aaa", fontSize: "12px", cursor: "pointer" }}
            >
              {bpmMin || bpmMax ? `BPM: ${bpmMin}–${bpmMax}` : "BPM フィルター"}
            </button>
            {showBpmFilter && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input type="number" placeholder="最小" value={bpmMin} onChange={(e) => setBpmMin(e.target.value)} style={{ width: "70px", padding: "4px 8px", background: "#222", border: "0.5px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none" }} />
                <span style={{ color: "#666", fontSize: "12px" }}>–</span>
                <input type="number" placeholder="最大" value={bpmMax} onChange={(e) => setBpmMax(e.target.value)} style={{ width: "70px", padding: "4px 8px", background: "#222", border: "0.5px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", outline: "none" }} />
                <button onClick={() => { setBpmMin(""); setBpmMax(""); setShowBpmFilter(false); }} style={{ padding: "4px 8px", background: "#333", border: "none", borderRadius: "6px", color: "#aaa", fontSize: "12px", cursor: "pointer" }}>クリア</button>
              </div>
            )}
            <div style={{ color: "#666", fontSize: "12px" }}>{filteredSimilarCount}曲</div>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
        {loading && <p style={{ color: "#888" }}>読み込み中...</p>}
        {mode === "search" && !loading && displayTracks.length === 0 && (
          <p style={{ color: "#555", fontSize: "13px" }}>曲を検索してSeedを選んでください</p>
        )}
        {displayTracks.map((track) => (
          <div
            key={track.id}
            style={{ display: "flex", alignItems: "center", gap: "12px", background: "#1a1a1a", border: mainSeed?.id === track.id ? "0.5px solid #1db954" : "0.5px solid transparent", borderRadius: "8px", padding: "10px 12px" }}
          >
            <img src={track.album.images[0]?.url} alt={track.album.name} width={48} height={48} style={{ borderRadius: "4px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: "14px", fontWeight: 500 }}>{track.name}</div>
              <div style={{ color: "#888", fontSize: "12px" }}>{track.artists.map((a) => a.name).join(", ")}</div>
              <div style={{ color: "#1db954", fontSize: "11px", fontWeight: 500, marginTop: "2px" }}>
                {track.bpm ? `${track.bpm} BPM` : "-- BPM"}
              </div>
            </div>
            {mode === "search" && (
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={() => setAsMainSeed(track)} style={{ padding: "4px 8px", background: mainSeed?.id === track.id ? "#1db954" : "#222", border: "none", borderRadius: "4px", color: mainSeed?.id === track.id ? "#fff" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {mainSeed?.id === track.id ? "★ メイン" : "メイン"}
                </button>
                <button onClick={() => addToSubSeed(track)} style={{ padding: "4px 8px", background: subSeeds.find((t) => t.id === track.id) ? "#333" : "#222", border: "none", borderRadius: "4px", color: subSeeds.find((t) => t.id === track.id) ? "#1db954" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                  {subSeeds.find((t) => t.id === track.id) ? "✓ サブ" : "+ サブ"}
                </button>
              </div>
            )}
            {mode === "similar" && (
              <button onClick={() => addToPlaylist(track)} style={{ padding: "4px 10px", background: isInPlaylist(track) ? "#1db954" : "#222", border: "none", borderRadius: "4px", color: isInPlaylist(track) ? "#fff" : "#aaa", fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>
                {isInPlaylist(track) ? "追加済み" : "+ プレイリスト"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}