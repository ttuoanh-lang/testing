"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { MAX_ATTEMPTS_PER_ROUND, POINTS_AFTER_RETRY, POINTS_FIRST_TRY, TOTAL_ROUNDS } from "@/lib/rounds";
import type { WordEntry } from "@/lib/types";

interface RoundData {
  round: number;
  label: string;
  words: WordEntry[];
  required: number;
  sentences: number;
  minWordsPerSentence: number;
  minWordsTotal: number;
}

type Phase = "showWords" | "collectSentence" | "grading" | "feedback" | "gameOver";

interface GradeResult {
  pass: boolean;
  feedback: string;
}

function countThaiWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function PlayPage() {
  const router = useRouter();
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [round, setRound] = useState(1);
  const [roundData, setRoundData] = useState<RoundData | null>(null);
  const [phase, setPhase] = useState<Phase>("showWords");
  const isRoundLoading = !roundData || roundData.round !== round;
  const [answers, setAnswers] = useState<string[]>([]);
  const [attempt, setAttempt] = useState(1);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [score, setScore] = useState(0);
  const [roundsCompleted, setRoundsCompleted] = useState(0);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [scoreSubmitted, setScoreSubmitted] = useState(false);

  useEffect(() => {
    // sessionStorage only exists client-side, so this must run post-mount
    // rather than during the lazy-init render (avoids an SSR/hydration mismatch).
    const name = sessionStorage.getItem("playerName");
    if (!name) {
      router.replace("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlayerName(name);
  }, [router]);

  useEffect(() => {
    if (!playerName) return;
    fetch(`/api/words?round=${round}`)
      .then((res) => res.json())
      .then((data: RoundData) => {
        setRoundData(data);
        setAnswers(Array.from({ length: data.sentences }, () => ""));
        setAttempt(1);
        setResult(null);
        setPhase("showWords");
      });
  }, [playerName, round]);

  const totalWordsTyped = useMemo(
    () => answers.reduce((sum, a) => sum + countThaiWords(a), 0),
    [answers]
  );

  const meetsMinimums = useMemo(() => {
    if (!roundData) return false;
    if (answers.some((a) => a.trim().length === 0)) return false;
    if (roundData.minWordsPerSentence > 0) {
      if (answers.some((a) => countThaiWords(a) < roundData.minWordsPerSentence)) return false;
    }
    return totalWordsTyped >= roundData.minWordsTotal;
  }, [answers, roundData, totalWordsTyped]);

  async function submitAnswer() {
    if (!roundData) return;
    setPhase("grading");
    const res = await fetch("/api/grade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round: roundData.round,
        words: roundData.words,
        requiredCount: roundData.required,
        sentences: answers,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setResult({ pass: false, feedback: data.error ?? "Something went wrong. Please try again." });
    } else {
      setResult(data as GradeResult);
    }
    setPhase("feedback");
  }

  function retry() {
    setAttempt((a) => a + 1);
    setPhase("collectSentence");
  }

  function advance(pointsEarned: number) {
    setScore((s) => s + pointsEarned);
    setRoundsCompleted((r) => r + 1);
    if (round < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
    } else {
      setPhase("gameOver");
    }
  }

  function onPass() {
    const points = attempt === 1 ? POINTS_FIRST_TRY : POINTS_AFTER_RETRY;
    advance(points);
  }

  function onSkip() {
    advance(0);
  }

  async function submitScore() {
    if (!playerName || submittingScore) return;
    setSubmittingScore(true);
    await fetch("/api/scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        winner_name: playerName,
        score,
        rounds_completed: roundsCompleted,
      }),
    });
    setSubmittingScore(false);
    setScoreSubmitted(true);
  }

  if (!playerName) return null;

  return (
    <main className="flex flex-col flex-1 max-w-md mx-auto w-full">
      {phase !== "gameOver" && (
        <div className="px-6 pt-6 pb-2">
          <div className="flex justify-between text-sm text-foreground/70 mb-1">
            <span>Round {round} / {TOTAL_ROUNDS}</span>
            <span>Score: {score}</span>
          </div>
          <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all"
              style={{ width: `${((round - 1) / TOTAL_ROUNDS) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pb-6">
        {isRoundLoading && (
          <div className="flex-1 flex items-center justify-center text-foreground/60">
            Loading round...
          </div>
        )}

        {!isRoundLoading && phase === "showWords" && roundData && (
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-xl font-semibold mt-4">{roundData.label}</h2>
            <p className="text-sm text-foreground/60">
              Memorize these word{roundData.words.length > 1 ? "s" : ""}, then use at
              least {roundData.required} of them in your writing.
            </p>
            <div className="flex flex-col gap-3">
              {roundData.words.map((w) => (
                <div key={w.id} className="border rounded-xl px-5 py-4">
                  <div className="text-3xl font-bold">{w.thai}</div>
                  <div className="text-sm text-foreground/70 mt-1">{w.romanization}</div>
                  <div className="text-base mt-1">{w.meaning}</div>
                </div>
              ))}
            </div>
            <div className="flex-1" />
            <button
              className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg"
              onClick={() => setPhase("collectSentence")}
            >
              I&apos;m Ready
            </button>
          </div>
        )}

        {!isRoundLoading && phase === "collectSentence" && roundData && (
          <div className="flex-1 flex flex-col gap-4">
            <h2 className="text-xl font-semibold mt-4">Write in Thai</h2>
            <div className="flex flex-wrap gap-2">
              {roundData.words.map((w) => (
                <span
                  key={w.id}
                  className="text-sm border rounded-full px-3 py-1 text-foreground/70"
                >
                  {w.thai} ({w.meaning})
                </span>
              ))}
            </div>
            {attempt > 1 && (
              <p className="text-sm text-amber-600">
                Attempt {attempt} of {MAX_ATTEMPTS_PER_ROUND}
              </p>
            )}
            <div className="flex flex-col gap-3">
              {answers.map((value, i) => (
                <textarea
                  key={i}
                  className="border rounded-lg px-4 py-3 text-lg leading-relaxed bg-transparent min-h-24"
                  placeholder={answers.length > 1 ? `Sentence ${i + 1}` : "Type your sentence..."}
                  value={value}
                  onChange={(e) => {
                    const next = [...answers];
                    next[i] = e.target.value;
                    setAnswers(next);
                  }}
                />
              ))}
            </div>
            <p className="text-sm text-foreground/60">
              {totalWordsTyped} / {roundData.minWordsTotal} words minimum
            </p>
            <div className="flex-1" />
            <button
              className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg disabled:opacity-40"
              disabled={!meetsMinimums}
              onClick={submitAnswer}
            >
              Submit
            </button>
          </div>
        )}

        {!isRoundLoading && phase === "grading" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-foreground/70">
            <div className="w-10 h-10 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin" />
            <p>Checking your Thai...</p>
          </div>
        )}

        {!isRoundLoading && phase === "feedback" && result && (
          <div className="flex-1 flex flex-col gap-4">
            <div
              className={`rounded-xl px-5 py-6 text-center ${
                result.pass ? "bg-green-500/10" : "bg-red-500/10"
              }`}
            >
              <div className="text-4xl mb-2">{result.pass ? "✅" : "❌"}</div>
              <p className="text-lg font-semibold">
                {result.pass ? "Well done!" : "Not quite yet"}
              </p>
              <p className="text-sm mt-2 text-foreground/70">{result.feedback}</p>
            </div>
            <div className="flex-1" />
            {result.pass ? (
              <button
                className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg"
                onClick={onPass}
              >
                {round < TOTAL_ROUNDS ? "Continue" : "Finish"}
              </button>
            ) : attempt < MAX_ATTEMPTS_PER_ROUND ? (
              <button
                className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg"
                onClick={retry}
              >
                Try Again
              </button>
            ) : (
              <button
                className="w-full rounded-lg border border-foreground font-semibold py-4 text-lg"
                onClick={onSkip}
              >
                Skip Round
              </button>
            )}
          </div>
        )}

        {phase === "gameOver" && (
          <div className="flex-1 flex flex-col gap-6 pt-10">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">🎉 Game Over!</h2>
              <p className="text-foreground/70">
                {playerName}, you completed {roundsCompleted} / {TOTAL_ROUNDS} rounds
              </p>
              <p className="text-4xl font-bold mt-2">{score} pts</p>
            </div>
            <div className="flex-1" />
            {!scoreSubmitted ? (
              <button
                className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg disabled:opacity-40"
                disabled={submittingScore}
                onClick={submitScore}
              >
                {submittingScore ? "Saving..." : "Save Score"}
              </button>
            ) : (
              <Link
                href="/leaderboard"
                className="w-full text-center rounded-lg bg-foreground text-background font-semibold py-4 text-lg"
              >
                View Leaderboard
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
