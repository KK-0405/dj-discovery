import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "env vars missing", clientId: !!clientId, clientSecret: !!clientSecret });
  }

  try {
    // トークン取得テスト
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
    });
    const tokenRaw = await tokenRes.text();
    let tokenData: any = null;
    try { tokenData = JSON.parse(tokenRaw); } catch { /* not json */ }

    if (!tokenData?.access_token) {
      return NextResponse.json({ step: "token_failed", status: tokenRes.status, raw: tokenRaw.slice(0, 300), parsed: tokenData });
    }

    // 検索テスト
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?q=radwimps&type=track&limit=3`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );
    const searchData = (await searchRes.json()) as any;

    return NextResponse.json({
      step: "search",
      tokenOk: true,
      searchStatus: searchRes.status,
      tracks: searchData?.tracks?.items?.map((t: any) => ({ name: t.name, artist: t.artists[0]?.name })) ?? [],
      error: searchData?.error ?? null,
    });
  } catch (e) {
    return NextResponse.json({ step: "catch", error: String(e) });
  }
}
