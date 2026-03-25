"use client";

import { useState, useRef } from "react";
import { type Track, type SimilarFilters } from "@/types";
import { useTheme } from "@/lib/theme-context";

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
  availableGenres: string[];
  hasSimilar: boolean;
  chatFilterIds: string[] | null;
  chatFilterMessage: string;
  chatLoading: boolean;
  onChatFilter: (instruction: string) => void;
  onClearChatFilter: () => void;
};

function SectionLabel({ children, C }: { children: React.ReactNode; C: import("@/lib/theme-context").Colors }) {
  return (
    <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", marginTop: "2px" }}>
      {children}
    </div>
  );
}

function Chip({ label, active, onClick, C }: { label: string; active: boolean; onClick: () => void; C: import("@/lib/theme-context").Colors }) {
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
  label, value, available = true, checked, onChange, C,
}: { label: string; value?: string; available?: boolean; checked: boolean; onChange: (v: boolean) => void; C: import("@/lib/theme-context").Colors }) {
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
  filters, setFilters, similarCount, setSimilarCount, seedAnalyzing, seedError, playlistCount, availableGenres,
  hasSimilar, chatFilterIds, chatFilterMessage, chatLoading, onChatFilter, onClearChatFilter,
}: Props) {
  const { C } = useTheme();
  const [showFilters, setShowFilters] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<SimilarFilters>) => setFilters({ ...filters, ...patch });

  const activeCount = [
    filters.bpmRange !== null, filters.sameKey, filters.camelotAdjacent,
    filters.selectedGenres.length > 0, filters.energyLevel !== null,
    filters.sameArtist, filters.decade !== null,
    filters.excludePlaylist,
    filters.excludeAnthems,
  ].filter(Boolean).length;

  const hasGemini = mainSeed?.energy !== undefined;
  const hasDecade = !!(mainSeed?.release_year);

  return (
    <div style={{ padding: "16px" }}>

      <div style={{ fontSize: "11px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "14px" }}>
        Seed
      </div>

      {/* メイン Seed */}
      <div style={{ marginBottom: "12px" }}>
        <SectionLabel C={C}>メイン</SectionLabel>
        {mainSeed ? (
          <div style={{
            display: "flex", alignItems: "center", gap: "10px",
            background: C.accDim, border: `1px solid ${C.accBorder}`,
            borderRadius: "10px", padding: "10px",
          }}>
            <img src={mainSeed.album.images[0]?.url} alt={mainSeed.album.name} width={36} height={36} style={{ borderRadius: "6px", flexShrink: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.15)" }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: C.t1, fontSize: "11px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mainSeed.name}</div>
              <div style={{ color: C.t2, fontSize: "10px", marginTop: "1px" }}>{mainSeed.artists[0]?.name}</div>
              <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap", alignItems: "center" }}>
                {mainSeed.bpm > 0 && <span style={{ fontSize: "10px", color: C.greenText, fontWeight: 600 }}>{mainSeed.bpm} BPM</span>}
                {mainSeed.camelot && <span style={{ fontSize: "10px", color: C.blueText, background: C.blueDim, padding: "0 5px", borderRadius: "4px", fontWeight: 600 }}>{mainSeed.camelot}</span>}
                {mainSeed.energy !== undefined && <span style={{ fontSize: "10px", color: C.t3 }}>E:{Math.round(mainSeed.energy * 10)}</span>}
                {mainSeed.release_year && <span style={{ fontSize: "10px", color: C.t3 }}>{mainSeed.release_year}</span>}
                {seedAnalyzing && <span style={{ fontSize: "10px", color: C.acc, fontWeight: 500 }}>✦ 解析中...</span>}
                {seedError && <span style={{ fontSize: "9px", color: "#ff3b30", fontWeight: 700 }}>⚠ ERR</span>}
              </div>
            </div>
            <button onClick={() => setMainSeed(null)} style={{ background: "none", border: "none", color: C.t3, fontSize: "18px", cursor: "pointer", flexShrink: 0, lineHeight: 1 }}>×</button>
          </div>
        ) : (
          <div style={{ padding: "12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "11px", textAlign: "center" }}>
            検索結果からメインを選択
          </div>
        )}
      </div>

      {/* Gemini エラー表示 */}
      {seedError && (
        <div style={{
          marginBottom: "14px",
          padding: "10px 12px",
          background: "rgba(255,59,48,0.06)",
          border: "1px solid rgba(255,59,48,0.25)",
          borderRadius: "10px",
        }}>
          <div style={{ fontSize: "10px", fontWeight: 700, color: "#ff3b30", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            ⚠ Gemini エラー
          </div>
          <div style={{
            fontSize: "11px", color: "#c0392b",
            wordBreak: "break-all", whiteSpace: "pre-wrap",
            maxHeight: "120px", overflowY: "auto",
            lineHeight: 1.6,
          }}>
            {seedError}
          </div>
        </div>
      )}

      {/* サブ Seed */}
      <div style={{ marginBottom: "14px" }}>
        <SectionLabel C={C}>サブ</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {subSeeds.length === 0 && (
            <div style={{ padding: "10px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "11px", textAlign: "center" }}>
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
                <div style={{ color: C.t1, fontSize: "10px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: C.t2, fontSize: "9px" }}>{track.artists[0]?.name}</div>
              </div>
              <button onClick={() => removeSubSeed(track.id)} style={{ background: "none", border: "none", color: C.t3, fontSize: "16px", cursor: "pointer" }}>×</button>
            </div>
          ))}
        </div>
      </div>

      {/* 取得件数 */}
      <div style={{ marginBottom: "14px" }}>
        <SectionLabel C={C}>取得件数</SectionLabel>
        <div style={{ display: "flex", gap: "6px" }}>
          {([10, 20, 30] as const).map((n) => (
            <Chip C={C} key={n} label={`${n}曲`} active={similarCount === n} onClick={() => setSimilarCount(n)} />
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
            fontSize: "11px", fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            絞り込み条件
            {activeCount > 0 && (
              <span style={{ background: C.acc, color: C.bg, borderRadius: "10px", padding: "0 6px", fontSize: "10px", fontWeight: 700, lineHeight: "16px" }}>
                {activeCount}
              </span>
            )}
          </span>
          <span style={{ fontSize: "10px", color: C.t3 }}>{showFilters ? "▲" : "▼"}</span>
        </button>

        {showFilters && (
          <div style={{ padding: "4px 12px 12px", borderTop: `1px solid ${C.sep}` }}>
            {mainSeed && seedAnalyzing && <div style={{ fontSize: "10px", color: C.acc, padding: "8px 0 4px" }}>✦ Gemini が解析中...</div>}
            {mainSeed && !seedAnalyzing && !hasGemini && <div style={{ fontSize: "10px", color: C.t3, padding: "8px 0 4px" }}>✦ Seed 選択後に自動解析</div>}

            {/* BPM */}
            <div style={{ marginTop: "8px" }}>
              <div style={{ fontSize: "10px", color: C.t3, marginBottom: "6px" }}>
                BPM 範囲{(mainSeed?.bpm ?? 0) > 0 && <span style={{ color: C.greenText, marginLeft: "6px", fontWeight: 600 }}>{mainSeed!.bpm} BPM</span>}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                {([null, 5, 10] as const).map((v) => (
                  <Chip C={C} key={String(v)} label={v === null ? "制限なし" : `±${v}`} active={filters.bpmRange === v} onClick={() => set({ bpmRange: filters.bpmRange === v ? null : v })} />
                ))}
              </div>
            </div>

            {/* キー */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "10px", color: C.t3, marginBottom: "4px" }}>キー・ハーモニー</div>
              <CheckRow C={C} label="同じキー" value={mainSeed?.key || undefined} available={hasGemini} checked={filters.sameKey} onChange={(v) => set({ sameKey: v })} />
              <CheckRow C={C} label="Camelot 隣接 (±1)" value={mainSeed?.camelot || undefined} available={hasGemini} checked={filters.camelotAdjacent} onChange={(v) => set({ camelotAdjacent: v })} />
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* ジャンル */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <div style={{ fontSize: "10px", color: C.t3 }}>ジャンル</div>
                {hasGemini && (availableGenres.length > 0 || mainSeed?.genre_tags?.length) && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button onClick={() => set({ selectedGenres: availableGenres.length > 0 ? availableGenres : (mainSeed?.genre_tags ?? []) })} style={{ fontSize: "10px", color: C.acc, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>全選択</button>
                    <button onClick={() => set({ selectedGenres: [] })} style={{ fontSize: "10px", color: C.t3, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}>全解除</button>
                  </div>
                )}
              </div>
              {!hasGemini && (
                <div style={{ fontSize: "10px", color: C.t3 }}>※ Gemini 解析後に使用可</div>
              )}
              {/* 類似曲取得後はresultジャンル、それ以前はSeedジャンルをチェックボックス表示 */}
              {(() => {
                const genres = availableGenres.length > 0 ? availableGenres : (mainSeed?.genre_tags ?? []);
                if (!hasGemini || genres.length === 0) return null;
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    {genres.map((g) => {
                      const checked = filters.selectedGenres.includes(g);
                      return (
                        <label key={g} style={{ display: "flex", alignItems: "center", gap: "7px", padding: "3px 0", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => set({ selectedGenres: checked ? filters.selectedGenres.filter((x) => x !== g) : [...filters.selectedGenres, g] })}
                            style={{ accentColor: C.acc, cursor: "pointer", width: 13, height: 13, flexShrink: 0 }}
                          />
                          <span style={{ fontSize: "12px", color: checked ? C.acc : C.t2, fontWeight: checked ? 600 : 400 }}>{g}</span>
                        </label>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* エネルギー */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "10px", color: C.t3, marginBottom: "6px" }}>
                エネルギー{mainSeed?.energy !== undefined && <span style={{ color: C.greenText, marginLeft: "6px", fontWeight: 600 }}>{Math.round(mainSeed.energy * 100)}%</span>}
              </div>
              <div style={{ display: "flex", gap: "5px", flexWrap: "wrap", opacity: hasGemini ? 1 : 0.4, pointerEvents: hasGemini ? "auto" : "none" }}>
                {([null, "high", "medium", "low"] as const).map((v) => (
                  <Chip C={C} key={String(v)} label={v === null ? "全て" : v === "high" ? "高" : v === "medium" ? "中" : "低"} active={filters.energyLevel === v} onClick={() => set({ energyLevel: filters.energyLevel === v ? null : v })} />
                ))}
              </div>
              {!hasGemini && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Gemini 解析後に使用可</div>}
            </div>

            {/* アーティスト・時代 */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>アーティスト・時代</div>
              <CheckRow C={C} label="同じアーティスト" value={mainSeed?.artists[0]?.name} checked={filters.sameArtist} onChange={(v) => set({ sameArtist: v })} />
              <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", cursor: "pointer" }}>
                <span style={{ fontSize: "12px", color: C.t2 }}>
                  同名アーティストを除外
                  {mainSeed?.artists[0]?.name && <span style={{ fontSize: "10px", color: C.t3, marginLeft: "5px" }}>({mainSeed.artists[0].name})</span>}
                </span>
                <input
                  type="checkbox"
                  checked={filters.excludeSameArtist}
                  onChange={(e) => set({ excludeSameArtist: e.target.checked })}
                  style={{ accentColor: C.acc, cursor: "pointer", width: 13, height: 13, flexShrink: 0, marginLeft: "8px" }}
                />
              </label>
              <div style={{ marginTop: "6px" }}>
                <div style={{ fontSize: "10px", color: C.t3, marginBottom: "6px" }}>
                  リリース年代{mainSeed?.release_year && <span style={{ color: C.t2, marginLeft: "6px" }}>{mainSeed.release_year}年</span>}
                </div>
                <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", opacity: hasDecade ? 1 : 0.4, pointerEvents: hasDecade ? "auto" : "none" }}>
                  {DECADES.map((d) => (
                    <Chip C={C} key={d} label={d} active={filters.decade === d} onClick={() => set({ decade: filters.decade === d ? null : d })} />
                  ))}
                </div>
                {!hasDecade && <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>※ Seed 選択後に使用可</div>}
              </div>
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

            {/* アンセム除外 */}
            <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.sep}` }}>
              <div style={{ fontSize: "11px", color: C.t3, marginBottom: "4px" }}>絞り込み</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
                <span style={{ fontSize: "12px", color: C.t2 }}>アンセムを除外</span>
                <div style={{ marginLeft: "8px", flexShrink: 0 }}>
                  <input
                    type="checkbox"
                    checked={filters.excludeAnthems}
                    onChange={(e) => set({ excludeAnthems: e.target.checked })}
                    style={{ accentColor: C.acc, cursor: "pointer", width: 14, height: 14 }}
                  />
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* AI チャットフィルター */}
      {hasSimilar && (
        <div style={{ marginBottom: "14px" }}>
          <div style={{ fontSize: "10px", color: C.t3, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
            AI に絞り込みを指示
          </div>
          <div style={{
            background: C.s1, border: `1px solid ${chatFilterIds !== null ? C.accBorder : C.sep}`,
            borderRadius: "10px", overflow: "hidden",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={chatInputRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (chatInput.trim() && !chatLoading) {
                    onChatFilter(chatInput.trim());
                  }
                }
              }}
              placeholder={"例: テンポが速くてダークな曲だけ\n   インストのみ / 80年代限定"}
              rows={2}
              style={{
                width: "100%", padding: "9px 10px",
                background: "transparent", border: "none", outline: "none",
                fontSize: "11px", color: C.t1, resize: "none",
                lineHeight: 1.5, boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", padding: "4px 8px 6px", borderTop: `1px solid ${C.sep}` }}>
              {chatFilterIds !== null && (
                <button
                  onClick={() => { onClearChatFilter(); setChatInput(""); }}
                  style={{ background: "none", border: "none", fontSize: "11px", color: C.t3, cursor: "pointer", marginRight: "auto", padding: "0 2px", fontWeight: 500 }}
                >
                  クリア
                </button>
              )}
              <button
                onClick={() => { if (chatInput.trim() && !chatLoading) onChatFilter(chatInput.trim()); }}
                disabled={!chatInput.trim() || chatLoading}
                style={{
                  padding: "4px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                  background: chatInput.trim() && !chatLoading ? C.acc : C.s2,
                  border: "none", color: chatInput.trim() && !chatLoading ? "#fff" : C.t3,
                  cursor: chatInput.trim() && !chatLoading ? "pointer" : "default",
                  transition: "all 0.1s",
                }}
              >
                {chatLoading ? "処理中..." : "実行"}
              </button>
            </div>
          </div>
          {/* AIの返答 */}
          {(chatFilterMessage || chatLoading) && (
            <div style={{
              marginTop: "6px", padding: "7px 10px",
              background: chatFilterIds !== null ? C.accDim : C.s1,
              border: `1px solid ${chatFilterIds !== null ? C.accBorder : C.sep}`,
              borderRadius: "8px",
              fontSize: "11px", color: chatFilterIds !== null ? C.acc : C.t2,
              fontWeight: chatFilterIds !== null ? 500 : 400,
              lineHeight: 1.5,
            }}>
              {chatLoading ? (
                <span style={{ color: C.acc }}>✦ AIが分析中...</span>
              ) : (
                <>
                  <span style={{ marginRight: "4px", opacity: 0.7 }}>✦</span>
                  {chatFilterMessage}
                  {chatFilterIds !== null && (
                    <span style={{ marginLeft: "6px", color: C.t3, fontWeight: 400 }}>
                      ({chatFilterIds.length}曲)
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* 探索ボタン */}
      <button
        onClick={exploreSimilar}
        disabled={!mainSeed}
        style={{
          width: "100%", padding: "12px",
          background: mainSeed ? C.bg : C.s1,
          border: `1px solid ${mainSeed ? C.s3 : C.sep}`,
          borderRadius: "10px",
          color: mainSeed ? C.acc : C.t3,
          fontSize: "13px", fontWeight: 700,
          cursor: mainSeed ? "pointer" : "default",
          boxShadow: "none",
          transition: "all 0.15s",
        }}
      >
        類似曲を探索
      </button>
    </div>
  );
}
