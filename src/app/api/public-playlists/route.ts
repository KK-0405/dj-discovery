import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("playlists")
    .select("id, name, tracks, created_by, slug, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ playlists: [] });

  const playlists = (data ?? []).map((p: any) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    created_by: p.created_by ?? "unknown",
    track_count: Array.isArray(p.tracks) ? p.tracks.length : 0,
    artwork_url: Array.isArray(p.tracks) && p.tracks.length > 0
      ? (p.tracks[0]?.album?.images?.[0]?.url ?? null)
      : null,
  }));

  return NextResponse.json({ playlists });
}
