import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { google } from "googleapis";

export async function POST(request: NextRequest) {
  const session = await getServerSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
  }

  const { title, tracks } = await request.json();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });

  const youtube = google.youtube({ version: "v3", auth });

  try {
    const playlist = await youtube.playlists.insert({
      part: ["snippet", "status"],
      requestBody: {
        snippet: {
          title: title || "DJ Discovery Playlist",
          description: "Created by DJ Discovery",
        },
        status: {
          privacyStatus: "private",
        },
      },
    });

    const playlistId = playlist.data.id!;

    for (const track of tracks) {
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: `${track.name} ${track.artists[0].name}`,
        type: ["video"],
        maxResults: 1,
      });

      const videoId = searchRes.data.items?.[0]?.id?.videoId;
      if (!videoId) continue;

      await youtube.playlistItems.insert({
        part: ["snippet"],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: "youtube#video",
              videoId,
            },
          },
        },
      });
    }

    return NextResponse.json({ playlistId, url: `https://music.youtube.com/playlist?list=${playlistId}` });
  } catch (error) {
    console.error("YouTube error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}