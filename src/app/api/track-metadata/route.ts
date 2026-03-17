import { NextRequest, NextResponse } from "next/server";
import { getMetadataBatch, getMetadataFromAudio } from "@/lib/gemini";

export async function POST(request: NextRequest) {
  try {
    const { tracks } = (await request.json()) as {
      tracks: { id: string; title: string; artist: string; preview?: string }[];
    };

    if (!tracks?.length) {
      return NextResponse.json({ metadata: [] });
    }

    // Step A: テキストベースで一括解析
    const batchResult = await getMetadataBatch(
      tracks.map((t) => ({ title: t.title, artist: t.artist }))
    );

    // Step B: 信頼度が "low" かつ previewURL があるトラックは音声解析にフォールバック
    const finalResults = await Promise.all(
      batchResult.results.map(async (meta, i) => {
        if (meta?.confidence !== "low") return meta;
        const preview = tracks[i].preview;
        if (!preview) return meta;

        try {
          // Deezerプレビューを取得してbase64に変換
          const audioRes = await fetch(preview);
          if (!audioRes.ok) return meta;
          const buffer = await audioRes.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const audioMeta = await getMetadataFromAudio(tracks[i].title, tracks[i].artist, base64);
          return audioMeta ?? meta;
        } catch {
          return meta;
        }
      })
    );

    return NextResponse.json({ metadata: finalResults });
  } catch (error) {
    console.error("track-metadata error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
