import type { Profile } from "./store";

export const INSTANT_GAMES = ["taste", "rather", "truths", "tune"] as const;
export type InstantGameKind = typeof INSTANT_GAMES[number];
export const GAME_NAMES: Record<InstantGameKind, string> = {
  taste: "Whose taste is it?",
  rather: "Would you rather?",
  truths: "Two truths and a lie",
  tune: "Name that tune",
};
export type InstantCard = {
  prompt: string;
  options: string[];
  answer?: number;
  note?: string;
};

function randomFrom(seed: string) {
  let x = 2166136261;
  for (const char of seed) x = Math.imul(x ^ char.charCodeAt(0), 16777619);
  return () => {
    x += 0x6d2b79f5;
    let t = Math.imul(x ^ (x >>> 15), 1 | x);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = result[i], b = result[j];
    if (a !== undefined && b !== undefined) { result[i] = b; result[j] = a; }
  }
  return result;
}
const normalize = (s: string) => s.trim().toLowerCase();
const unique = (items: string[]) => [...new Map(items.map((s) => [normalize(s), s])).values()];

/** The shared spin ID selects both the game and deck, never an AI request. */
export function selectInstantGame(seed: string): InstantGameKind {
  return INSTANT_GAMES[Math.floor(randomFrom(seed)() * INSTANT_GAMES.length)] ?? "taste";
}

export function buildInstantDeck(kind: InstantGameKind, seed: string, a: Profile, b: Profile): InstantCard[] {
  const random = randomFrom(`${seed}:${kind}`);
  const people = [a, b];
  if (kind === "taste") {
    const labels = unique([...a.tastes, ...b.tastes].map((t) => t.label)).sort();
    return shuffle(labels, random).slice(0, 8).map((label) => {
      const owners = people.map((p) => p.tastes.some((t) => normalize(t.label) === normalize(label)));
      return { prompt: label, options: [a.name, b.name, "Both"], answer: owners[0] && owners[1] ? 2 : owners[0] ? 0 : 1 };
    });
  }
  if (kind === "rather") {
    const cards: InstantCard[] = [];
    for (const category of unique([...a.tastes, ...b.tastes].map((t) => t.category))) {
      const labels = shuffle(unique([...a.tastes, ...b.tastes].filter((t) => t.category === category).map((t) => t.label)).sort(), random);
      for (let i = 0; i + 1 < labels.length; i += 2) {
        const left = labels[i], right = labels[i + 1];
        if (left && right) cards.push({ prompt: "Would you rather…", options: [left, right], note: category });
      }
    }
    return shuffle(cards, random).slice(0, 8);
  }
  if (kind === "truths") {
    const decoys = ["Pottery", "Birdwatching", "Origami", "Stargazing", "Calligraphy", "Chess", "Salsa dancing", "Gardening"];
    return shuffle(people.flatMap((p) => {
      const labels = shuffle(unique(p.tastes.map((t) => t.label)).sort(), random);
      const falseLabels = shuffle(unique([...a.tastes, ...b.tastes].map((t) => t.label).concat(decoys)).filter((s) => !labels.some((t) => normalize(t) === normalize(s))), random);
      const cards: InstantCard[] = [];
      for (let i = 0; i + 1 < labels.length; i += 2) {
        const first = labels[i], second = labels[i + 1], lie = falseLabels[i % falseLabels.length];
        if (!first || !second || !lie) continue;
        const options = shuffle([first, second, lie], random);
        cards.push({ prompt: `Which isn't in ${p.name}'s saved tastes?`, options, answer: options.indexOf(lie), note: "Two saved favorites, one decoy — not a claim about what they dislike." });
      }
      return cards;
    }), random).slice(0, 8);
  }
  const artists = unique([...a.tastes, ...b.tastes].filter((t) => t.category === "artist").map((t) => t.label)).sort();
  return shuffle(artists, random).slice(0, 8).map((artist, i) => ({
    prompt: `${people[i % 2]?.name ?? a.name}, pick a song by ${artist}`,
    options: ["They guessed it!", "Pass"],
    note: "Hum or tap the melody without saying the title. Your partner names the song; then reveal your pick to each other.",
  }));
}