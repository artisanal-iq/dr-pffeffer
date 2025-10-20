import type { JournalSummaryMetadata } from "@/types/models";

const POSITIVE_WORDS = [
  "confident",
  "energized",
  "excited",
  "grateful",
  "progress",
  "win",
  "proud",
  "optimistic",
  "calm",
  "encouraged",
  "focused",
  "support",
  "trust",
  "clear",
];

const NEGATIVE_WORDS = [
  "worried",
  "anxious",
  "uncertain",
  "doubt",
  "confused",
  "frustrated",
  "stressed",
  "tired",
  "drained",
  "blocked",
  "overwhelmed",
  "resent",
  "stuck",
  "tense",
];

const CONFIDENCE_POSITIVE = [
  "confident",
  "ready",
  "assured",
  "certain",
  "steady",
  "composed",
  "prepared",
  "bold",
];

const CONFIDENCE_NEGATIVE = [
  "nervous",
  "hesitant",
  "unsure",
  "uncertain",
  "doubt",
  "shaky",
  "uneasy",
  "insecure",
];

const INFLUENCE_POSITIVE = [
  "align",
  "influence",
  "lead",
  "coach",
  "mentor",
  "advocate",
  "support",
  "partner",
  "collaborate",
  "win",
];

const INFLUENCE_NEGATIVE = [
  "ignored",
  "pushback",
  "resist",
  "blocked",
  "stalled",
  "disengaged",
  "conflict",
  "argument",
];

type Theme = { id: string; label: string; keywords: string[] };
const THEMES: Theme[] = [
  { id: "growth", label: "Growth", keywords: ["learn", "practice", "improve", "feedback", "growth", "develop"] },
  { id: "relationships", label: "Relationships", keywords: ["team", "partner", "client", "relationship", "stakeholder", "support"] },
  { id: "strategy", label: "Strategy", keywords: ["plan", "strategy", "roadmap", "vision", "priority", "align"] },
  { id: "execution", label: "Execution", keywords: ["deliver", "ship", "deadline", "execute", "complete", "follow-up"] },
  { id: "wellbeing", label: "Wellbeing", keywords: ["energy", "rest", "health", "balance", "mindset", "stress"] },
  { id: "communication", label: "Communication", keywords: ["present", "message", "talk", "conversation", "story", "meeting"] },
];

export class SummaryGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SummaryGenerationError";
  }
}

function countMatches(entry: string, keywords: string[]): number {
  const lowered = entry.toLowerCase();
  let count = 0;
  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "g");
    count += lowered.match(regex)?.length ?? 0;
  }
  return count;
}

function determineTone(positiveHits: number, negativeHits: number): JournalSummaryMetadata["tone"] {
  if (positiveHits - negativeHits >= 2) return "positive";
  if (negativeHits - positiveHits >= 2) return "negative";
  return "neutral";
}

function determineLevel(positiveHits: number, negativeHits: number): "low" | "medium" | "high" {
  if (positiveHits - negativeHits >= 1) return "high";
  if (negativeHits - positiveHits >= 1) return "low";
  return "medium";
}

function extractSentences(entry: string): string[] {
  return (entry
    .replace(/\s+/g, " ")
    .match(/[^.!?]+[.!?]?/g) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
}

function selectThemes(entry: string): string[] {
  const lowered = entry.toLowerCase();
  const themes = THEMES.filter((theme) =>
    theme.keywords.some((keyword) => lowered.includes(keyword))
  ).map((theme) => theme.label);
  if (themes.length === 0) return ["Focus"];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const theme of themes) {
    if (!seen.has(theme)) {
      seen.add(theme);
      ordered.push(theme);
    }
    if (ordered.length >= 3) break;
  }
  return ordered;
}

function buildBehaviorCue(
  tone: JournalSummaryMetadata["tone"],
  confidence: JournalSummaryMetadata["confidence"],
  influence: JournalSummaryMetadata["influence"],
  themes: string[]
): string {
  const theme = themes[0]?.toLowerCase() ?? "focus";
  if (confidence === "low") {
    return "Rehearse your key message and anchor it to a recent win to lift confidence.";
  }
  if (influence === "low") {
    return "Clarify the desired outcome and invite one stakeholder to co-create the next step.";
  }
  if (tone === "negative") {
    return "Name one constraint you can control tomorrow and one ally who can help unblock momentum.";
  }
  if (theme === "wellbeing") {
    return "Protect a short recovery block to keep your energy steady for the next conversation.";
  }
  return "Share gratitude with your partners and confirm the next micro-commitment to keep momentum.";
}

function describeLevel(level: "low" | "medium" | "high", dimension: "confidence" | "influence"): string {
  const mapping: Record<typeof level, Record<typeof dimension, string>> = {
    low: {
      confidence: "lower",
      influence: "limited",
    },
    medium: {
      confidence: "steady",
      influence: "balanced",
    },
    high: {
      confidence: "strong",
      influence: "expansive",
    },
  } as const;
  return mapping[level][dimension];
}

function describeTone(tone: JournalSummaryMetadata["tone"]): string {
  switch (tone) {
    case "positive":
      return "upbeat";
    case "negative":
      return "strained";
    default:
      return "steady";
  }
}

export function generateRuleBasedSummary(entry: string): { summary: string; metadata: JournalSummaryMetadata } {
  if (!entry || entry.trim().length < 20) {
    throw new SummaryGenerationError("Reflection is too short to summarize.");
  }

  const trimmed = entry.trim();
  const positiveHits = countMatches(trimmed, POSITIVE_WORDS);
  const negativeHits = countMatches(trimmed, NEGATIVE_WORDS);
  const tone = determineTone(positiveHits, negativeHits);

  const confidenceLevel = determineLevel(
    countMatches(trimmed, CONFIDENCE_POSITIVE),
    countMatches(trimmed, CONFIDENCE_NEGATIVE)
  );
  const influenceLevel = determineLevel(
    countMatches(trimmed, INFLUENCE_POSITIVE),
    countMatches(trimmed, INFLUENCE_NEGATIVE)
  );
  const themes = selectThemes(trimmed);
  const behaviorCue = buildBehaviorCue(tone, confidenceLevel, influenceLevel, themes);
  const sentences = extractSentences(trimmed);

  const summaryFirstSentence = `This reflection carries a ${describeTone(tone)} tone with ${describeLevel(confidenceLevel, "confidence")} confidence and ${describeLevel(influenceLevel, "influence")} influence around ${themes.slice(0, 2).join(" and ")}.`;
  const secondSentence = behaviorCue.endsWith(".") ? behaviorCue : `${behaviorCue}.`;
  const summary = `${summaryFirstSentence} ${secondSentence}`;

  const metadata: JournalSummaryMetadata = {
    tone,
    confidence: confidenceLevel,
    influence: influenceLevel,
    key_themes: themes,
    behavior_cue: secondSentence,
    word_count: trimmed.split(/\s+/).length,
    evidence: sentences.slice(0, 2),
    generated_at: new Date().toISOString(),
  };

  return { summary, metadata };
}

export function summarizeForDashboard(entries: Pick<JournalSummaryMetadata, "tone" | "confidence" | "influence" | "key_themes">[]) {
  const toneCounts: Record<JournalSummaryMetadata["tone"], number> = { positive: 0, neutral: 0, negative: 0 };
  const confidenceCounts: Record<JournalSummaryMetadata["confidence"], number> = { low: 0, medium: 0, high: 0 };
  const influenceCounts: Record<JournalSummaryMetadata["influence"], number> = { low: 0, medium: 0, high: 0 };
  const themeCounts = new Map<string, number>();

  for (const entry of entries) {
    toneCounts[entry.tone] += 1;
    confidenceCounts[entry.confidence] += 1;
    influenceCounts[entry.influence] += 1;
    for (const theme of entry.key_themes) {
      themeCounts.set(theme, (themeCounts.get(theme) ?? 0) + 1);
    }
  }

  return {
    tone: toneCounts,
    confidence: confidenceCounts,
    influence: influenceCounts,
    topThemes: Array.from(themeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([theme, count]) => ({ theme, count })),
  };
}
