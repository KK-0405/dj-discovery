"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { type Track } from "@/lib/lastfm";

type Mode = "search" | "similar";
type YoutubePlaylist = { id: string; snippet: { title: string } };

export default function Home() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [mainSeed, setMainSeed] = useState<Track | null>(null);
  const [subSeeds, setSubSeeds] = useState<Track[]>([]);
  const [similarTracks, setSimilarTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [mode, setMode] = useState<Mode>("search");
  const [bpmMin, setBpmMin] = useState("");
  const [bpmMax, setBpmMax] = useState("");
  const [showBpmFilter, setShowBpmFilter] = useState(false);
  const [savedPlaylists, setSavedPlaylists] = useState<{id: string; name: string; tracks: Track[]}[]>([]);
  const [playlistName, setPlaylistName] = useState("DJ Discovery Playlist");
  const [showSaved, setShowSaved] = useState(false);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YoutubePlaylist[]>([]);
  const [selectedYoutubePlaylist, setSelectedYoutubePlaylist] = useState<string>("new");
  const [showYoutubeSelect, setShowYoutubeSelect] = useState(false);
  const [exporting, setExporting] = useState(false);

  const search = async () => {
    if (!query) return;
    setLoading(true);
    setMode("search");
    setSimilarTracks([]);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setTracks(data.tracks ?? []);
    } catch (e) {
      setTracks([]);
    }
    setLoading(false);
  };

  const exploreSimilar = async () => {
    if (!mainSeed) return;
    setLoading(true);
    setMode("similar");
    try {
      const artist = mainSeed.artists[0].name;
      const track = mainSeed.name;
      const res = await fetch(
        `/api/similar?artist=${encodeURIComponent(artist)}&track=${encodeURIComponent(track)}`
      );
      const data = await res.json();
      setSimilarTracks(data.tracks ?? []);
    } catch (e) {
      setSimilarTracks([]);
    }
    setLoading(false);
  };

  const loadYoutubePlaylists = async () => {
    const res = await fetch("/api/youtube/playlists");
    const data = await res.json();
    setYoutubePlaylists(data.playlists ?? []);
  };

  const exportToYouTube = async () => {
    if (playlist.length === 0) return;
    setExporting(true);
    const res = await fetch("/api/youtube/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: playlistName,
        tracks: playlist,
        existingPlaylistId: selectedYoutubePlaylist === "new" ? null : selectedYoutubePlaylist,
      }),
    });
    const data = await res.json();
    setExporting(false);
    if (data.url) {
      window.open(data.url, "_blank");
    } else {
      alert("エラーが発生しました");
    }
  };

  const handleYoutubeExportClick = async () => {
    if (playlist.length === 0) return;
    await loadYoutubePlaylists();
    setShowYoutubeSelect(true);
  };

  const savePlaylist = async () => {
    if (playlist.length === 0) return;
    const res = await fetch("/api/playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: playlistName, tracks: playlist }),
    });
    const data = await res.json();
    if (data.playlist) {
      alert("プレイリストを保存しました！");
      loadPlaylists();
    }
  };

  const loadPlaylists = async () => {
    const res = await fetch("/api/playlist");
    const data = await res.json();
    setSavedPlaylists(data.playlists ?? []);
  };

  const deletePlaylist = async (id: string) => {
    await fetch("/api/playlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    loadPlaylists();
  };

  const setAsMainSeed = (track: Track) => setMainSeed(track);

  const addToSubSeed = (track: Track) => {
    if (subSeeds.find((t) => t.id === track.id)) return;
    if (mainSeed?.id === track.id) return;
    setSubSeeds([...subSeeds, track]);
  };

  const removeSubSeed = (id: string) => setSubSeeds(subSeeds.filter((t) => t.id !== id));

  const addToPlaylist = (track: Track) => {
    if (playlist.find((t) => t.id === track.id)) return;
    setPlaylist([...playlist, track]);
  };

  const removeFromPlaylist = (id: string) => setPlaylist(playlist.filter((t) => t.id !== id));

  const isInPlaylist = (track: Track) => !!playlist.find((t) => t.id === track.id);

  const filteredSimilar = similarTracks.filter((track) => {
    if (bpmMin && track.bpm < parseInt(bpmMin)) return false;
    if (bpmMax && track.bpm > parseInt(bpmMax)) return false;
    return true;
  });

  const displayTracks = mode === "similar" ? filteredSimilar : tracks;

  useEffect(() => {
    loadPlaylists();
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", background: "#111", fontFamily: "sans-serif", color: "#fff" }}>

      {/* サイドバー */}
      <div style={{ width: "200px", background: "#0a0a0a", padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "4px", borderRight: "0.5px solid #333" }}>
        <div style={{ fontSize: "16px", fontWeight: 500, color: "#fff", marginBottom: "1.5rem", paddingLeft: "8px" }}>DJ Discovery</div>
        <div style={{ padding: "8px 12px", borderRadius: "8px", background: "#1db954", color: "#fff", fontSize: "13px", fontWeight: 500 }}>Search</div>
        <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Discovery Graph</div>
        <div style={{ padding: "8px 12px", borderRadius: "8px", color: "#888", fontSize: "13px" }}>Playlist Builder</div>
        <div style={{ marginTop: "auto", paddingTop: "12px" }}>
          {session ? (
            <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>
              {session.user?.email}
            </div>
          ) : null}
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* 検索バー */}
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

        {/* モード表示 + BPMフィルター */}
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
              <div style={{ color: "#666", fontSize: "12px" }}>{filteredSimilar.length}曲</div>
            </>
          )}
        </div>

        {/* 曲一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem 1.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
          {loading && <p style={{ color: "#888" }}>読み込み中...</p>}
          {mode === "search" && !loading && tracks.length === 0 && (
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
              </div>
              <div style={{ textAlign: "right", minWidth: "60px" }}>
                <div style={{ color: "#1db954", fontSize: "12px", fontWeight: 500 }}>{track.bpm ? `${track.bpm} BPM` : ""}</div>
                <div style={{ color: "#666", fontSize: "11px" }}>{track.key}</div>
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

      {/* 右パネル：Seed + プレイリスト */}
      <div style={{ width: "240px", background: "#0d0d0d", borderLeft: "0.5px solid #333", padding: "1.25rem 1rem", display: "flex", flexDirection: "column", gap: "16px", overflowY: "auto" }}>

        {/* Seedセクション */}
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
          <button
            onClick={exploreSimilar}
            disabled={!mainSeed}
            style={{ width: "100%", marginTop: "12px", padding: "8px", background: mainSeed ? "#1db954" : "#222", border: "none", borderRadius: "8px", color: mainSeed ? "#fff" : "#555", fontSize: "13px", fontWeight: 500, cursor: mainSeed ? "pointer" : "default" }}
          >
            類似曲を探索
          </button>
        </div>

        <div style={{ borderTop: "0.5px solid #333" }} />

        {/* プレイリストセクション */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" }}>プレイリスト（{playlist.length}曲）</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {playlist.length === 0 && (
              <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>類似曲から追加</div>
            )}
            {playlist.map((track) => (
              <div key={track.id} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#1a1a1a", borderRadius: "6px", padding: "8px" }}>
                <img src={track.album.images[0]?.url} alt={track.album.name} width={28} height={28} style={{ borderRadius: "3px", flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: "11px" }}>{track.name}</div>
                  <div style={{ color: "#666", fontSize: "10px" }}>{track.artists[0].name}</div>
                </div>
                <button onClick={() => removeFromPlaylist(track.id)} style={{ background: "none", border: "none", color: "#555", fontSize: "14px", cursor: "pointer" }}>×</button>
              </div>
            ))}
          </div>

          {!session ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "auto" }}>
              <div style={{ padding: "8px", background: "#1a1a1a", borderRadius: "6px", color: "#555", fontSize: "11px", textAlign: "center" }}>
                ログインすると保存・書き出しができます
              </div>
              <button
                onClick={() => signIn("google")}
                style={{ width: "100%", padding: "8px", background: "#4285f4", border: "none", borderRadius: "8px", color: "#fff", fontSize: "13px", fontWeight: 500, cursor: "pointer" }}
              >
                Googleでログイン
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "auto" }}>
              <div style={{ fontSize: "11px", color: "#666", textAlign: "center" }}>{session.user?.email}</div>
              <input
                type="text"
                value={playlistName}
                onChange={(e) => setPlaylistName(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", background: "#222", border: "0.5px solid #444", borderRadius: "6px", color: "#fff", fontSize: "11px", outline: "none" }}
              />
              <button
                onClick={savePlaylist}
                style={{ width: "100%", padding: "8px", background: playlist.length > 0 ? "#1db954" : "#222", border: "none", borderRadius: "8px", color: playlist.length > 0 ? "#fff" : "#555", fontSize: "13px", fontWeight: 500, cursor: playlist.length > 0 ? "pointer" : "default" }}
              >
                保存する
              </button>
              <button
                onClick={handleYoutubeExportClick}
                style={{ width: "100%", padding: "8px", background: playlist.length > 0 ? "#ff0000" : "#222", border: "none", borderRadius: "8px", color: playlist.length > 0 ? "#fff" : "#555", fontSize: "13px", fontWeight: 500, cursor: playlist.length > 0 ? "pointer" : "default" }}
              >
                YouTubeに書き出し
              </button>
              {showYoutubeSelect && (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", background: "#1a1a1a", borderRadius: "8px", padding: "10px" }}>
                  <div style={{ fontSize: "11px", color: "#aaa" }}>書き出し先を選択</div>
                  <select
                    value={selectedYoutubePlaylist}
                    onChange={(e) => setSelectedYoutubePlaylist(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", background: "#222", border: "0.5px solid #444", borderRadius: "6px", color: "#fff", fontSize: "11px", outline: "none" }}
                  >
                    <option value="new">新規プレイリストを作成</option>
                    {youtubePlaylists.map((p) => (
                      <option key={p.id} value={p.id}>{p.snippet.title}</option>
                    ))}
                  </select>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={exportToYouTube}
                      style={{ flex: 1, padding: "6px", background: "#ff0000", border: "none", borderRadius: "6px", color: "#fff", fontSize: "11px", fontWeight: 500, cursor: "pointer" }}
                    >
                      {exporting ? "書き出し中..." : "書き出す"}
                    </button>
                    <button
                      onClick={() => setShowYoutubeSelect(false)}
                      style={{ padding: "6px 10px", background: "#333", border: "none", borderRadius: "6px", color: "#aaa", fontSize: "11px", cursor: "pointer" }}
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowSaved(!showSaved)}
                style={{ width: "100%", padding: "6px", background: "#222", border: "none", borderRadius: "6px", color: "#888", fontSize: "11px", cursor: "pointer" }}
              >
                {showSaved ? "保存済みを隠す" : `保存済み（${savedPlaylists.length}）`}
              </button>
              {showSaved && savedPlaylists.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a1a1a", borderRadius: "6px", padding: "6px 8px" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: "#fff", fontSize: "11px" }}>{p.name}</div>
                    <div style={{ color: "#666", fontSize: "10px" }}>{p.tracks.length}曲</div>
                  </div>
                  <button onClick={() => setPlaylist(p.tracks)} style={{ padding: "2px 6px", background: "#333", border: "none", borderRadius: "4px", color: "#aaa", fontSize: "10px", cursor: "pointer" }}>読込</button>
                  <button onClick={() => deletePlaylist(p.id)} style={{ background: "none", border: "none", color: "#555", fontSize: "12px", cursor: "pointer" }}>×</button>
                </div>
              ))}
            </div>
          )}
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "0.5px solid #222", textAlign: "center" }}>
            <a href="https://getsongbpm.com" target="_blank" rel="noreferrer" style={{ color: "#444", fontSize: "10px", textDecoration: "none" }}>
              BPM data by GetSongBPM
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}