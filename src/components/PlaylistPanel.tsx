"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import AuthModal from "./AuthModal";
import { type Track, type SavedPlaylist, type YoutubePlaylist } from "@/types";

const C = {
  bg: "#fafafa",
  s1: "#f5f5f7",
  s2: "#e8e8ed",
  acc: "#5856d6",
  accDim: "rgba(88,86,214,0.1)",
  t1: "#1d1d1f",
  t2: "#6e6e73",
  t3: "#aeaeb2",
  sep: "rgba(0,0,0,0.08)",
  green: "#34c759",
  greenDim: "rgba(52,199,89,0.1)",
  red: "#ff3b30",
  redDim: "rgba(255,59,48,0.08)",
} as const;

type Props = {
  playlist: Track[];
  removeFromPlaylist: (id: string) => void;
  savedPlaylists: SavedPlaylist[];
  playlistName: string;
  setPlaylistName: (v: string) => void;
  savePlaylist: () => void;
  deletePlaylist: (id: string) => void;
  setPlaylist: (tracks: Track[]) => void;
};

export default function PlaylistPanel({
  playlist, removeFromPlaylist, savedPlaylists,
  playlistName, setPlaylistName, savePlaylist, deletePlaylist,
  setPlaylist,
}: Props) {
  const { session } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaved, setShowSaved] = useState(true);
  const [showYoutubeSelect, setShowYoutubeSelect] = useState(false);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YoutubePlaylist[]>([]);
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState("new");
  const [exporting, setExporting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [expandedPlaylist, setExpandedPlaylist] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  type SavedExportState = {
    playlistId: string;
    selectedIds: Set<string>;
    ytDest: string;
    ytPlaylists: YoutubePlaylist[];
    exporting: boolean;
  };
  const [savedExport, setSavedExport] = useState<SavedExportState | null>(null);

  const handleDragStart = (index: number) => { dragIndexRef.current = index; };
  const handleDrop = (index: number) => {
    const from = dragIndexRef.current;
    if (from === null || from === index) return;
    const updated = [...playlist];
    const [item] = updated.splice(from, 1);
    updated.splice(index, 0, item);
    setPlaylist(updated);
    dragIndexRef.current = null;
  };

  const handleSave = async () => {
    if (playlist.length === 0) return;
    setSaveStatus("saving");
    try {
      await savePlaylist();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const googleToken = session?.provider_token ?? null;

  const handleYoutubeExportClick = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/youtube/playlists", {
      headers: { "X-Google-Token": googleToken ?? "" },
    });
    const data = await res.json();
    setYoutubePlaylists(data.playlists ?? []);
    setShowYoutubeSelect(true);
  };

  const handleExport = async () => {
    setExporting(true);
    const existingId = selectedYoutubePlaylist === "new" ? null : selectedYoutubePlaylist;
    const res = await fetch("/api/youtube/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: playlistName, tracks: playlist, existingPlaylistId: existingId, googleToken }),
    });
    const data = await res.json();
    if (data.url) window.open(data.url, "_blank");
    setExporting(false);
    setShowYoutubeSelect(false);
  };

  const openSavedExport = async (sp: { id: string; tracks: Track[] }) => {
    const res = await fetch("/api/youtube/playlists", {
      headers: { "X-Google-Token": googleToken ?? "" },
    });
    const data = await res.json();
    setSavedExport({
      playlistId: sp.id,
      selectedIds: new Set(sp.tracks.map((t) => t.id)),
      ytDest: "new",
      ytPlaylists: data.playlists ?? [],
      exporting: false,
    });
  };

  const handleSavedExport = async () => {
    if (!savedExport) return;
    const sp = savedPlaylists.find((p) => p.id === savedExport.playlistId);
    if (!sp) return;
    const tracks = sp.tracks.filter((t) => savedExport.selectedIds.has(t.id));
    if (tracks.length === 0) return;
    setSavedExport((prev) => prev ? { ...prev, exporting: true } : null);
    try {
      const res = await fetch("/api/youtube/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sp.name,
          tracks,
          existingPlaylistId: savedExport.ytDest === "new" ? null : savedExport.ytDest,
          googleToken,
        }),
      });
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    } catch { /* ignore */ }
    setSavedExport(null);
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          プレイリスト
        </div>
        {playlist.length > 0 && (
          <span style={{ background: C.acc, color: "#fff", borderRadius: "10px", padding: "0 7px", fontSize: "11px", fontWeight: 700, lineHeight: "18px" }}>
            {playlist.length}曲
          </span>
        )}
      </div>

      {/* 現在のプレイリスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {playlist.length === 0 ? (
          <div style={{ padding: "16px 12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "12px", textAlign: "center" }}>
            類似曲から追加してください
          </div>
        ) : (
          playlist.map((track, index) => (
            <div
              key={track.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(index)}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", padding: "8px 10px", cursor: "grab" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.s2)}
              onMouseLeave={(e) => (e.currentTarget.style.background = C.s1)}
            >
              <span style={{ fontSize: "10px", color: C.t3, width: "14px", textAlign: "center", flexShrink: 0 }}>{index + 1}</span>
              <img src={track.album.images[0]?.url} alt={track.album.name} width={28} height={28} style={{ borderRadius: "5px", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.t1, fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: C.t2, fontSize: "10px" }}>{track.artists[0]?.name}</div>
              </div>
              <button onClick={() => removeFromPlaylist(track.id)} style={{ background: "none", border: "none", color: C.t3, fontSize: "16px", cursor: "pointer", flexShrink: 0 }}>×</button>
            </div>
          ))
        )}
      </div>

      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} />}

      {/* ログインしていない場合 */}
      {!session ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "12px", background: C.accDim, border: `1px solid rgba(88,86,214,0.2)`, borderRadius: "10px", color: C.t2, fontSize: "12px", textAlign: "center", lineHeight: 1.6 }}>
            ログインするとプレイリストを<br />保存・管理できます
          </div>
          <button
            onClick={() => setShowAuthModal(true)}
            style={{ width: "100%", padding: "11px", background: C.acc, border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
          >
            ログイン / 新規登録
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* プレイリスト名 */}
          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="プレイリスト名"
            style={{ width: "100%", padding: "8px 10px", background: "#fff", border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "12px", outline: "none", boxSizing: "border-box" }}
          />

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={playlist.length === 0 || saveStatus === "saving"}
            style={{
              width: "100%", padding: "10px",
              background: saveStatus === "saved" ? C.green : saveStatus === "error" ? C.red : playlist.length > 0 ? C.acc : C.s1,
              border: "none", borderRadius: "10px",
              color: playlist.length > 0 || saveStatus !== "idle" ? "#fff" : C.t3,
              fontSize: "13px", fontWeight: 700,
              cursor: playlist.length > 0 ? "pointer" : "default",
              boxShadow: playlist.length > 0 && saveStatus === "idle" ? "0 2px 8px rgba(88,86,214,0.25)" : "none",
              transition: "background 0.2s",
            }}
          >
            {saveStatus === "saving" ? "保存中..." : saveStatus === "saved" ? "✓ 保存しました" : saveStatus === "error" ? "保存に失敗しました" : "プレイリストを保存"}
          </button>

          {/* YouTube 書き出し（Googleログイン時のみ） */}
          {googleToken && (
            <button
              onClick={handleYoutubeExportClick}
              disabled={playlist.length === 0}
              style={{ width: "100%", padding: "10px", background: playlist.length > 0 ? "#ff0000" : C.s1, border: `1px solid ${playlist.length > 0 ? "#ff0000" : C.sep}`, borderRadius: "10px", color: playlist.length > 0 ? "#fff" : C.t3, fontSize: "13px", fontWeight: 700, cursor: playlist.length > 0 ? "pointer" : "default" }}
            >
              YouTube に書き出し
            </button>
          )}

          {/* YouTube 書き出し先選択 */}
          {showYoutubeSelect && (
            <div style={{ background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: C.t2, fontWeight: 600 }}>書き出し先</div>
              <select
                value={selectedYoutubePlaylist}
                onChange={(e) => setSelectedYoutubePlaylist(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", background: "#fff", border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "12px", outline: "none" }}
              >
                <option value="new">新規プレイリストを作成</option>
                {youtubePlaylists.map((p) => (
                  <option key={p.id} value={p.id}>{p.snippet.title}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={handleExport} style={{ flex: 1, padding: "8px", background: "#ff0000", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}>
                  {exporting ? "書き出し中..." : "書き出す"}
                </button>
                <button onClick={() => setShowYoutubeSelect(false)} style={{ padding: "8px 12px", background: C.s2, border: "none", borderRadius: "8px", color: C.t2, fontSize: "12px", cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 保存済みプレイリスト */}
          <div style={{ borderTop: `1px solid ${C.sep}`, paddingTop: "10px" }}>
            <button
              onClick={() => setShowSaved(!showSaved)}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer", padding: "0 0 8px" }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                保存済み
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                {savedPlaylists.length > 0 && (
                  <span style={{ background: C.s2, color: C.t2, borderRadius: "8px", padding: "0 6px", fontSize: "10px", fontWeight: 600 }}>
                    {savedPlaylists.length}
                  </span>
                )}
                <span style={{ fontSize: "10px", color: C.t3 }}>{showSaved ? "▲" : "▼"}</span>
              </span>
            </button>

            {showSaved && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {savedPlaylists.length === 0 ? (
                  <div style={{ padding: "12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t3, fontSize: "11px", textAlign: "center" }}>
                    保存済みのプレイリストはありません
                  </div>
                ) : (
                  savedPlaylists.map((p) => (
                    <div key={p.id} style={{ background: "#fff", border: `1px solid ${C.sep}`, borderRadius: "10px", overflow: "hidden" }}>
                      {/* プレイリストヘッダー */}
                      <div
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", cursor: "pointer" }}
                        onClick={() => setExpandedPlaylist(expandedPlaylist === p.id ? null : p.id)}
                      >
                        {/* サムネイル（先頭4曲のアルバムアート） */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1px", width: 32, height: 32, borderRadius: "6px", overflow: "hidden", flexShrink: 0 }}>
                          {p.tracks.slice(0, 4).map((t, i) => (
                            <img key={i} src={t.album.images[0]?.url} alt="" width={16} height={16} style={{ display: "block", objectFit: "cover", width: "100%", height: "100%" }} />
                          ))}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: C.t1, fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                          <div style={{ color: C.t3, fontSize: "10px", marginTop: "1px" }}>{p.tracks.length}曲</div>
                        </div>
                        <span style={{ fontSize: "10px", color: C.t3 }}>{expandedPlaylist === p.id ? "▲" : "▼"}</span>
                      </div>

                      {/* 展開時: トラックリスト */}
                      {expandedPlaylist === p.id && (
                        <div style={{ borderTop: `1px solid ${C.sep}` }}>
                          <div style={{ maxHeight: "160px", overflowY: "auto" }}>
                            {p.tracks.map((t, i) => (
                              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 12px", borderBottom: i < p.tracks.length - 1 ? `1px solid ${C.sep}` : "none" }}>
                                <span style={{ fontSize: "9px", color: C.t3, width: "12px", textAlign: "center", flexShrink: 0 }}>{i + 1}</span>
                                <img src={t.album.images[0]?.url} alt="" width={24} height={24} style={{ borderRadius: "4px", flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: C.t1, fontSize: "11px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</div>
                                  <div style={{ color: C.t3, fontSize: "10px" }}>{t.artists[0]?.name}</div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* YouTube書き出しUI */}
                          {savedExport?.playlistId === p.id && (
                            <div style={{ borderTop: `1px solid ${C.sep}`, padding: "10px 12px", background: "#fff", display: "flex", flexDirection: "column", gap: "8px" }}>
                              <div style={{ fontSize: "10px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.05em" }}>YouTube書き出し</div>
                              {/* トラック選択 */}
                              <div style={{ display: "flex", flexDirection: "column", gap: "4px", maxHeight: "120px", overflowY: "auto" }}>
                                {p.tracks.map((t) => (
                                  <label key={t.id} style={{ display: "flex", alignItems: "center", gap: "7px", cursor: "pointer", fontSize: "11px", color: C.t1 }}>
                                    <input
                                      type="checkbox"
                                      checked={savedExport.selectedIds.has(t.id)}
                                      onChange={(e) => {
                                        const next = new Set(savedExport.selectedIds);
                                        if (e.target.checked) next.add(t.id); else next.delete(t.id);
                                        setSavedExport((prev) => prev ? { ...prev, selectedIds: next } : null);
                                      }}
                                    />
                                    <img src={t.album.images[0]?.url} alt="" width={18} height={18} style={{ borderRadius: "3px", flexShrink: 0 }} />
                                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
                                  </label>
                                ))}
                              </div>
                              {/* YouTube書き出し先 */}
                              <select
                                value={savedExport.ytDest}
                                onChange={(e) => setSavedExport((prev) => prev ? { ...prev, ytDest: e.target.value } : null)}
                                style={{ width: "100%", padding: "6px 8px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "7px", color: C.t1, fontSize: "11px", outline: "none" }}
                              >
                                <option value="new">新規プレイリストを作成</option>
                                {savedExport.ytPlaylists.map((yp) => (
                                  <option key={yp.id} value={yp.id}>{yp.snippet.title}</option>
                                ))}
                              </select>
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button
                                  onClick={handleSavedExport}
                                  disabled={savedExport.exporting || savedExport.selectedIds.size === 0}
                                  style={{ flex: 1, padding: "6px", background: savedExport.selectedIds.size === 0 ? C.s2 : "#ff0000", border: "none", borderRadius: "7px", color: savedExport.selectedIds.size === 0 ? C.t3 : "#fff", fontSize: "11px", fontWeight: 600, cursor: savedExport.selectedIds.size > 0 ? "pointer" : "default" }}
                                >
                                  {savedExport.exporting ? "書き出し中..." : `書き出す (${savedExport.selectedIds.size}曲)`}
                                </button>
                                <button
                                  onClick={() => setSavedExport(null)}
                                  style={{ padding: "6px 10px", background: C.s2, border: "none", borderRadius: "7px", color: C.t2, fontSize: "11px", cursor: "pointer" }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          )}

                          {/* アクションボタン */}
                          <div style={{ display: "flex", gap: "6px", padding: "8px 12px", borderTop: `1px solid ${C.sep}`, background: C.s1 }}>
                            <button
                              onClick={() => { setPlaylist(p.tracks); setExpandedPlaylist(null); }}
                              style={{ flex: 1, padding: "6px", background: C.acc, border: "none", borderRadius: "7px", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              読み込む
                            </button>
                            <button
                              onClick={() => openSavedExport(p)}
                              style={{ padding: "6px 8px", background: savedExport?.playlistId === p.id ? "#ff0000" : C.s2, border: "none", borderRadius: "7px", color: savedExport?.playlistId === p.id ? "#fff" : C.t2, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                              title="YouTube Music に書き出し"
                            >
                              ▶YT
                            </button>
                            <button
                              onClick={() => deletePlaylist(p.id)}
                              style={{ padding: "6px 10px", background: C.redDim, border: `1px solid rgba(255,59,48,0.2)`, borderRadius: "7px", color: C.red, fontSize: "11px", fontWeight: 600, cursor: "pointer" }}
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* ユーザー情報 */}
          <div style={{ fontSize: "11px", color: C.t3, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingTop: "4px" }}>
            {session.user?.email}
            {!googleToken && (
              <div style={{ fontSize: "10px", color: C.t3, marginTop: "2px" }}>YouTube書き出しはGoogleログインが必要です</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
