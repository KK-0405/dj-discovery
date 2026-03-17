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
};

type FilterRowProps = {
  label: string;
  available: boolean;
  children: React.ReactNode;
};

function FilterSection({ title }: { title: string }) {
  return (
    <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: "10px", marginBottom: "4px" }}>
      {title}
    </div>
  );
}

function FilterRow({ label, available, children }: FilterRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", opacity: available ? 1 : 0.35 }}>
      <span style={{ fontSize: "11px", color: available ? "#ccc" : "#666" }}>{label}</span>
      <div style={{ pointerEvents: available ? "auto" : "none" }}>{children}</div>
    </div>
  );
}

export default function SeedPanel({
  mainSeed, setMainSeed, subSeeds, removeSubSeed, exploreSimilar,
  filters, setFilters,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const activeFilterCount = [
    filters.bpmRange !== null,
    filters.sameArtist,
  ].filter(Boolean).length;

  return (
    <div>
      <div style={{ fontSize: "12px", fontWeight: 500, color: "#aaa", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Seed</div>

      <div style={{ marginBottom: "10px" }}>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>メイン</div>
        {mainSeed ? (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1db95422", border: "0.5px solid #1db95444", borderRadius: "6px", padding: "8px" }}>
            <img src={mainSeed.album.images[0]?.url} alt={mainSeed.album.name} width={32} height={32} style={{ borderRadius: "3px", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontSize: "11px" }}>{mainSeed.name}</div>
              <div style={{ color: "#666", fontSize: "10px" }}>{mainSeed.artists[0].name}</div>
              {mainSeed.bpm > 0 && (
                <div style={{ color: "#1db954", fontSize: "10px" }}>{mainSeed.bpm} BPM</div>
              )}
            </div>
            <button onClick={() => setMainSeed(null)} style={{ background: "none", border: "none", color: "#555", fontSize: "14px", cursor: "pointer" }}>×</button>
          </div>
        ) : (
          <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>検索結果からメインを選択</div>
        )}
      </div>

      <div>
        <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>サブ</div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {subSeeds.length === 0 && (
            <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>サブSeedを追加</div>
          )}
          {subSeeds.map((track) => (
            <div key={track.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", borderRadius: "6px", padding: "8px" }}>
              <img src={track.album.images[0]?.url} alt={track.album.name} width={28} height={28} style={{ borderRadius: "3px", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ color: "#aaa", fontSize: "11px" }}>{track.name}</div>
                <div style={{ color: "#555", fontSize: "10px" }}>{track.artists[0].name}</div>
              </div>
              <button onClick={() => removeSubSeed(track.id)} style={{ background: "none", border: "none", color: "#555", fontSize: "14px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 絞り込み条件 */}
      <div style={{ marginTop: "12px", border: "0.5px solid #2a2a2a", borderRadius: "8px", overflow: "hidden" }}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{ width: "100%", padding: "8px 10px", background: "#161616", border: "none", color: activeFilterCount > 0 ? "#1db954" : "#888", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          <span>
            絞り込み条件
            {activeFilterCount > 0 && (
              <span style={{ marginLeft: "6px", background: "#1db954", color: "#000", borderRadius: "10px", padding: "1px 6px", fontSize: "10px", fontWeight: 600 }}>
                {activeFilterCount}
              </span>
            )}
          </span>
          <span style={{ fontSize: "10px" }}>{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div style={{ padding: "4px 10px 10px", background: "#111" }}>

            {/* リズム・テンポ */}
            <FilterSection title="リズム・テンポ" />
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>BPM範囲（シード基準）</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {([null, 5, 10] as const).map((v) => (
                <button
                  key={String(v)}
                  onClick={() => setFilters({ ...filters, bpmRange: filters.bpmRange === v ? null : v })}
                  style={{
                    padding: "3px 8px", borderRadius: "12px", fontSize: "11px", cursor: "pointer", border: "0.5px solid",
                    background: filters.bpmRange === v ? "#1db954" : "#1a1a1a",
                    borderColor: filters.bpmRange === v ? "#1db954" : "#333",
                    color: filters.bpmRange === v ? "#000" : "#888",
                  }}
                >
                  {v === null ? "制限なし" : `±${v}`}
                </button>
              ))}
            </div>

            {/* キー・ハーモニー */}
            <FilterSection title="キー・ハーモニー" />
            <FilterRow label="同じキー" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="相対調" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="Camelotホイール隣接" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ キーデータなし</div>

            {/* ジャンル・サブジャンル */}
            <FilterSection title="ジャンル・サブジャンル" />
            <FilterRow label="同じジャンル" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="隣接ジャンル" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="サブジャンル一致" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ ジャンルデータなし</div>

            {/* エネルギー・ムード */}
            <FilterSection title="エネルギー・ムード" />
            <FilterRow label="エネルギー高低" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="ダンサビリティ" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ Spotify Audio Features必要</div>

            {/* アーティスト・時代 */}
            <FilterSection title="アーティスト・時代" />
            <FilterRow label="同じアーティスト" available={true}>
              <input
                type="checkbox"
                checked={filters.sameArtist}
                onChange={(e) => setFilters({ ...filters, sameArtist: e.target.checked })}
                style={{ accentColor: "#1db954", cursor: "pointer" }}
              />
            </FilterRow>
            <FilterRow label="同じレーベル" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <FilterRow label="リリース年代" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ レーベル・年代データなし</div>

            {/* サウンド特性 */}
            <FilterSection title="サウンド特性" />
            <FilterRow label="ボーカルあり/なし" available={false}>
              <input type="checkbox" disabled />
            </FilterRow>
            <div style={{ fontSize: "10px", color: "#444", marginTop: "2px" }}>※ 検出データなし</div>

          </div>
        )}
      </div>

      <button
        onClick={exploreSimilar}
        disabled={!mainSeed}
        style={{ width: "100%", marginTop: "10px", padding: "8px", background: mainSeed ? "#1db954" : "#222", border: "none", borderRadius: "8px", color: mainSeed ? "#fff" : "#555", fontSize: "13px", fontWeight: 500, cursor: mainSeed ? "pointer" : "default" }}
      >
        類似曲を探索
      </button>
    </div>
  );
}
