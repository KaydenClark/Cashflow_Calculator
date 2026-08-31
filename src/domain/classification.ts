import type { SpendingCategory } from "./types.js";

export interface ClassificationInput {
  description: string;
  originalCategory?: string;
  merchant?: string;
  userOverride?: SpendingCategory;
}

export interface ClassificationRuleSet {
  exact: Record<string, SpendingCategory>;
  keywords: Array<{ pattern: RegExp; category: SpendingCategory }>;
  source: Record<string, SpendingCategory>;
}

export function classifyTransaction(
  _input: ClassificationInput,
  _rules: ClassificationRuleSet,
): { category: SpendingCategory; rule: string; confidence: number; review: boolean } {
  if (_input.userOverride) {
    return { category: _input.userOverride, rule: "user_override", confidence: 1, review: false };
  }

  const merchant = _input.merchant?.trim().toLowerCase();
  if (merchant && _rules.exact[merchant]) {
    return { category: _rules.exact[merchant], rule: `exact:${merchant}`, confidence: 0.98, review: false };
  }

  const description = _input.description.trim();
  const keyword = _rules.keywords.find(({ pattern }) => {
    pattern.lastIndex = 0;
    return pattern.test(description);
  });
  if (keyword) {
    return { category: keyword.category, rule: `keyword:${keyword.pattern.source}`, confidence: 0.88, review: false };
  }

  if (_input.originalCategory && _rules.source[_input.originalCategory]) {
    return {
      category: _rules.source[_input.originalCategory],
      rule: `source:${_input.originalCategory}`,
      confidence: 0.72,
      review: false,
    };
  }

  return { category: "Needs Review", rule: "fallback:needs_review", confidence: 0.25, review: true };
}
