"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { type Track, type SavedPlaylist, type YoutubePlaylist } from "@/types";
import { useTheme } from "@/lib/theme-context";

type Props = {
  playlist: Track[];
  removeFromPlaylist: (id: string) => void;
  playlistName: string;
  setPlaylistName: (v: string) => void;
  savePlaylist: () => Promise<string | null>;
  setPlaylist: (tracks: Track[]) => void;
  savedPlaylists: SavedPlaylist[];
  addTracksToExistingPlaylist: (playlistId: string, tracks: Track[]) => Promise<void>;
};

export default function PlaylistPanel({
  playlist, removeFromPlaylist,
  playlistName, setPlaylistName, savePlaylist, setPlaylist,
  savedPlaylists, addTracksToExistingPlaylist,
}: Props) {
  const { session, loading: authLoading, googleToken } = useAuth();
  const { C } = useTheme();
  const [targetPlaylistId, setTargetPlaylistId] = useState<"new" | string>("new");
  const [showYoutubeSelect, setShowYoutubeSelect] = useState(false);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YoutubePlaylist[]>([]);
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState("new");
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const dragIndexRef = useRef<number | null>(null);

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
    setSaveError(null);
    try {
      if (targetPlaylistId === "new") {
        await savePlaylist();
      } else {
        await addTracksToExistingPlaylist(targetPlaylistId, playlist);
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch (e: any) {
      const msg = e?.message ?? "不明なエラー";
      setSaveError(msg);
      setSaveStatus("error");
      setTimeout(() => { setSaveStatus("idle"); setSaveError(null); }, 6000);
    }
  };

  // googleToken は AuthContext から取得（リロード後も localStorage から復元される）

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
    setExportError(null);
    try {
      // トークン情報を確認してデバッグ表示
      const tokenInfoRes = await fetch("/api/google/token-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: googleToken }),
      });
      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfo.error) {
        setExportError(`トークンエラー: ${tokenInfo.error} (${tokenInfo.error_description ?? ""})`);
        return;
      }
      if (!tokenInfo.scope || !tokenInfo.scope.includes("youtube")) {
        setExportError(`YouTubeスコープなし。再ログインしてください。\nscopes: ${tokenInfo.scope ?? "なし"}\nclient: ${tokenInfo.azp ?? "不明"}`);
        return;
      }
      // スコープOK → client IDをエラー表示に含めて追跡
      const debugClientId = tokenInfo.azp ?? "不明";

      const existingId = selectedYoutubePlaylist === "new" ? null : selectedYoutubePlaylist;
      const res = await fetch("/api/youtube/playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: playlistName, tracks: playlist, existingPlaylistId: existingId, googleToken }),
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        setShowYoutubeSelect(false);
      } else {
        setExportError(`${data.error ?? "不明なエラー"} [client: ${debugClientId}]`);
      }
    } catch (e: any) {
      setExportError(e?.message ?? "通信エラー");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>

      {/* ヘッダー */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: C.t2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          プレイリスト
        </div>
        {playlist.length > 0 && (
          <span style={{ background: C.acc, color: C.bg, borderRadius: "10px", padding: "0 7px", fontSize: "11px", fontWeight: 700, lineHeight: "18px" }}>
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
              <img src={track.album.images[0]?.url} alt={track.album.name} width={22} height={22} style={{ borderRadius: "4px", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.12)" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: C.t1, fontSize: "11px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{track.name}</div>
                <div style={{ color: C.t2, fontSize: "9px" }}>{track.artists[0]?.name}</div>
              </div>
              <button onClick={() => removeFromPlaylist(track.id)} style={{ background: "none", border: "none", color: C.t3, fontSize: "16px", cursor: "pointer", flexShrink: 0 }}>×</button>
            </div>
          ))
        )}
      </div>

      {/* ログイン済み: 保存UI / 未ログイン: 案内 */}
      {session ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 追加先セレクタ */}
          <select
            value={targetPlaylistId}
            onChange={(e) => setTargetPlaylistId(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "11px", outline: "none", boxSizing: "border-box" }}
          >
            <option value="new">── 新規作成 ──</option>
            {savedPlaylists.map((p) => (
              <option key={p.id} value={p.id}>{p.name}（{p.tracks.length}曲）</option>
            ))}
          </select>

          {/* 新規作成時のみ名前入力を表示 */}
          {targetPlaylistId === "new" && (
            <input
              type="text"
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="プレイリスト名"
              style={{ width: "100%", padding: "8px 10px", background: C.bg, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "11px", outline: "none", boxSizing: "border-box" }}
            />
          )}

          {/* 保存ボタン */}
          <button
            onClick={handleSave}
            disabled={playlist.length === 0 || saveStatus === "saving"}
            style={{
              width: "100%", padding: "10px",
              background: saveStatus === "saved" ? C.green : saveStatus === "error" ? C.red : "#fff",
              border: `1px solid ${saveStatus === "saved" ? C.green : saveStatus === "error" ? C.red : C.sep}`,
              borderRadius: "10px",
              color: saveStatus === "saved" || saveStatus === "error" ? "#fff" : playlist.length > 0 ? "#111" : C.t3,
              fontSize: "12px", fontWeight: 700,
              cursor: playlist.length > 0 ? "pointer" : "default",
              boxShadow: "none",
              transition: "background 0.2s",
            }}
          >
            {saveStatus === "saving" ? "保存中..."
              : saveStatus === "saved" ? "✓ 保存しました"
              : saveStatus === "error" ? "保存に失敗しました"
              : targetPlaylistId === "new" ? "プレイリストを保存" : "このプレイリストに追加"}
          </button>

          {/* 保存エラー詳細 */}
          {saveStatus === "error" && saveError && (
            <div style={{ fontSize: "10px", color: C.red, background: C.redDim, border: `1px solid rgba(255,59,48,0.2)`, borderRadius: "7px", padding: "6px 10px", wordBreak: "break-all" }}>
              エラー: {saveError}
            </div>
          )}

          {/* YouTube Music 書き出しボタン（常に表示・未Google認証時はグレーアウト） */}
          <button
            onClick={googleToken && playlist.length > 0 ? handleYoutubeExportClick : undefined}
            disabled={!googleToken || playlist.length === 0}
            title={!googleToken ? "Google アカウントでログインすると使用できます" : undefined}
            style={{
              width: "100%", padding: "10px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
              background: "#fff",
              border: `1px solid ${C.sep}`,
              borderRadius: "10px",
              color: googleToken && playlist.length > 0 ? "#111" : C.t3,
              fontSize: "12px", fontWeight: 700,
              cursor: googleToken && playlist.length > 0 ? "pointer" : "not-allowed",
              opacity: googleToken ? 1 : 0.55,
              transition: "background 0.15s",
            }}
          >
            {/* YouTube Music アイコン */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill={googleToken && playlist.length > 0 ? "#ff0000" : C.t3}>
              <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228s6.228-2.796 6.228-6.228S15.432 5.772 12 5.772zM9.684 15.54V8.46L16.2 12l-6.516 3.54z"/>
            </svg>
            YouTube Musicに変換
          </button>

          {/* YouTube 書き出し先選択 */}
          {showYoutubeSelect && (
            <div style={{ background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "11px", color: C.t2, fontWeight: 600 }}>書き出し先</div>
              <select
                value={selectedYoutubePlaylist}
                onChange={(e) => setSelectedYoutubePlaylist(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", background: C.bg, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "12px", outline: "none" }}
              >
                <option value="new">新規プレイリストを作成</option>
                {youtubePlaylists.map((p) => (
                  <option key={p.id} value={p.id}>{p.snippet.title}</option>
                ))}
              </select>
              <div style={{ display: "flex", gap: "6px" }}>
                <button onClick={handleExport} disabled={exporting} style={{ flex: 1, padding: "8px", background: "#1a1a1a", border: "none", borderRadius: "8px", color: "#fff", fontSize: "12px", fontWeight: 700, cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.7 : 1 }}>
                  {exporting ? "書き出し中..." : "書き出す"}
                </button>
                <button onClick={() => { setShowYoutubeSelect(false); setExportError(null); }} style={{ padding: "8px 12px", background: C.s2, border: "none", borderRadius: "8px", color: C.t2, fontSize: "12px", cursor: "pointer" }}>
                  キャンセル
                </button>
              </div>
              {exportError && (
                <div style={{ fontSize: "10px", color: C.red, background: C.redDim, border: `1px solid rgba(255,59,48,0.2)`, borderRadius: "7px", padding: "6px 10px", wordBreak: "break-all" }}>
                  エラー: {exportError}
                </div>
              )}
            </div>
          )}

        </div>
      ) : !authLoading ? (
        <div style={{ padding: "12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", display: "flex", alignItems: "flex-start", gap: "10px" }}>
          <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: "1px" }}>
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.96L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          <div style={{ fontSize: "11px", color: C.t2, lineHeight: 1.6 }}>
            Googleでログインすると、プレイリストを<strong style={{ color: C.t1 }}>YouTube Music</strong>に書き出せます
          </div>
        </div>
      ) : null}
    </div>
  );
}
