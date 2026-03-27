import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@supabase/supabase-js";

// ユーザーのJWTを使ってRLS対応のクライアントを生成
function createUserClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

async function getAuthContext(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const db = createUserClient(token);
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return null;
  return { user, db };
}

// 8文字の URL-safe スラッグを生成
function generateSlug(): string {
  return randomBytes(6).toString("base64url").slice(0, 8);
}

export async function GET(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx?.user) return NextResponse.json({ playlists: [] });
  const { user, db } = ctx;

  const { data, error } = await db
    .from("playlists")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlists: data });
}

export async function POST(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx?.user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const { user, db } = ctx;

  const { name, tracks, is_public } = await request.json();
  if (!name || !tracks) return NextResponse.json({ error: "name and tracks are required" }, { status: 400 });

  const { data, error } = await db
    .from("playlists")
    .insert({
      name,
      tracks,
      user_email: user.email ?? null,
      user_id: user.id,
      is_public: is_public ?? false,
      slug: generateSlug(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function PATCH(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx?.user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const { user, db } = ctx;

  const body = await request.json();
  const { id, tracks, is_public, name } = body;

  const updates: Record<string, unknown> = {};
  if (tracks !== undefined) updates.tracks = tracks;
  if (is_public !== undefined) updates.is_public = is_public;
  if (name !== undefined) updates.name = name;

  const { data, error } = await db
    .from("playlists")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function DELETE(request: NextRequest) {
  const ctx = await getAuthContext(request);
  if (!ctx?.user) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  const { user, db } = ctx;

  const { id } = await request.json();

  const { error } = await db
    .from("playlists")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
