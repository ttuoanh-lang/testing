import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { gradeLocally } from "@/lib/localGrader";
import type { WordEntry } from "@/lib/types";

const client = new Anthropic({
  authToken: process.env.COMPASS_API_KEY,
  baseURL: "http://compass.llm.shopee.io/compass-api/v1",
});

// Switch to "local" to grade with a small model that runs in-process (no
// Compass VPN / API key needed) — see src/lib/localGrader.ts. This is a
// proof-of-concept substitute; "compass" (the default) is the real path.
const GRADING_PROVIDER = process.env.GRADING_PROVIDER === "local" ? "local" : "compass";

interface GradeRequestBody {
  round: number;
  words: WordEntry[];
  requiredCount: number;
  sentences: string[];
}

const SYSTEM_PROMPT =
  'You are a strict but encouraging Thai language teacher. Respond with ONLY compact JSON, no other text, in this exact shape: {"pass": true or false, "feedback": "1-2 short sentences in English"}';

function buildUserPrompt(round: number, words: WordEntry[], requiredCount: number, combinedText: string): string {
  const wordList = words.map((w) => `${w.thai} (${w.romanization}, "${w.meaning}")`).join(", ");
  return `Grading round ${round} of a Thai flashcard game.

Target vocabulary for this round: ${wordList}
The student must use at least ${requiredCount} of these words correctly in their writing.

Student's submission:
"""
${combinedText}
"""

Judge whether the submission (a) is grammatically reasonable Thai, and (b) genuinely uses at least ${requiredCount} of the target words in a meaningful way (not just listed).`;
}

function countUsedWords(words: WordEntry[], text: string): WordEntry[] {
  return words.filter((w) => text.includes(w.thai));
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as GradeRequestBody;
  const { round, words, requiredCount, sentences } = body;

  if (!round || !Array.isArray(words) || !requiredCount || !Array.isArray(sentences)) {
    return NextResponse.json({ error: "round, words, requiredCount and sentences are required" }, { status: 400 });
  }

  const combinedText = sentences.join(" ");
  const usedWords = countUsedWords(words, combinedText);

  if (usedWords.length < requiredCount) {
    const missing = words
      .filter((w) => !usedWords.includes(w))
      .map((w) => `${w.thai} (${w.meaning})`)
      .join(", ");
    return NextResponse.json({
      pass: false,
      feedback: `You need to use at least ${requiredCount} of the target word(s). Try including: ${missing}.`,
    });
  }

  if (GRADING_PROVIDER === "local") {
    try {
      const result = await gradeLocally(words, requiredCount, combinedText);
      return NextResponse.json(result);
    } catch {
      return NextResponse.json(
        { error: "Local model failed to grade. Please try again." },
        { status: 502 }
      );
    }
  }

  const userPrompt = buildUserPrompt(round, words, requiredCount, combinedText);

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const raw = textBlock?.type === "text" ? textBlock.text : "";

    try {
      const parsed = JSON.parse(raw.trim());
      return NextResponse.json({
        pass: Boolean(parsed.pass),
        feedback: String(parsed.feedback ?? ""),
      });
    } catch {
      return NextResponse.json({
        pass: false,
        feedback: "Couldn't grade that, please try again.",
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Couldn't reach the AI. Please try again." },
      { status: 502 }
    );
  }
}
