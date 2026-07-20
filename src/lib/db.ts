import { createClient } from "@supabase/supabase-js";
import type { ScoreRow } from "./types";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function insertScore(winnerName: string, score: number, roundsCompleted: number): Promise<void> {
  const { error } = await supabase
    .from("scores")
    .insert({ winner_name: winnerName, score, rounds_completed: roundsCompleted });

  if (error) throw error;
}

export async function getTopScores(limit = 20): Promise<ScoreRow[]> {
  const { data, error } = await supabase
    .from("scores")
    .select("id, winner_name, score, rounds_completed, created_at")
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data as ScoreRow[];
}
