"use client";

import { Component, type ErrorInfo, type ReactNode, Suspense, useState } from "react";

import PromptLibraryAdmin from "@/components/prompts/prompt-library-admin";
import { Button } from "@/components/ui/button";

class PromptLibraryAdminErrorBoundary extends Component<
  { children: ReactNode; onReset: () => void },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("PromptLibraryAdmin failed", error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset();
  };

  render() {
    if (this.state.error) {
      return (
        <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          <p>We couldn&apos;t load the prompt library right now.</p>
          <p className="text-xs text-muted-foreground">
            {this.state.error.message ?? "An unexpected error occurred."}
          </p>
          <Button onClick={this.handleReset} size="sm" variant="secondary">
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export function PromptLibraryAdminContainer() {
  const [attempt, setAttempt] = useState(0);

  return (
    <PromptLibraryAdminErrorBoundary onReset={() => setAttempt((value) => value + 1)}>
      <Suspense
        fallback={
          <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
            <p>Loading prompt management tools…</p>
            <p>Please wait while we fetch the latest prompts.</p>
          </div>
        }
      >
        <PromptLibraryAdmin key={attempt} />
      </Suspense>
    </PromptLibraryAdminErrorBoundary>
  );
}
