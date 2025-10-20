"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import type { DailyPowerScoreResult, PowerScoreConfig } from "@/lib/scoring";

import { qk } from "./keys";

type RangeParams = { from?: string; to?: string } | null;

type PowerScoreResponse = {
  range: { from: string; to: string };
  config: PowerScoreConfig;
  scores: DailyPowerScoreResult[];
};

export function usePowerScore(range?: { from?: string; to?: string } | null) {
  const search = new URLSearchParams();
  if (range?.from) search.set("from", range.from);
  if (range?.to) search.set("to", range.to);

  return useQuery({
    queryKey: qk.powerScore.range(range ?? null),
    queryFn: () =>
      apiFetch<PowerScoreResponse>(
        `/api/metrics/power-score${search.toString() ? `?${search.toString()}` : ""}`
      ),
  });
}

export function useInvalidatePowerScore() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.powerScore.all() });
  };
}

export function useInvalidatePowerScoreForRange(range: RangeParams) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: qk.powerScore.range(range ?? null) });
  };
}
