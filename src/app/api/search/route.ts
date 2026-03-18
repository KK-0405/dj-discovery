import { NextRequest, NextResponse } from "next/server";
import { searchTracks, searchArtists } from "@/lib/itunes";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const [tracks, artists] = await Promise.all([
      searchTracks(query),
      searchArtists(query),
    ]);
    return NextResponse.json({ tracks, artists });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
