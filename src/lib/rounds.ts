import type { RoundConfig } from "./types";

export const ROUNDS: RoundConfig[] = [
  { round: 1, newWords: 2, mustUse: 1, sentences: 1, minWordsPerSentence: 3, minWordsTotal: 3, label: "Warm up" },
  { round: 2, newWords: 2, mustUse: 2, sentences: 1, minWordsPerSentence: 5, minWordsTotal: 5, label: "Both words" },
  { round: 3, newWords: 3, mustUse: 2, sentences: 1, minWordsPerSentence: 6, minWordsTotal: 6, label: "Pick two of three" },
  { round: 4, newWords: 3, mustUse: 3, sentences: 2, minWordsPerSentence: 5, minWordsTotal: 10, label: "Two sentences" },
  { round: 5, newWords: 4, mustUse: 3, sentences: 2, minWordsPerSentence: 6, minWordsTotal: 12, label: "Three of four" },
  { round: 6, newWords: 4, mustUse: 4, sentences: 2, minWordsPerSentence: 7, minWordsTotal: 14, label: "All four words" },
  { round: 7, newWords: 5, mustUse: 4, sentences: 3, minWordsPerSentence: 0, minWordsTotal: 20, label: "Mini paragraph" },
  { round: 8, newWords: 5, mustUse: 5, sentences: 3, minWordsPerSentence: 0, minWordsTotal: 25, label: "All five words" },
  { round: 9, newWords: 6, mustUse: 5, sentences: 4, minWordsPerSentence: 0, minWordsTotal: 35, label: "Full paragraph" },
  { round: 10, newWords: 6, mustUse: 6, sentences: 5, minWordsPerSentence: 0, minWordsTotal: 50, label: "Grand finale" },
];

export const TOTAL_ROUNDS = ROUNDS.length;

export function getRoundConfig(round: number): RoundConfig | undefined {
  return ROUNDS.find((r) => r.round === round);
}

export const MAX_ATTEMPTS_PER_ROUND = 3;
export const POINTS_FIRST_TRY = 10;
export const POINTS_AFTER_RETRY = 5;
