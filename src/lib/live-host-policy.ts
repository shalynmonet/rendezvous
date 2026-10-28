import type { LiveState } from "./chat-schemas";

export function shouldHost(state: LiveState | null): boolean {
  if (!state?.b || state.muted || state.busy || state.error) return false;
  if (!state.game) return true;
  const last = state.messages.reduce((n, m, i) => m.sender === "rue" ? i : n, -1);
  const answers = state.messages.slice(last + 1);
  return answers.some((m) => m.sender === "a") && answers.some((m) => m.sender === "b");
}