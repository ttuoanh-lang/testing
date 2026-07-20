"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function StartPage() {
  const router = useRouter();
  const [name, setName] = useState("");

  function startGame() {
    const trimmed = name.trim();
    if (!trimmed) return;
    sessionStorage.setItem("playerName", trimmed);
    router.push("/play");
  }

  return (
    <main className="flex flex-col flex-1 max-w-md mx-auto w-full px-6 py-10">
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">สวัสดี!</h1>
          <p className="text-lg text-foreground/80">Thai Flashcards</p>
          <p className="text-sm text-foreground/60">
            Learn new Thai words, then write sentences with them. 10 rounds,
            each one a little harder — the last one is a whole paragraph.
          </p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Your name</span>
          <input
            className="border rounded-lg px-4 py-3 text-base bg-transparent"
            placeholder="Enter your name"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") startGame();
            }}
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 pb-4">
        <button
          className="w-full rounded-lg bg-foreground text-background font-semibold py-4 text-lg disabled:opacity-40"
          disabled={!name.trim()}
          onClick={startGame}
        >
          Start Game
        </button>
        <Link
          href="/leaderboard"
          className="text-center text-sm underline text-foreground/70 py-2"
        >
          View Leaderboard
        </Link>
      </div>
    </main>
  );
}
