"use client";

import { memo, useMemo } from "react";

import type { InfluenceEdge, InfluenceGraph, InfluenceNode } from "@/lib/connections/intelligence";

function polarToCartesian(radius: number, angle: number) {
  return {
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle),
  };
}

function getNodeColor(node: InfluenceNode) {
  switch (node.category) {
    case "mentor":
    case "sponsor":
      return "#3b82f6";
    case "partner":
      return "#8b5cf6";
    case "peer":
      return "#22c55e";
    default:
      return "#f97316";
  }
}

type InfluenceMapProps = {
  graph: InfluenceGraph;
};

const InfluenceMap = memo(function InfluenceMap({ graph }: InfluenceMapProps) {
  const { nodes, edges } = graph;

  const layout = useMemo(() => {
    if (nodes.length === 0) return { positioned: [], edges: [] };
    const radius = 140;
    const positioned = nodes.map((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const { x, y } = polarToCartesian(radius, angle);
      return { ...node, x: x + radius + 20, y: y + radius + 20 };
    });

    type PositionedNode = (typeof positioned)[number];

    const positionedEdges = edges
      .map((edge) => {
        const source = positioned.find((node) => node.id === edge.source);
        const target = positioned.find((node) => node.id === edge.target);
        if (!source || !target) return null;
        return { ...edge, source, target };
      })
      .filter(
        (
          edge,
        ): edge is InfluenceEdge & {
          source: PositionedNode;
          target: PositionedNode;
        } => edge !== null,
      );

    return {
      positioned,
      edges: positionedEdges,
    };
  }, [nodes, edges]);

  if (layout.positioned.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-muted p-6 text-center text-sm text-muted-foreground">
        Add connections to see influence relationships.
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-3">
      <svg viewBox="0 0 320 320" className="h-[260px] w-full">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(59,130,246,0.6)" />
          </marker>
        </defs>
        <g>
          {layout.edges.map((edge) => {
            const stroke = edge.reason === "org" ? "rgba(251,191,36,0.6)" : "rgba(59,130,246,0.45)";
            return (
              <line
                key={`${edge.source.id}-${edge.target.id}-${edge.reason}`}
                x1={edge.source.x}
                y1={edge.source.y}
                x2={edge.target.x}
                y2={edge.target.y}
                stroke={stroke}
                strokeWidth={Math.max(1, edge.weight * 2)}
                markerEnd="url(#arrow)"
              />
            );
          })}
        </g>
        <g>
          {layout.positioned.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={18 + node.strength * 8}
                fill={getNodeColor(node)}
                fillOpacity={0.85}
                stroke="rgba(15,23,42,0.08)"
                strokeWidth={1}
              />
              <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle" className="fill-white text-xs font-medium">
                {node.label.split(" ").map((part) => part[0] ?? "").join("").slice(0, 3).toUpperCase()}
              </text>
            </g>
          ))}
        </g>
      </svg>
      <figcaption className="text-xs text-muted-foreground">
        Node size reflects relationship strength. Orange lines show shared organizations; blue lines group similar roles.
      </figcaption>
    </figure>
  );
});

export default InfluenceMap;
