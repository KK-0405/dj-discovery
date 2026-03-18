import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { supabase } from "@/lib/supabase";

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// 8文字の URL-safe スラッグを生成
function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.email) return NextResponse.json({ playlists: [] });

  const { data, error } = await supabase
    .from("playlists")
    .select("*")
    .eq("user_email", user.email)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlists: data });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.email) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { name, tracks, is_public } = await request.json();
  if (!name || !tracks) return NextResponse.json({ error: "name and tracks are required" }, { status: 400 });

  // 作成者の表示IDを取得
  const { data: profile } = await supabase
    .from("users")
    .select("user_id")
    .eq("id", user.id)
    .single();
  const createdBy = profile?.user_id ?? user.email.split("@")[0];

  const { data, error } = await supabase
    .from("playlists")
    .insert({
      name,
      tracks,
      user_email: user.email,
      user_id: user.id,
      is_public: is_public ?? false,
      slug: generateSlug(),
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.email) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const body = await request.json();
  const { id, tracks, is_public } = body;

  const updates: Record<string, unknown> = {};
  if (tracks !== undefined) updates.tracks = tracks;
  if (is_public !== undefined) updates.is_public = is_public;

  const { data, error } = await supabase
    .from("playlists")
    .update(updates)
    .eq("id", id)
    .eq("user_email", user.email)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.email) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { id } = await request.json();

  const { error } = await supabase
    .from("playlists")
    .delete()
    .eq("id", id)
    .eq("user_email", user.email);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
