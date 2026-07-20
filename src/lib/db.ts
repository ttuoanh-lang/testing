import Database from "better-sqlite3";
import path from "path";
import type { ScoreRow } from "./types";

const db = new Database(path.join(process.cwd(), "game.db"));

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    winner_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    rounds_completed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

const insertStmt = db.prepare(
  `INSERT INTO scores (winner_name, score, rounds_completed) VALUES (?, ?, ?)`
);

const topScoresStmt = db.prepare(
  `SELECT id, winner_name, score, rounds_completed, created_at
   FROM scores
   ORDER BY score DESC, created_at ASC
   LIMIT ?`
);

export function insertScore(winnerName: string, score: number, roundsCompleted: number): void {
  insertStmt.run(winnerName, score, roundsCompleted);
}

export function getTopScores(limit = 20): ScoreRow[] {
  return topScoresStmt.all(limit) as ScoreRow[];
}
