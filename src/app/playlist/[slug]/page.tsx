import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

const BASE_URL = "https://dj-discovery-ihhs.vercel.app";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase
    .from("playlists")
    .select("name, created_by")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();
  if (!data) return { title: "Ripple" };
  return {
    title: `${data.name} — Ripple`,
    description: `${data.created_by ?? "Someone"} のプレイリスト`,
  };
}

export default async function PublicPlaylistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const { data: playlist } = await supabase
    .from("playlists")
    .select("id, name, tracks, created_by, created_at, slug")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();

  if (!playlist) notFound();

  const tracks: {
    id: string;
    name: string;
    artists: { name: string }[];
    album: { name: string; images: { url: string }[] };
    bpm?: number;
    camelot?: string;
  }[] = playlist.tracks ?? [];

  const createdAt = playlist.created_at
    ? new Date(playlist.created_at).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0e0c1e", color: "#fff", fontFamily: "Inter, 'Hiragino Sans', sans-serif" }}>

      {/* ヘッダー */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
          <a href={BASE_URL} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <div style={{
              width: 28, height: 28,
              background: "linear-gradient(135deg, #3C3489, #26215C)",
              borderRadius: "7px",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(63,52,137,0.5)",
            }}>
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="2.2" fill="white" opacity="0.95"/>
                <circle cx="10" cy="10" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/>
                <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1.1" opacity="0.5"/>
              </svg>
            </div>
            <span style={{ fontSize: "14px", fontWeight: 700, color: "#fff", letterSpacing: "-0.01em" }}>Ripple</span>
          </a>
          <a
            href={BASE_URL}
            style={{
              padding: "7px 16px",
              background: "rgba(83,74,183,0.15)",
              border: "1px solid rgba(83,74,183,0.35)",
              borderRadius: "8px",
              color: "#a99ef0",
              fontSize: "13px", fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Rippleで開く →
          </a>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ maxWidth: "720px", margin: "0 auto", padding: "48px 32px" }}>

        {/* プレイリスト情報 */}
        <div style={{ marginBottom: "40px" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#534AB7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
            Public Playlist
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 12px" }}>
            {playlist.name}
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
            {playlist.created_by && (
              <span>by <strong style={{ color: "rgba(255,255,255,0.7)" }}>{playlist.created_by}</strong></span>
            )}
            <span>{tracks.length}曲</span>
            {createdAt && <span>{createdAt}</span>}
          </div>
        </div>

        {/* トラックリスト */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {tracks.map((track, i) => (
            <div
              key={track.id}
              style={{
                display: "flex", alignItems: "center", gap: "14px",
                padding: "10px 12px", borderRadius: "10px",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", width: "20px", textAlign: "right", flexShrink: 0 }}>
                {i + 1}
              </span>
              {track.album.images[0]?.url && (
                <img
                  src={track.album.images[0].url}
                  alt={track.album.name}
                  width={44} height={44}
                  style={{ borderRadius: "8px", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.4)" }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {track.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "2px" }}>
                  {track.artists.map((a) => a.name).join(", ")}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                {track.bpm && (
                  <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.06)", padding: "2px 7px", borderRadius: "5px" }}>
                    {track.bpm} BPM
                  </span>
                )}
                {track.camelot && (
                  <span style={{ fontSize: "11px", color: "#5b9cf6", background: "rgba(91,156,246,0.12)", padding: "2px 7px", borderRadius: "5px", fontWeight: 600 }}>
                    {track.camelot}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* フッター */}
        <div style={{ marginTop: "48px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.07)", textAlign: "center" }}>
          <a
            href={BASE_URL}
            style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "12px 24px",
              background: "linear-gradient(135deg, #3C3489, #534AB7)",
              borderRadius: "12px",
              color: "#fff", fontSize: "14px", fontWeight: 700,
              textDecoration: "none",
              boxShadow: "0 4px 20px rgba(83,74,183,0.4)",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="2.2" fill="white" opacity="0.95"/>
              <circle cx="10" cy="10" r="5" fill="none" stroke="white" strokeWidth="1.6" opacity="0.8"/>
              <circle cx="10" cy="10" r="8" fill="none" stroke="white" strokeWidth="1.1" opacity="0.5"/>
            </svg>
            Rippleで同じ曲を探す
          </a>
          <p style={{ marginTop: "16px", fontSize: "12px", color: "rgba(255,255,255,0.25)" }}>
            Ripple — Find Your Sound
          </p>
        </div>
      </div>
    </div>
  );
}
