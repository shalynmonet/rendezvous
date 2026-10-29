import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePersistedActivity } from "@/hooks/use-persisted-activity";
import { buildInstantDeck, GAME_NAMES, selectInstantGame } from "@/lib/instant-games";
import type { Profile } from "@/lib/store";

export function InstantGame({ a, b, seed, connectionId }: { a: Profile; b: Profile; seed: string; connectionId: string }) {
  const kind = selectInstantGame(seed);
  const deck = useMemo(() => buildInstantDeck(kind, seed, a, b), [kind, seed, a, b]);
  const [progress, setProgress] = usePersistedActivity<{ index: number; score: number; choices: number[] }>(connectionId, `instant:${seed}`, { index: 0, score: 0, choices: [] });
  const [choice, setChoice] = useState<number | null>(null);
  const card = deck[progress.index];
  const scored = kind !== "rather";
  const pick = (index: number) => {
    if (choice !== null || !card) return;
    setChoice(index);
  };
  const next = () => {
    if (choice === null || !card) return;
    const correct = kind === "tune" ? choice === 0 : choice === card.answer;
    setProgress((p) => ({ index: p.index + 1, score: p.score + (correct ? 1 : 0), choices: [...p.choices, choice] }));
    setChoice(null);
  };
  return (
    <div className="card-luxe space-y-5 p-6" aria-label={GAME_NAMES[kind]}>
      <p className="text-xs uppercase tracking-widest text-gold">Instant game · {GAME_NAMES[kind]}</p>
      {!card ? (
        <div className="space-y-4 text-center">
          <p className="font-display text-4xl italic">{deck.length === 0 ? "No matching tastes yet" : scored ? `${progress.score} / ${deck.length}` : "Decisions, decisions ♥"}</p>
          <Button variant="outline" onClick={() => { setProgress({ index: 0, score: 0, choices: [] }); setChoice(null); }}>Play again</Button>
        </div>
      ) : (
        <div className="space-y-5 text-center">
          <p className="text-xs text-gold">{progress.index + 1} / {deck.length}</p>
          <h2 className="break-words font-display text-3xl italic">{card.prompt}</h2>
          {card.note && <p className="text-sm text-muted-foreground">{card.note}</p>}
          <div className="flex flex-wrap justify-center gap-3">
            {card.options.map((option, index) => <Button key={`${index}:${option}`} variant={choice === index ? "default" : "outline"} className="h-auto min-h-10 max-w-full whitespace-normal break-words" disabled={choice !== null} onClick={() => pick(index)}>{option}</Button>)}
          </div>
          {choice !== null && <div className="space-y-3" aria-live="polite">
            <p>{kind === "rather" ? `${card.options[choice]} ♥` : kind === "tune" ? choice === 0 ? "A perfect duet ♥" : "Another melody awaits" : choice === card.answer ? "Correct ♥" : `The answer: ${card.options[card.answer ?? 0]}`}</p>
            <Button onClick={next}>{progress.index + 1 === deck.length ? "See results" : "Next round"}</Button>
          </div>}
        </div>
      )}
    </div>
  );
}