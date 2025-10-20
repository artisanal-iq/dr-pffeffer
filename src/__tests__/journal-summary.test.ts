import { describe, expect, it } from "vitest";
import { generateRuleBasedSummary, summarizeForDashboard, SummaryGenerationError } from "@/lib/journal-summary";

describe("generateRuleBasedSummary", () => {
  it("classifies an energized entry with high confidence and influence", () => {
    const entry = `I felt confident leading today's strategy workshop. The team aligned on a bold plan and the client feedback was encouraging.
    I'm grateful for the support from Alex and excited to mentor the new manager next week.`;

    const { summary, metadata } = generateRuleBasedSummary(entry);

    expect(summary).toMatch(/upbeat tone/i);
    expect(metadata.tone).toBe("positive");
    expect(metadata.confidence).toBe("high");
    expect(metadata.influence).toBe("high");
    expect(metadata.key_themes).toContain("Strategy");
    expect(metadata.behavior_cue).toMatch(/gratitude/i);
    expect(metadata.word_count).toBeGreaterThan(20);
    expect(metadata.evidence.length).toBeGreaterThan(0);
  });

  it("flags a strained entry with low confidence", () => {
    const entry = `I'm worried about tomorrow's presentation. The stakeholders felt disengaged and I was unsure about my answers.
    The conflict with finance stalled the roadmap and left me feeling drained.`;

    const { metadata } = generateRuleBasedSummary(entry);

    expect(metadata.tone).toBe("negative");
    expect(metadata.confidence).toBe("low");
    expect(metadata.influence).toMatch(/low|medium/);
    expect(metadata.behavior_cue).toMatch(/rehearse|ally|stakeholder|momentum/i);
  });

  it("throws when the entry is too short", () => {
    expect(() => generateRuleBasedSummary("Too short.")).toThrow(SummaryGenerationError);
  });
});

describe("summarizeForDashboard", () => {
  it("aggregates tone and confidence counts", () => {
    const aggregates = summarizeForDashboard([
      { tone: "positive", confidence: "high", influence: "high", key_themes: ["Strategy", "Growth"] },
      { tone: "positive", confidence: "medium", influence: "medium", key_themes: ["Relationships"] },
      { tone: "neutral", confidence: "low", influence: "low", key_themes: ["Wellbeing", "Focus"] },
    ]);

    expect(aggregates.tone).toEqual({ positive: 2, neutral: 1, negative: 0 });
    expect(aggregates.confidence.high).toBe(1);
    expect(aggregates.confidence.low).toBe(1);
    expect(aggregates.influence.medium).toBe(1);
    expect(aggregates.topThemes.length).toBeGreaterThan(0);
    expect(aggregates.topThemes.map((t) => t.theme)).toEqual(
      expect.arrayContaining(["Strategy", "Relationships", "Wellbeing"])
    );
  });
});
