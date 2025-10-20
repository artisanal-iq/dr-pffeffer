export type AnalyticsEventName = "modal.open" | "modal.submit" | "modal.cancel";

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  properties: Record<string, unknown>;
  timestamp: number;
};

export type AnalyticsListener = (event: AnalyticsEvent) => void;

const listeners = new Set<AnalyticsListener>();

export function addAnalyticsListener(listener: AnalyticsListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function trackEvent(name: AnalyticsEventName, properties: Record<string, unknown> = {}) {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };
  for (const listener of listeners) {
    listener(event);
  }
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console -- Helpful during development for debugging analytics flows.
    console.debug("analytics", event);
  }
}

export function resetAnalyticsListeners() {
  listeners.clear();
}
