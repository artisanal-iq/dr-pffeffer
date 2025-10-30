"use client";

import React from "react";

type Props = {
  fallback?: React.ReactNode;
  children: React.ReactNode;
};

type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("Planner subtree crashed:", error);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="rounded-md border p-4 text-sm text-destructive">
            Something went wrong rendering this section{this.state.message ? `: ${this.state.message}` : "."}
          </div>
        )
      );
    }
    return this.props.children;
  }
}
