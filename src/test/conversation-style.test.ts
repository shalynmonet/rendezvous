import { expect, it } from "vitest";
import { nextConversationStyle, preserveConversationScores } from "@/lib/conversation-style";
const card = (type: string) => ({ type, prompt: "Question", options: [] });
it("mixes natural questions, stories, follow-ups and games instead of consecutive games", () => {
  expect(nextConversationStyle(null)).toBe("question");
  expect(nextConversationStyle(card("question"))).toBe("story");
  expect(nextConversationStyle(card("story"))).toBe("follow_up");
  expect(nextConversationStyle(card("follow_up"))).toBe("game");
  expect(nextConversationStyle(card("this_or_that"))).toBe("question");
});
it("does not award points for personal stories or follow-ups", () => {
  expect(preserveConversationScores(card("story"), { a: 2, b: 3 }, { a: 4, b: 5 })).toEqual({ a: 2, b: 3 });
  expect(preserveConversationScores(card("this_or_that"), { a: 2, b: 3 }, { a: 4, b: 5 })).toEqual({ a: 4, b: 5 });
});