import Link from "next/link";
import { getTopScores } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function LeaderboardPage() {
  const scores = getTopScores(20);

  return (
    <main className="flex flex-col flex-1 max-w-md mx-auto w-full px-6 py-10">
      <h1 className="text-2xl font-bold text-center mb-6">🏆 Leaderboard</h1>

      {scores.length === 0 ? (
        <p className="text-center text-foreground/60">
          No scores yet — be the first to finish the game!
        </p>
      ) : (
        <ol className="flex flex-col gap-2">
          {scores.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between border rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="text-foreground/50 w-6 text-right">{i + 1}</span>
                <div>
                  <div className="font-semibold">{s.winner_name}</div>
                  <div className="text-xs text-foreground/60">
                    {s.rounds_completed}/10 rounds
                  </div>
                </div>
              </div>
              <span className="font-bold">{s.score} pts</span>
            </li>
          ))}
        </ol>
      )}

      <div className="flex-1" />
      <Link
        href="/"
        className="text-center rounded-lg border border-foreground font-semibold py-4 text-lg mt-6"
      >
        Back to Start
      </Link>
    </main>
  );
}
