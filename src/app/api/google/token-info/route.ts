import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { token } = await request.json();
  if (!token) return NextResponse.json({ error: "no token" }, { status: 400 });

  const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${token}`);
  const data = await res.json();
  return NextResponse.json(data);
}
