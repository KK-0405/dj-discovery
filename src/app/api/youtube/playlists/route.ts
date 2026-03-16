import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";

export async function GET() {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });
  const youtube = google.youtube({ version: "v3", auth });

  try {
    const res = await youtube.playlists.list({
      part: ["snippet"],
      mine: true,
      maxResults: 50,
    });

    return NextResponse.json({ playlists: res.data.items });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}