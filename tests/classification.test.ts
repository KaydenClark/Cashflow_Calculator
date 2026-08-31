import { describe, expect, it } from "vitest";
import { classifyTransaction } from "../src/domain/classification.js";

const rules = {
  exact: { "smith's": "Groceries" as const },
  keywords: [{ pattern: /netflix/i, category: "Streaming, Music & Audiobooks" as const }],
  source: { "Food & Dining": "Restaurants & Fast Food" as const, Percriptions: "Healthcare & Pharmacy" as const },
};

describe("classification precedence", () => {
  it("never overwrites a user override", () => {
    expect(classifyTransaction({ description: "Netflix", userOverride: "Tabletop Games & Miniatures" }, rules)).toMatchObject({
      category: "Tabletop Games & Miniatures",
      rule: "user_override",
    });
  });

  it("prefers exact merchant then keyword then source category", () => {
    expect(classifyTransaction({ description: "Card", merchant: "Smith's", originalCategory: "Food & Dining" }, rules).category).toBe("Groceries");
    expect(classifyTransaction({ description: "NETFLIX.COM", originalCategory: "Shopping" }, rules).category).toBe("Streaming, Music & Audiobooks");
    expect(classifyTransaction({ description: "Unknown", originalCategory: "Percriptions" }, rules).category).toBe("Healthcare & Pharmacy");
  });

  it("falls back to Needs Review", () => {
    expect(classifyTransaction({ description: "Unknown person" }, rules)).toMatchObject({ category: "Needs Review", review: true });
  });
});
