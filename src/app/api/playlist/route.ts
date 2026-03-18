import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
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

  const { name, tracks } = await request.json();
  if (!name || !tracks) return NextResponse.json({ error: "name and tracks are required" }, { status: 400 });

  const { data, error } = await supabase
    .from("playlists")
    .insert({ name, tracks, user_email: user.email })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ playlist: data });
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.email) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

  const { id, tracks } = await request.json();

  const { data, error } = await supabase
    .from("playlists")
    .update({ tracks })
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
