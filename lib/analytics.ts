export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  try {
    const event = {
      name,
      payload,
      ts: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
      const existing = window.localStorage.getItem("goal_mode_events");
      const events = existing ? (JSON.parse(existing) as unknown[]) : [];
      events.push(event);
      window.localStorage.setItem("goal_mode_events", JSON.stringify(events.slice(-200)));
    }

    console.info("[analytics]", event);
  } catch {
    // Non-blocking analytics.
  }
}
