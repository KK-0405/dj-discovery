"use client";

import { useState } from "react";
import { type Track, type SimilarFilters } from "@/types";

type Props = {
  mainSeed: Track | null;
  setMainSeed: (track: Track | null) => void;
  subSeeds: Track[];
  removeSubSeed: (id: string) => void;
  exploreSimilar: () => void;
  filters: SimilarFilters;
  setFilters: (f: SimilarFilters) => void;
  similarCount: 20 | 50 | 100;
  setSimilarCount: (n: 20 | 50 | 100) => void;
  seedAnalyzing: boolean;
};

function Section({ title }: { title: string }) {
  return (
    <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "10px", marginBottom: "4px" }}>
      {title}
    </div>
  );
}

function Row({ label, available = true, children }: { label: string; available?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "3px 0", opacity: available ? 1 : 0.3 }}>
      <span style={{ fontSize: "11px", color: available ? "#ccc" : "#666" }}>{label}</span>
      <div style={{ pointerEvents: available ? "auto" : "none" }}>{children}</div>
    </div>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: "2px 8px", borderRadius: "10px", fontSize: "10px", cursor: "pointer", border: "0.5px solid",
      background: active ? "#1db954" : "#1a1a1a",
      borderColor: active ? "#1db954" : "#333",
      color: active ? "#000" : "#888",
    }}>{label}</button>
  );
}

const DECADES = ["1970s", "1980s", "1990s", "2000s", "2010s", "2020s"];

export default function SeedPanel({
  mainSeed, setMainSeed, subSeeds, removeSubSeed, exploreSimilar,
  filters, setFilters, similarCount, setSimilarCount, seedAnalyzing,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const set = (patch: Partial<SimilarFilters>) => setFilters({ ...filters, ...patch });

  const activeCount = [
    filters.bpmRange !== null,
    filters.sameKey,
    filters.camelotAdjacent,
    filters.genreMatch,
    filters.energyLevel !== null,
    filters.danceabilityHigh,
    filters.sameArtist,
    filters.decade !== null,
    filters.vocalType !== null,
  ].filter(Boolean).length;

  const hasGemini = mainSeed?.energy !== undefined;
  const hasDecade = !!(mainSeed?.release_year);

  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: 500, color: "#aaa", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Seed</div>

      {/* メイン */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>メイン</div>
        {mainSeed ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1db95422", border: "0.5px solid #1db95444", borderRadius: "6px", padding: "8px" }}>
            <img src={mainSeed.album.images[0]?.url} alt={mainSeed.album.name} width={32} height={32} style={{ borderRadius: "3px", flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#fff", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mainSeed.name}</div>
              <div style={{ color: "#666", fontSize: "10px" }}>{mainSeed.artists[0].name}</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "2px", flexWrap: "wrap", alignItems: "center" }}>
                {mainSeed.bpm > 0 && <span style={{ color: "#1db954", fontSize: "10px" }}>{mainSeed.bpm} BPM</span>}
                {mainSeed.camelot && <span style={{ color: "#888", fontSize: "10px", background: "#1a1a1a", padding: "0 4px", borderRadius: "3px" }}>{mainSeed.camelot}</span>}
                {mainSeed.energy !== undefined && <span style={{ color: "#888", fontSize: "10px" }}>E:{Math.round(mainSeed.energy * 10)}</span>}
                {mainSeed.release_year && <span style={{ color: "#666", fontSize: "10px" }}>{mainSeed.release_year}</span>}
                {seedAnalyzing && <span style={{ color: "#1db954", fontSize: "10px" }}>✦ 解析中...</span>}
              </div>
            </div>
            <button onClick={() => setMainSeed(null)} style={{ background: "none", border: "none", color: "#555", fontSize: "14px", cursor: "pointer", flexShrink: 0 }}>×</button>
          </div>
        ) : (
          <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>検索結果からメインを選択</div>
        )}
      </div>

      {/* サブ */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>サブ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {subSeeds.length === 0 && (
            <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>サブSeedを追加</div>
          )}
          {subSeeds.map((track) => (
            <div key={track.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", borderRadius: "6px", padding: "8px" }}>
              <img src={track.album.images[0]?.url} alt={track.album.name} width={28} height={28} style={{ borderRadius: "3px", flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#aaa", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: "#555", fontSize: "10px" }}>{track.artists[0].name}</div>
              </div>
              <button onClick={() => removeSubSeed(track.id)} style={{ background: "none", border: "none", color: "#555", fontSize: "14px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 取得件数 */}
      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>取得件数</div>
        <div style={{ display: "flex", gap: "6px" }}>
          {([20, 50, 100] as const).map((n) => (
            <Chip key={n} label={`${n}曲`} active={similarCount === n} onClick={() => setSimilarCount(n)} />
          ))}
        </div>
      </div>

      {/* 絞り込み条件 */}
      <div style={{ border: "0.5px solid #2a2a2a", borderRadius: "8px", overflow: "hidden", marginBottom: "10px" }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ width: "100%", padding: "8px 10px", background: "#161616", border: "none", color: activeCount > 0 ? "#1db954" : "#888", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>
            絞り込み条件
            {activeCount > 0 && (
              <span style={{ marginLeft: "6px", background: "#1db954", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 600 }}>{activeCount}</span>
            )}
          </span>
          <span style={{ fontSize: "10px" }}>{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div style={{ padding: "4px 10px 10px", background: "#111" }}>

            {mainSeed && seedAnalyzing && (
              <div style={{ fontSize: "10px", color: "#1db954", padding: "6px 0", borderBottom: "0.5px solid #1a1a1a", marginBottom: "4px" }}>
                ✦ Geminiがキー・エネルギー等を解析中...
              </div>
            )}
            {mainSeed && !seedAnalyzing && !hasGemini && (
              <div style={{ fontSize: "10px", color: "#555", padding: "6px 0", borderBottom: "0.5px solid #1a1a1a", marginBottom: "4px" }}>
                ✦ Seedを選択するとGeminiが自動解析します
              </div>
            )}

            {/* 解析結果サマリー */}
            {hasGemini && mainSeed && (
              <div style={{ borderBottom: "0.5px solid #1a1a1a", paddingBottom: "8px", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "6px" }}>解析結果</div>

                {mainSeed.genre_tags?.length > 0 && (
                  <div style={{ marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", color: "#666" }}>ジャンル：</span>
                    <span style={{ fontSize: "10px", color: "#ccc" }}>{mainSeed.genre_tags.join(" / ")}</span>
                  </div>
                )}

                {subSeeds.some((t) => (t.genre_tags?.length ?? 0) > 0) && (
                  <div style={{ marginBottom: "3px" }}>
                    <span style={{ fontSize: "10px", color: "#666" }}>サブジャンル：</span>
                    <span style={{ fontSize: "10px", color: "#aaa" }}>
                      {[...new Set(subSeeds.flatMap((t) => t.genre_tags ?? []))].join(" / ")}
                    </span>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
                  {mainSeed.bpm > 0 && <span style={{ fontSize: "10px", color: "#1db954" }}>BPM: {mainSeed.bpm}</span>}
                  {mainSeed.key && <span style={{ fontSize: "10px", color: "#888" }}>キー: {mainSeed.key}</span>}
                  {mainSeed.camelot && <span style={{ fontSize: "10px", color: "#888" }}>Camelot: {mainSeed.camelot}</span>}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px" }}>
                  {mainSeed.energy !== undefined && <span style={{ fontSize: "10px", color: "#888" }}>エネルギー: {Math.round(mainSeed.energy * 100)}%</span>}
                  {mainSeed.danceability !== undefined && <span style={{ fontSize: "10px", color: "#888" }}>ダンサビリティ: {Math.round(mainSeed.danceability * 100)}%</span>}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "3px" }}>
                  {mainSeed.is_vocal !== undefined && <span style={{ fontSize: "10px", color: "#888" }}>ボーカル: {mainSeed.is_vocal ? "あり" : "なし（インスト）"}</span>}
                  {mainSeed.release_year && <span style={{ fontSize: "10px", color: "#888" }}>{mainSeed.release_year}年</span>}
                </div>
              </div>
            )}

            {/* リズム・テンポ */}
            <Section title="リズム・テンポ" />
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>BPM範囲（シード基準）</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {([null, 5, 10] as const).map((v) => (
                <Chip key={String(v)} label={v === null ? "制限なし" : `±${v}`} active={filters.bpmRange === v} onClick={() => set({ bpmRange: filters.bpmRange === v ? null : v })} />
              ))}
            </div>

            {/* キー・ハーモニー */}
            <Section title="キー・ハーモニー" />
            <Row label="同じキー" available={hasGemini}>
              <input type="checkbox" checked={filters.sameKey} onChange={(e) => set({ sameKey: e.target.checked })} style={{ accentColor: "#1db954", cursor: "pointer" }} />
            </Row>
            <Row label="Camelot隣接（±1）" available={hasGemini}>
              <input type="checkbox" checked={filters.camelotAdjacent} onChange={(e) => set({ camelotAdjacent: e.target.checked })} style={{ accentColor: "#1db954", cursor: "pointer" }} />
            </Row>
            {!hasGemini && <div style={{ fontSize: "10px", color: "#444" }}>※ Gemini解析後に解除</div>}

            {/* ジャンル */}
            <Section title="ジャンル" />
            <Row label="ジャンル一致" available={hasGemini}>
              <input type="checkbox" checked={filters.genreMatch} onChange={(e) => set({ genreMatch: e.target.checked })} style={{ accentColor: "#1db954", cursor: "pointer" }} />
            </Row>
            {!hasGemini && <div style={{ fontSize: "10px", color: "#444" }}>※ Gemini解析後に解除</div>}

            {/* エネルギー・ムード */}
            <Section title="エネルギー・ムード" />
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>エネルギーレベル</div>
            <div style={{ display: "flex", gap: "4px", opacity: hasGemini ? 1 : 0.3, pointerEvents: hasGemini ? "auto" : "none" }}>
              {([null, "high", "medium", "low"] as const).map((v) => (
                <Chip key={String(v)} label={v === null ? "全て" : v === "high" ? "高" : v === "medium" ? "中" : "低"} active={filters.energyLevel === v} onClick={() => set({ energyLevel: filters.energyLevel === v ? null : v })} />
              ))}
            </div>
            <Row label="ダンサビリティ高" available={hasGemini}>
              <input type="checkbox" checked={filters.danceabilityHigh} onChange={(e) => set({ danceabilityHigh: e.target.checked })} style={{ accentColor: "#1db954", cursor: "pointer" }} />
            </Row>
            {!hasGemini && <div style={{ fontSize: "10px", color: "#444" }}>※ Gemini解析後に解除</div>}

            {/* アーティスト・時代 */}
            <Section title="アーティスト・時代" />
            <Row label="同じアーティスト">
              <input type="checkbox" checked={filters.sameArtist} onChange={(e) => set({ sameArtist: e.target.checked })} style={{ accentColor: "#1db954", cursor: "pointer" }} />
            </Row>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px", marginBottom: "4px" }}>リリース年代</div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", opacity: hasDecade ? 1 : 0.3, pointerEvents: hasDecade ? "auto" : "none" }}>
              {DECADES.map((d) => (
                <Chip key={d} label={d} active={filters.decade === d} onClick={() => set({ decade: filters.decade === d ? null : d })} />
              ))}
            </div>
            {!hasDecade && <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ Seed選択後に解除</div>}

            {/* サウンド特性 */}
            <Section title="サウンド特性" />
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>ボーカル</div>
            <div style={{ display: "flex", gap: "4px", opacity: hasGemini ? 1 : 0.3, pointerEvents: hasGemini ? "auto" : "none" }}>
              {([null, "vocal", "instrumental"] as const).map((v) => (
                <Chip key={String(v)} label={v === null ? "全て" : v === "vocal" ? "🎤 ボーカル" : "🎸 インスト"} active={filters.vocalType === v} onClick={() => set({ vocalType: filters.vocalType === v ? null : v })} />
              ))}
            </div>
            {!hasGemini && <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ Gemini解析後に解除</div>}

          </div>
        )}
      </div>

      <button
        onClick={exploreSimilar}
        disabled={!mainSeed}
        style={{ width: "100%", padding: "8px", background: mainSeed ? "#1db954" : "#222", border: "none", borderRadius: "8px", color: mainSeed ? "#fff" : "#555", fontSize: "13px", fontWeight: 500, cursor: mainSeed ? "pointer" : "default" }}
      >
        類似曲を探索
      </button>
    </div>
  );
}
