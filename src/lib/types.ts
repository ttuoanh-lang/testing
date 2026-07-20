export interface WordEntry {
  id: string;
  thai: string;
  romanization: string;
  meaning: string;
  rank: number; // 1 = most frequent
  category: string;
}

export interface RoundConfig {
  round: number;
  newWords: number;
  mustUse: number;
  sentences: number;
  minWordsPerSentence: number;
  minWordsTotal: number;
  label: string;
}

export interface ScoreRow {
  id: number;
  winner_name: string;
  score: number;
  rounds_completed: number;
  created_at: string;
}
