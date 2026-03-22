import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, tracks, user_id, slug, created_at")
    .eq("is_public", true)
    .not("slug", "is", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ playlists: [] });

  // user_id (UUID) から表示名を一括取得
  const userIds = [...new Set((data ?? []).map((p: any) => p.user_id).filter(Boolean))];
  const displayNameMap: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("users")
      .select("id, user_id")
      .in("id", userIds);
    (profiles ?? []).forEach((u: any) => {
      if (u.id && u.user_id) displayNameMap[u.id] = u.user_id;
    });
  }

  const playlists = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    created_by: displayNameMap[p.user_id] ?? "No name",
    track_count: Array.isArray(p.tracks) ? p.tracks.length : 0,
    artwork_url: Array.isArray(p.tracks) && p.tracks.length > 0
      ? (p.tracks[0]?.album?.images?.[0]?.url ?? null)
      : null,
  }));

  return NextResponse.json({ playlists });
}
