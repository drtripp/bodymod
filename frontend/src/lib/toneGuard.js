export const moralizedFoodPatterns = [
  {
    id: "cheat-meal",
    pattern: /\bcheat\s+(meal|day|food|snack|weekend|night)s?\b/i,
    guidance: "Use log/check-in language instead of cheat framing."
  },
  {
    id: "good-bad-food",
    pattern: /\b(good|bad)\s+foods?\b/i,
    guidance: "Describe foods by nutrients, context, or user goals instead of moral value."
  },
  {
    id: "guilt-language",
    pattern: /\b(guilt[-\s]?free|guilty\s+pleasure|no\s+guilt)\b/i,
    guidance: "Avoid guilt-based diet framing."
  },
  {
    id: "clean-dirty-eating",
    pattern: /\b(clean\s+eating|eat\s+clean|dirty\s+bulk|dirty\s+food)\b/i,
    guidance: "Avoid purity language around food or body changes."
  },
  {
    id: "junk-food",
    pattern: /\bjunk\s+foods?\b/i,
    guidance: "Use specific food names or nutrient context instead of junk labels."
  },
  {
    id: "naughty-food",
    pattern: /\bnaughty\s+(food|meal|snack|treat)s?\b/i,
    guidance: "Avoid moralized reward/punishment food language."
  },
  {
    id: "off-plan-failure",
    pattern: /\b(off[-\s]?plan|fell\s+off|failed\s+(your|the)\s+(diet|plan))\b/i,
    guidance: "Use neutral adherence or logging language."
  }
];

export const bodyJudgmentPatterns = [
  {
    id: "too-fat",
    pattern: /\btoo\s+fat\b/i,
    guidance: "Use goal-relative or measurement-relative language."
  },
  {
    id: "too-skinny",
    pattern: /\btoo\s+skinny\b/i,
    guidance: "Use goal-relative or measurement-relative language."
  },
  {
    id: "bad-body",
    pattern: /\bbad\s+body\b/i,
    guidance: "Avoid ranking bodies as good or bad."
  }
];

export const preferredToneSignals = [
  {
    id: "check-in",
    pattern: /\bcheck-?in(s)?\b/i,
    guidance: "Account progress copy should use check-in language."
  },
  {
    id: "log",
    pattern: /\blog(s|ged|ging)?\b/i,
    guidance: "Diet and tracking copy should use log language."
  },
  {
    id: "tea",
    pattern: /\btea\b/i,
    guidance: "Weekly digest copy should preserve the body tea voice."
  }
];

export function findToneIssues(text, patterns = [...moralizedFoodPatterns, ...bodyJudgmentPatterns]) {
  return patterns
    .map((rule) => {
      const match = String(text || "").match(rule.pattern);
      return match
        ? {
            id: rule.id,
            match: match[0],
            guidance: rule.guidance
          }
        : null;
    })
    .filter(Boolean);
}

export function hasPreferredToneSignal(text, signals = preferredToneSignals) {
  return signals.some((signal) => signal.pattern.test(String(text || "")));
}
