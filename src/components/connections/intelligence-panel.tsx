"use client";

import { useMemo } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useConnectionIntelligence } from "@/hooks/connectionIntelligence";

import FollowUpRecommendations from "./follow-up-recommendations";
import InfluenceMap from "./influence-map";
import RelationshipHealth from "./relationship-health";

type IntelligencePanelProps = {
  className?: string;
};

export default function IntelligencePanel({ className }: IntelligencePanelProps) {
  const intelligence = useConnectionIntelligence();

  const graph = intelligence.data?.graph;
  const followUps = useMemo(() => intelligence.data?.followUps ?? [], [intelligence.data?.followUps]);
  const summary = intelligence.data?.summary;

  return (
    <section className={className} aria-labelledby="relationship-intelligence-heading">
      <div className="mb-4 space-y-1">
        <h2 id="relationship-intelligence-heading" className="text-xl font-semibold text-foreground">
          Relationship intelligence
        </h2>
        <p className="text-sm text-muted-foreground">
          Visualize influence patterns, target your next touchpoints, and monitor network health.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/40">
            <CardTitle className="text-base font-semibold">Influence map</CardTitle>
            <CardDescription>Clusters highlight shared orgs and roles.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {intelligence.isLoading ? <Skeleton className="h-[260px] w-full" /> : graph ? <InfluenceMap graph={graph} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/60 bg-muted/40">
            <CardTitle className="text-base font-semibold">Follow-up intelligence</CardTitle>
            <CardDescription>Prioritize outreach based on relationship freshness.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {intelligence.isLoading ? (
              <div className="space-y-2 p-6">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <FollowUpRecommendations items={followUps} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="border-b border-border/60 bg-muted/40">
          <CardTitle className="text-base font-semibold">Relationship health</CardTitle>
          <CardDescription>Monitor cadence and cohort coverage.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {intelligence.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          ) : summary ? (
            <RelationshipHealth summary={summary} />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
