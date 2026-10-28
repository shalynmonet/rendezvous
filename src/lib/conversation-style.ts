export const CHAT_GAMES = ["this_or_that", "defend_your_pick", "guess_my_answer", "deep_cuts"] as const;
export type ConversationCard = { type: string; prompt: string; options: string[] };

export function nextConversationStyle(previous: ConversationCard | null | undefined) {
  if (!previous) return "question";
  if (previous.type === "question") return "story";
  if (previous.type === "story") return "follow_up";
  if (previous.type === "follow_up") return "game";
  return "question";
}

export function conversationDirection(previous: ConversationCard | null | undefined) {
  const style = nextConversationStyle(previous);
  const rules = style === "question"
    ? "Ask one warm, open-ended question connecting their tastes to real life, memories, values or date experiences. No forced choice, challenge or points."
    : style === "story"
      ? "Invite a personal story inspired by what they just said, such as a concert memory, a meaningful film or a food tradition. Do not quiz them."
      : style === "follow_up"
        ? "Follow the most interesting detail in their actual answers with one thoughtful follow-up inviting both people to share. Stay on that subject instead of jumping to a new favorite."
        : "Offer one playful taste-grounded game: this_or_that, defend_your_pick, guess_my_answer or deep_cuts. Do not reuse the last game's question or choices.";
  return `Next conversation style: ${style}. ${rules} Keep leading the conversation naturally, not announcing rounds. Avoid repeating earlier questions, favorite pairings or phrasings. The game field is the current conversation card even for non-game questions: return type ${style === "game" ? "chosen game type" : style}, prompt as the single question inviting both people, and options ${style === "game" ? "only when meaningful" : "as an empty array"}. Never return a null card.`;
}

export function preserveConversationScores(previous: ConversationCard | null | undefined, before: { a: number; b: number }, proposed: { a: number; b: number }) {
  return previous && CHAT_GAMES.some((type) => type === previous.type) ? proposed : before;
}