"use client";

import { useQuery } from "@tanstack/react-query";

import type {
  FollowUpRecommendation,
  InfluenceGraph,
  RelationshipHealthSummary,
} from "@/lib/connections/intelligence";
import { apiFetch } from "@/lib/api";

import { qk } from "./keys";

type ConnectionIntelligenceResponse = {
  graph: InfluenceGraph;
  followUps: FollowUpRecommendation[];
  summary: RelationshipHealthSummary;
};

export function useConnectionIntelligence() {
  return useQuery({
    queryKey: qk.connections.intelligence(),
    queryFn: () => apiFetch<ConnectionIntelligenceResponse>("/api/connections/intelligence"),
    staleTime: 1000 * 60 * 5,
  });
}
