import { NextRequest, NextResponse } from "next/server";
import { searchTracks } from "@/lib/deezer";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const tracks = await searchTracks(query);
    return NextResponse.json({ tracks });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}