"use client";

import { useState } from "react";
import { type Track, type SimilarFilters } from "@/types";

const C = {
  bg: "#fafafa",
  s1: "#f5f5f7",
  s2: "#e8e8ed",
  s3: "#d2d2d7",
  acc: "#7F77DD",
  accDim: "rgba(127,119,221,0.1)",
  accBorder: "rgba(127,119,221,0.3)",
  t1: "#1d1d1f",
  t2: "#6e6e73",
  t3: "#aeaeb2",
  sep: "rgba(0,0,0,0.08)",
  green: "#34c759",
  greenDim: "rgba(52,199,89,0.1)",
  greenText: "#1b7a34",
  blue: "#007aff",
  blueDim: "rgba(0,122,255,0.1)",
  blueText: "#0055cc",
  orange: "#ff9500",
  orangeDim: "rgba(255,149,0,0.1)",
} as const;

type Props = {
  mainSeed: Track | null;
  setMainSeed: (track: Track | null) => void;
  subSeeds: Track[];
  removeSubSeed: (id: string) => void;
  exploreSimilar: () => void;
  filters: SimilarFilters;
  setFilters: (f: SimilarFilters) => void;
  similarCount: 10 | 20 | 30;
  setSimilarCount: (n: 10 | 20 | 30) => void;
  seedAnalyzing: boolean;
  seedError: string | null;
  playlistCount: number;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", marginTop: "2px" }}>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
        cursor: "pointer",
        background: active ? C.acc : C.s1,
        border: `1px solid ${active ? C.acc : C.s2}`,
        color: active ? "#fff" : C.t2,
        transition: "all 0.1s",
      }}
    >
      {label}
    </button>
  );
}

function CheckRow({
  label, value, available = true, checked, onChange,
}: { label: string; value?: string; available?: boolean; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", opacity: available ? 1 : 0.4 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "5px", flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: "12px", color: C.t2 }}>{label}</span>
        {value && <span style={{ fontSize: "10px", color: C.greenText, fontWeight: 600 }}>{value}</span>}
      </div>
      <div style={{ marginLeft: "8px", flexShrink: 0, pointerEvents: available ? "auto" : "none" }}>
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: C.acc, cursor: "pointer", width: 14, height: 14 }} />
      </div>
    </div>
  );
}

const DECADES = ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

export default function SeedPanel({
  mainSeed, setMainSeed, subSeeds, removeSubSeed, exploreSimilar,
  filters, setFilters, similarCount, setSimilarCount, seedAnalyzing, seedError, playlistCount,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  const set = (patch: Partial<SimilarFilters>) => setFilters({ ...filters, ...patch });

  const activeCount = [
    filters.bpmRange !== null, filters.sameKey, filters.camelotAdjacent,
    filters.genreMatch, filters.energyLevel !== null, filters.danceabilityHigh,
    filters.sameArtist, filters.decade !== null, filters.vocalType !== null,
    filters.excludePlaylist,
  ].filter(Boolean).length;

  const hasGemini = mainSeed?.energy !== undefined;
  const hasDecade = !!(mainSeed?.release_year);

  return (
    <div style={{ padding: "16px" }}>

      <div style={{ fontSize: "12px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
        Seed
      </div>

      {/* メイン Seed */}
      <div style={{ marginBottom: "12px" }}>
        <SectionLabel>メイン</SectionLabel>
        {mainSeed ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: C.accDim, border: `1px solid ${C.accBorder}`,
            borderRadius: "10px", padding: "10px",
          }}>
            <img src={mainSeed.album.images[0]?.url} alt={mainSeed.album.name} width={36} height={36} style={{ borderRadius: "6px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.t1, fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mainSeed.name}</div>
              <div style={{ color: C.t2, fontSize: "11px", marginTop: "1px" }}>{mainSeed.artists[0]?.name}</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                {mainSeed.bpm > 0 && <span style={{ fontSize: "10px", color: C.greenText, fontWeight: 600 }}>{mainSeed.bpm} BPM</span>}
                {mainSeed.camelot && <span style={{ fontSize: "10px", color: C.blueText, background: C.blueDim, padding: "0 5px", borderRadius: "4px", fontWeight: 600 }}>{mainSeed.camelot}</span>}
                {mainSeed.energy !== undefined && <span style={{ fontSize: "10px", color: C.t3 }}>E:{Math.round(mainSeed.energy * 10)}</span>}
                {mainSeed.release_year && <span style={{ fontSize: "10px", color: C.t3 }}>{mainSeed.release_year}</span>}
                {seedAnalyzing && <span style={{ fontSize: "10px", color: C.acc, fontWeight: 500 }}>✦ 解析中...</span>}
                {seedError && <span style={{ fontSize: "9px", color: "#ff3b30" }}>ERR</span>}
              </div>
            </div>
            <button onClick={() => setMainSeed(null)} style={{ background: "none", border: "none", color: C.t3, fontSize: "18px", cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        ) : (
          <div style={{ padding: "12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "12px", textAlign: "center" }}>
            検索結果からメインを選択
          </div>
        )}
      </div>

      {/* サブ Seed */}
      <div style={{ marginBottom: "14px" }}>
        <SectionLabel>サブ</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {subSeeds.length === 0 && (
            <div style={{ padding: "10px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "12px", textAlign: "center" }}>
              サブ Seed を追加
            </div>
          )}
          {subSeeds.map((track) => (
            <div key={track.id} style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", padding: "8px 10px",
            }}>
              <img src={track.album.images[0]?.url} alt={track.album.name} width={28} height={28} style={{ borderRadius: "5px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.t1, fontSize: "11px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: C.t2, fontSize: "10px" }}>{track.artists[0]?.name}</div>
              </div>
              <button onClick={() => removeSubSeed(track.id)} style={{ background: "none", border: "none", color: C.t3, fontSize: "16px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 取得件数 */}
      <div style={{ marginBottom: "14px" }}>
        <SectionLabel>取得件数</SectionLabel>
        <div style={{ display: "flex", gap: "6px" }}>
          {([10, 20, 30] as const).map((n) => (
            <Chip key={n} label={`${n}曲`} active={similarCount === n} onClick={() => setSimilarCount(n)} />
          ))}
        </div>
      </div>

      {/* 絞り込み */}
      <div style={{ background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", overflow: "hidden", marginBottom: "14px" }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            width: "100%", padding: "10px 12px", background: "transparent", border: "none",
            color: activeCount > 0 ? C.acc : C.t2,
            fontSize: "12px", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            絞り込み条件
            {activeCount > 0 && (
              <span style={{ background: C.acc, color: "#fff", borderRadius: "10px", padding: "0 6px", fontSize: "10px", fontWeight: 700, lineHeight: "16px" }}>
                {activeCount}
              </span>
            )}
          </span>
          <span style={{ fontSize: "10px", color: C.t3 }}>{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div style={{ padding: "4px 12px 12px", borderTop: `1px solid ${C.sep}` }}>
            {mainSeed && seedAnalyzing && <div style={{ fontSize: "11px", color: C.acc, padding: "8px 0 4px" }}>✦ Gemini が解析中...</div>}
            {mainSeed && !seedAnalyzing && !hasGemini && <div style={{ fontSize: "11px", color: C.t3, padding: "8px 0 4px" }}>✦ Seed 選択後に自動解析</div>}

            {/* BPM */}
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "6px" }}>
                BPM 範囲{(mainSeed?.bpm ?? 0) > 0 && <span style={{ color: C.greenText, marginLeft: "6px", fontWeight: 600 }}>{mainSeed!.bpm} BPM</span>}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {([null, 5, 10] as const).map((v) => (
                  <Chip key={String(v)} label={v === null ? "制限なし" : `±${v}`} active={filters.bpmRange === v} onClick={() => set({ bpmRange: filters.bpmRange === v ? null : v })} />
                ))}
              </div>
            </div>

            {/* キー */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>キー・ハーモニー</div>
              <CheckRow label="同じキー" value={mainSeed?.key || undefined} available={hasGemini} checked={filters.sameKey} onChange={(v) => set({ sameKey: v })} />
              <CheckRow label="Camelot 隣接 (±1)" value={mainSeed?.camelot || undefined} available={hasGemini} checked={filters.camelotAdjacent} onChange={(v) => set({ camelotAdjacent: v })} />
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* ジャンル */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>ジャンル</div>
              <CheckRow label="ジャンル一致" available={hasGemini} checked={filters.genreMatch} onChange={(v) => set({ genreMatch: v })} />
              {hasGemini && mainSeed?.genre_tags?.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "3px", marginTop: "4px" }}>
                  {mainSeed.genre_tags.map((g) => (
                    <span key={g} style={{ fontSize: "10px", color: "#b06c00", background: C.orangeDim, padding: "1px 6px", borderRadius: "4px" }}>{g}</span>
                  ))}
                </div>
              ) : null}
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* エネルギー */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "6px" }}>
                エネルギー{mainSeed?.energy !== undefined && <span style={{ color: C.greenText, marginLeft: "6px", fontWeight: 600 }}>{Math.round(mainSeed.energy * 100)}%</span>}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", opacity: hasGemini ? 1 : 0.4, pointerEvents: hasGemini ? "auto" : "none" }}>
                {([null, "high", "medium", "low"] as const).map((v) => (
                  <Chip key={String(v)} label={v === null ? "全て" : v === "high" ? "高" : v === "medium" ? "中" : "低"} active={filters.energyLevel === v} onClick={() => set({ energyLevel: filters.energyLevel === v ? null : v })} />
                ))}
              </div>
              <div style={{ marginTop: "6px", opacity: hasGemini ? 1 : 0.4, pointerEvents: hasGemini ? "auto" : "none" }}>
                <CheckRow label="ダンサビリティ高" value={mainSeed?.danceability !== undefined ? `${Math.round(mainSeed.danceability * 100)}%` : undefined} available={hasGemini} checked={filters.danceabilityHigh} onChange={(v) => set({ danceabilityHigh: v })} />
              </div>
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* アーティスト・時代 */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>アーティスト・時代</div>
              <CheckRow label="同じアーティスト" value={mainSeed?.artists[0]?.name} checked={filters.sameArtist} onChange={(v) => set({ sameArtist: v })} />
              <div style={{ marginTop: "6px" }}>
                <div style={{ fontSize: "11px", color: C.t3, marginBottom: "6px" }}>
                  リリース年代{mainSeed?.release_year && <span style={{ color: C.t2, marginLeft: "6px" }}>{mainSeed.release_year}年</span>}
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", opacity: hasDecade ? 1 : 0.4, pointerEvents: hasDecade ? "auto" : "none" }}>
                  {DECADES.map((d) => (
                    <Chip key={d} label={d} active={filters.decade === d} onClick={() => set({ decade: filters.decade === d ? null : d })} />
                  ))}
                </div>
                {!hasDecade && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Seed 選択後に使用可</div>}
              </div>
            </div>

            {/* ボーカル */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "6px" }}>
                ボーカル{mainSeed?.is_vocal !== undefined && <span style={{ color: C.t2, marginLeft: "6px" }}>{mainSeed.is_vocal ? "あり" : "インスト"}</span>}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", opacity: hasGemini ? 1 : 0.4, pointerEvents: hasGemini ? "auto" : "none" }}>
                {([null, "vocal", "instrumental"] as const).map((v) => (
                  <Chip key={String(v)} label={v === null ? "全て" : v === "vocal" ? "🎤 ボーカル" : "🎸 インスト"} active={filters.vocalType === v} onClick={() => set({ vocalType: filters.vocalType === v ? null : v })} />
                ))}
              </div>
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* プレイリスト除外 */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>プレイリスト</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", opacity: playlistCount > 0 ? 1 : 0.4 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
                  <span style={{ fontSize: "12px", color: C.t2 }}>追加済みの曲を除外</span>
                  {playlistCount > 0 && (
                    <span style={{ fontSize: "10px", color: C.acc, fontWeight: 600 }}>{playlistCount}曲</span>
                  )}
                </div>
                <div style={{ marginLeft: "8px", flexShrink: 0, pointerEvents: playlistCount > 0 ? "auto" : "none" }}>
                  <input
                    type="checkbox"
                    checked={filters.excludePlaylist}
                    onChange={(e) => set({ excludePlaylist: e.target.checked })}
                    style={{ accentColor: C.acc, cursor: "pointer", width: 14, height: 14 }}
                  />
                </div>
              </div>
              {playlistCount === 0 && (
                <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ プレイリストに曲を追加後に使用可</div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* 探索ボタン */}
      <button
        onClick={exploreSimilar}
        disabled={!mainSeed}
        style={{
          width: "100%", padding: "12px",
          background: mainSeed ? C.acc : C.s1,
          border: `1px solid ${mainSeed ? C.acc : C.sep}`,
          borderRadius: "10px",
          color: mainSeed ? "#fff" : C.t3,
          fontSize: "14px", fontWeight: 700,
          cursor: mainSeed ? "pointer" : "default",
          boxShadow: mainSeed ? "0 2px 8px rgba(88,86,214,0.3)" : "none",
          transition: "all 0.15s",
        }}
      >
        類似曲を探索
      </button>
    </div>
  );
}
