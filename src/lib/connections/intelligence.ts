import type { Connection } from "@/types/models";

export type InfluenceNode = {
  id: string;
  label: string;
  org: string | null;
  category: string | null;
  lastContactDays: number | null;
  strength: number;
  recencyScore: number;
};

export type InfluenceEdge = {
  source: string;
  target: string;
  weight: number;
  reason: "org" | "category";
};

export type InfluenceGraph = {
  nodes: InfluenceNode[];
  edges: InfluenceEdge[];
  density: number;
};

export type FollowUpRecommendation = {
  id: string;
  name: string;
  reason: string;
  urgency: "overdue" | "upcoming" | "fresh";
  daysSinceContact: number | null;
  nextAction: string | null;
};

export type RelationshipHealthSummary = {
  total: number;
  categories: Array<{ id: string; count: number }>;
  averageDaysSinceContact: number | null;
  dormantConnections: number;
};

const MILLISECONDS_PER_DAY = 86_400_000;

function daysSince(isoDate: string | null, now: Date): number | null {
  if (!isoDate) return null;
  const value = Date.parse(isoDate);
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.floor((now.getTime() - value) / MILLISECONDS_PER_DAY));
}

function scoreRecency(days: number | null): number {
  if (days == null) return 0;
  if (days <= 7) return 1;
  if (days <= 21) return 0.7;
  if (days <= 45) return 0.45;
  if (days <= 90) return 0.2;
  return 0.05;
}

function scoreStrength(connection: Connection, days: number | null): number {
  let score = 0.25;
  if (connection.category === "mentor" || connection.category === "sponsor") {
    score += 0.35;
  } else if (connection.category === "peer" || connection.category === "partner") {
    score += 0.2;
  }

  if (connection.org) {
    score += 0.15;
  }

  if (days != null) {
    score += scoreRecency(days) * 0.3;
  }

  return Math.min(1, Math.max(0.1, Number(score.toFixed(2))));
}

export function buildInfluenceGraph(connections: Connection[], now: Date = new Date()): InfluenceGraph {
  if (connections.length === 0) {
    return { nodes: [], edges: [], density: 0 };
  }

  const nodes: InfluenceNode[] = connections.map((connection) => {
    const delta = daysSince(connection.last_contact, now);
    return {
      id: connection.id,
      label: connection.name,
      org: connection.org,
      category: connection.category,
      lastContactDays: delta,
      recencyScore: scoreRecency(delta),
      strength: scoreStrength(connection, delta),
    };
  });

  const edges: InfluenceEdge[] = [];
  const seenPairs = new Set<string>();

  for (let i = 0; i < connections.length; i += 1) {
    for (let j = i + 1; j < connections.length; j += 1) {
      const a = connections[i];
      const b = connections[j];
      const pairKey = `${a.id}:${b.id}`;
      if (seenPairs.has(pairKey)) continue;

      if (a.org && b.org && a.org === b.org) {
        edges.push({ source: a.id, target: b.id, weight: 0.7, reason: "org" });
        seenPairs.add(pairKey);
        continue;
      }

      if (a.category && b.category && a.category === b.category) {
        const weight = a.category === "mentor" || a.category === "sponsor" ? 0.6 : 0.4;
        edges.push({ source: a.id, target: b.id, weight, reason: "category" });
        seenPairs.add(pairKey);
      }
    }
  }

  const density =
    connections.length > 1
      ? Number((edges.length / (connections.length * (connections.length - 1) / 2)).toFixed(2))
      : 0;

  return { nodes, edges, density };
}

export function computeFollowUpRecommendations(
  connections: Connection[],
  now: Date = new Date()
): FollowUpRecommendation[] {
  if (connections.length === 0) return [];

  const recommendations: FollowUpRecommendation[] = connections.map((connection) => {
    const delta = daysSince(connection.last_contact, now);
    const nextAction = connection.next_action ?? null;

    if (delta == null) {
      return {
        id: connection.id,
        name: connection.name,
        reason: "No contact logged yet",
        urgency: "overdue",
        daysSinceContact: null,
        nextAction,
      } satisfies FollowUpRecommendation;
    }

    if (delta > 60) {
      return {
        id: connection.id,
        name: connection.name,
        reason: `It has been ${delta} days since you connected`,
        urgency: "overdue",
        daysSinceContact: delta,
        nextAction,
      } satisfies FollowUpRecommendation;
    }

    if (delta > 30) {
      return {
        id: connection.id,
        name: connection.name,
        reason: `Touch base soon (last contact ${delta} days ago)`,
        urgency: "upcoming",
        daysSinceContact: delta,
        nextAction,
      } satisfies FollowUpRecommendation;
    }

    return {
      id: connection.id,
      name: connection.name,
      reason: delta === 0 ? "Connected today" : `Last connected ${delta} days ago`,
      urgency: "fresh",
      daysSinceContact: delta,
      nextAction,
    } satisfies FollowUpRecommendation;
  });

  return recommendations.sort((a, b) => {
    const urgencyScore = (value: FollowUpRecommendation["urgency"]): number => {
      if (value === "overdue") return 0;
      if (value === "upcoming") return 1;
      return 2;
    };
    const scoreA = urgencyScore(a.urgency);
    const scoreB = urgencyScore(b.urgency);
    if (scoreA !== scoreB) return scoreA - scoreB;

    const deltaA = a.daysSinceContact ?? Number.POSITIVE_INFINITY;
    const deltaB = b.daysSinceContact ?? Number.POSITIVE_INFINITY;
    return deltaB - deltaA;
  });
}

export function summarizeRelationshipHealth(
  connections: Connection[],
  now: Date = new Date()
): RelationshipHealthSummary {
  if (connections.length === 0) {
    return { total: 0, categories: [], averageDaysSinceContact: null, dormantConnections: 0 };
  }

  const categoryCounts = new Map<string, number>();
  const deltas: number[] = [];
  let dormant = 0;

  for (const connection of connections) {
    if (connection.category) {
      categoryCounts.set(connection.category, (categoryCounts.get(connection.category) ?? 0) + 1);
    }
    const delta = daysSince(connection.last_contact, now);
    if (delta != null) {
      deltas.push(delta);
      if (delta > 90) dormant += 1;
    } else {
      dormant += 1;
    }
  }

  const averageDaysSinceContact =
    deltas.length > 0
      ? Number((deltas.reduce((total, value) => total + value, 0) / deltas.length).toFixed(1))
      : null;

  const categories = Array.from(categoryCounts.entries())
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: connections.length,
    categories,
    averageDaysSinceContact,
    dormantConnections: dormant,
  } satisfies RelationshipHealthSummary;
}
