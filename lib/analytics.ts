export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  try {
    const event = {
      name,
      payload,
      ts: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      void fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }).catch(() => {
        // best effort analytics
      });
    }

    console.info("[analytics]", event);
  } catch {
    // Non-blocking analytics.
  }
}
