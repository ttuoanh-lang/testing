import path from "path";
import { env, pipeline, type TextGenerationPipeline } from "@huggingface/transformers";
import type { WordEntry } from "./types";

// Proof-of-concept grading path: runs a small (0.5B) instruct model fully
// in-process, no API key or network access to Compass required. Quality is
// noticeably weaker than the real Compass/claude-sonnet-4-6 path in
// src/app/api/grade/route.ts — this exists to prove the grading pipeline
// end-to-end while Shopee VPN / a Compass key aren't available.
const MODEL_ID = "onnx-community/Qwen2.5-0.5B-Instruct";

env.cacheDir = path.join(process.cwd(), ".model-cache");

let generatorPromise: Promise<TextGenerationPipeline> | null = null;

function getGenerator(): Promise<TextGenerationPipeline> {
  if (!generatorPromise) {
    generatorPromise = pipeline("text-generation", MODEL_ID, { dtype: "q4" });
  }
  return generatorPromise;
}

export interface LocalGradeResult {
  pass: boolean;
  feedback: string;
}

// Kept deliberately terse: this 0.5B model follows short, single-question
// instructions far more reliably than the longer multi-clause prompt used
// for Compass — the more instructions it's given, the more it drifts into
// rambling, malformed JSON.
const LOCAL_SYSTEM_PROMPT =
  'Output ONLY this JSON, nothing else: {"pass": true or false, "feedback": "one short sentence"}';

function buildLocalUserPrompt(words: WordEntry[], requiredCount: number, combinedText: string): string {
  const wordList = words.map((w) => w.thai).join(", ");
  return `Target words: ${wordList}. Required: use at least ${requiredCount} of them.
Sentence: "${combinedText}"
Does the sentence use enough target words and make basic sense?`;
}

export async function gradeLocally(
  words: WordEntry[],
  requiredCount: number,
  combinedText: string
): Promise<LocalGradeResult> {
  const generator = await getGenerator();

  const messages = [
    { role: "system", content: LOCAL_SYSTEM_PROMPT },
    { role: "user", content: buildLocalUserPrompt(words, requiredCount, combinedText) },
  ];

  const output = await generator(messages, { max_new_tokens: 60, do_sample: false });
  // transformers.js text-generation with chat input returns the full
  // conversation back; the model's reply is the last message.
  const generated = output[0]?.generated_text;
  const lastMessageContent = Array.isArray(generated) ? generated.at(-1)?.content : generated;
  const reply = typeof lastMessageContent === "string" ? lastMessageContent : JSON.stringify(lastMessageContent ?? "");

  try {
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : reply);
    return { pass: Boolean(parsed.pass), feedback: String(parsed.feedback ?? "") };
  } catch {
    return {
      pass: false,
      feedback: "[local model] Couldn't parse a graded response, please try again.",
    };
  }
}
