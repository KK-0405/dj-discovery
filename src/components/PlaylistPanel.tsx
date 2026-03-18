"use client";

import { useRef, useState } from "react";
import { signIn } from "next-auth/react";
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
} as const;

type Props = {
  session: any;
  playlist: Track[];
  removeFromPlaylist: (id: string) => void;
  savedPlaylists: SavedPlaylist[];
  playlistName: string;
  setPlaylistName: (v: string) => void;
  savePlaylist: () => void;
  deletePlaylist: (id: string) => void;
  setPlaylist: (tracks: Track[]) => void;
  exportToYouTube: (existingPlaylistId: string | null) => void;
};

export default function PlaylistPanel({
  session, playlist, removeFromPlaylist, savedPlaylists,
  playlistName, setPlaylistName, savePlaylist, deletePlaylist,
  setPlaylist, exportToYouTube,
}: Props) {
  const [showSaved, setShowSaved] = useState(false);
  const [showYoutubeSelect, setShowYoutubeSelect] = useState(false);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YoutubePlaylist[]>([]);
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState("new");
  const [exporting, setExporting] = useState(false);
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

  const handleYoutubeExportClick = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/youtube/playlists");
    const data = await res.json();
    setYoutubePlaylists(data.playlists ?? []);
    setShowYoutubeSelect(true);
  };

  const handleExport = async () => {
    setExporting(true);
    await exportToYouTube(selectedYoutubePlaylist === "new" ? null : selectedYoutubePlaylist);
    setExporting(false);
    setShowYoutubeSelect(false);
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

      {/* トラックリスト */}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {playlist.length === 0 && (
          <div style={{ padding: "16px 12px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "12px", textAlign: "center" }}>
            類似曲から追加してください
          </div>
        )}
        {playlist.map((track, index) => (
          <div
            key={track.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: C.s1, border: `1px solid ${C.sep}`,
              borderRadius: "8px", padding: "8px 10px", cursor: "grab",
            }}
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
        ))}
      </div>

      {/* ログイン / アクション */}
      {!session ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ padding: "10px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "10px", color: C.t3, fontSize: "11px", textAlign: "center", lineHeight: 1.5 }}>
            ログインすると保存・書き出しができます
          </div>
          <button
            onClick={() => signIn("google")}
            style={{ width: "100%", padding: "11px", background: "#4285f4", border: "none", borderRadius: "10px", color: "#fff", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
          >
            Google でログイン
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "11px", color: C.t3, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {session.user?.email}
          </div>

          <input
            type="text"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            style={{ width: "100%", padding: "8px 10px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t1, fontSize: "12px", outline: "none" }}
          />

          <button
            onClick={savePlaylist}
            disabled={playlist.length === 0}
            style={{
              width: "100%", padding: "10px",
              background: playlist.length > 0 ? C.acc : C.s1,
              border: `1px solid ${playlist.length > 0 ? C.acc : C.sep}`,
              borderRadius: "10px",
              color: playlist.length > 0 ? "#fff" : C.t3,
              fontSize: "13px", fontWeight: 700,
              cursor: playlist.length > 0 ? "pointer" : "default",
              boxShadow: playlist.length > 0 ? "0 2px 8px rgba(88,86,214,0.25)" : "none",
            }}
          >
            保存する
          </button>

          <button
            onClick={handleYoutubeExportClick}
            disabled={playlist.length === 0}
            style={{
              width: "100%", padding: "10px",
              background: playlist.length > 0 ? "#ff0000" : C.s1,
              border: `1px solid ${playlist.length > 0 ? "#ff0000" : C.sep}`,
              borderRadius: "10px",
              color: playlist.length > 0 ? "#fff" : C.t3,
              fontSize: "13px", fontWeight: 700,
              cursor: playlist.length > 0 ? "pointer" : "default",
            }}
          >
            YouTube に書き出し
          </button>

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

          <button
            onClick={() => setShowSaved(!showSaved)}
            style={{ width: "100%", padding: "8px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", color: C.t2, fontSize: "12px", fontWeight: 500, cursor: "pointer" }}
          >
            {showSaved ? "保存済みを隠す" : `保存済み（${savedPlaylists.length}）`}
          </button>

          {showSaved && (
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {savedPlaylists.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: C.s1, border: `1px solid ${C.sep}`, borderRadius: "8px", padding: "8px 10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: C.t1, fontSize: "12px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</div>
                    <div style={{ color: C.t3, fontSize: "10px" }}>{p.tracks.length}曲</div>
                  </div>
                  <button onClick={() => setPlaylist(p.tracks)} style={{ padding: "4px 8px", background: C.acc, border: "none", borderRadius: "6px", color: "#fff", fontSize: "11px", fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                    読込
                  </button>
                  <button onClick={() => deletePlaylist(p.id)} style={{ background: "none", border: "none", color: C.t3, fontSize: "16px", cursor: "pointer", flexShrink: 0 }}>×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
