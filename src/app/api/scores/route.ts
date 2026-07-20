import { NextRequest, NextResponse } from "next/server";
import { getTopScores, insertScore } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const winnerName = String(body.winner_name ?? "").trim();
  const score = Number(body.score);
  const roundsCompleted = Number(body.rounds_completed ?? 0);

  if (!winnerName || !Number.isFinite(score)) {
    return NextResponse.json({ error: "winner_name and score are required" }, { status: 400 });
  }

  await insertScore(winnerName, score, roundsCompleted);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ scores: await getTopScores(20) });
}
