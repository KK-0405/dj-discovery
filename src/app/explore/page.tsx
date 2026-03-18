import { supabase } from "@/lib/supabase";

const BASE_URL = "https://dj-discovery-ihhs.vercel.app";

export const metadata = {
  title: "Explore — Ripple",
  description: "みんなの公開プレイリストを探そう",
};

export const revalidate = 60; // 1分キャッシュ

export default async function ExplorePage() {
  const { data: playlists } = await supabase
    .from("playlists")
    .select("id, name, slug, tracks, created_by, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = playlists ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#0e0c1e", color: "#fff", fontFamily: "Inter, 'Hiragino Sans', sans-serif" }}>

      {/* ヘッダー */}
      <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "0 32px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", height: "56px" }}>
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
            アプリを開く →
          </a>
        </div>
      </div>

      {/* ページタイトル */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "48px 32px 32px" }}>
        <div style={{ fontSize: "11px", fontWeight: 600, color: "#534AB7", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
          Community
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", margin: "0 0 8px" }}>
          みんなのプレイリスト
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.4)", margin: 0 }}>
          公開されているプレイリストを新着順で表示しています
        </p>
      </div>

      {/* プレイリスト一覧 */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "0 32px 64px" }}>
        {items.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "rgba(255,255,255,0.3)", fontSize: "15px" }}>
            まだ公開プレイリストはありません
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
            {items.map((p) => {
              const tracks: { id: string; name: string; artists: { name: string }[]; album: { images: { url: string }[] } }[] = p.tracks ?? [];
              const createdAt = p.created_at
                ? new Date(p.created_at).toLocaleDateString("ja-JP", { month: "short", day: "numeric" })
                : null;

              return (
                <a
                  key={p.id}
                  href={`/playlist/${p.slug}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: "14px",
                      overflow: "hidden",
                      transition: "border-color 0.15s, background 0.15s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(83,74,183,0.5)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(83,74,183,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                    }}
                  >
                    {/* アルバムアートグリッド */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", height: "120px", overflow: "hidden" }}>
                      {[0, 1, 2, 3].map((i) => {
                        const img = tracks[i]?.album.images[0]?.url;
                        return img ? (
                          <img
                            key={i}
                            src={img}
                            alt=""
                            style={{ width: "100%", height: "60px", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div key={i} style={{ background: "rgba(83,74,183,0.15)", height: "60px" }} />
                        );
                      })}
                    </div>

                    {/* 情報 */}
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ color: "#fff", fontSize: "14px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "4px" }}>
                        {p.name}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>
                          {p.created_by ? `by ${p.created_by}` : ""}
                        </span>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "11px" }}>{tracks.length}曲</span>
                          {createdAt && <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "11px" }}>{createdAt}</span>}
                        </div>
                      </div>

                      {/* 先頭3曲プレビュー */}
                      {tracks.slice(0, 3).map((t) => (
                        <div key={t.id} style={{ color: "rgba(255,255,255,0.35)", fontSize: "11px", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.name} — {t.artists[0]?.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
