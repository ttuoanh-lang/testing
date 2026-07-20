import { NextRequest, NextResponse } from "next/server";
import wordbank from "@/data/wordbank.json";
import { getRoundConfig, TOTAL_ROUNDS } from "@/lib/rounds";
import type { WordEntry } from "@/lib/types";

const ALL_WORDS = wordbank.words as WordEntry[];
const MAX_RANK = ALL_WORDS.length;

function pickWordsForRound(round: number, count: number): WordEntry[] {
  const rankCeiling = Math.max(count, Math.ceil((round / TOTAL_ROUNDS) * MAX_RANK));
  const pool = ALL_WORDS.filter((w) => w.rank <= rankCeiling);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function GET(request: NextRequest) {
  const roundParam = request.nextUrl.searchParams.get("round");
  const round = Number(roundParam);

  if (!roundParam || !Number.isInteger(round)) {
    return NextResponse.json({ error: "round query param is required" }, { status: 400 });
  }

  const config = getRoundConfig(round);
  if (!config) {
    return NextResponse.json({ error: `no such round: ${round}` }, { status: 400 });
  }

  const words = pickWordsForRound(round, config.newWords);

  return NextResponse.json({
    round: config.round,
    label: config.label,
    words,
    required: config.mustUse,
    sentences: config.sentences,
    minWordsPerSentence: config.minWordsPerSentence,
    minWordsTotal: config.minWordsTotal,
  });
}
