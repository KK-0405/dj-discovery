import { NextRequest, NextResponse } from "next/server";
import { getSimilarTracks } from "@/lib/spotify";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const artist = searchParams.get("artist");
  const track = searchParams.get("track");

  if (!artist || !track) {
    return NextResponse.json({ error: "artist and track are required" }, { status: 400 });
  }

  try {
    const tracks = await getSimilarTracks(artist, track);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Similar error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}