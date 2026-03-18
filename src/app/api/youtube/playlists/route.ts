import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";

export async function GET(request: NextRequest) {
  const googleToken = request.headers.get("X-Google-Token");

  if (!googleToken) {
    return NextResponse.json({ error: "GoogleログインのアクセストークンがありItまりません" }, { status: 401 });
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: googleToken });
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
