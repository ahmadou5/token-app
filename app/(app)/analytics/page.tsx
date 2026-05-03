"use client";

import { useMemo } from "react";

interface GoalEvent {
  name: string;
  payload: Record<string, unknown>;
  ts: string;
}

function readEvents(): GoalEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("goal_mode_events");
    if (!raw) return [];
    return JSON.parse(raw) as GoalEvent[];
  } catch {
    return [];
  }
}

export default function AnalyticsPage() {
  const events = useMemo(() => readEvents(), []);

  const funnel = useMemo(() => {
    const opened = events.filter((e) => e.name === "intent_opened").length;
    const previews = events.filter((e) => e.name === "intent_preview_ready").length;
    const blocked = events.filter(
      (e) => e.name === "intent_preview_ready" && Boolean(e.payload?.blocked),
    ).length;

    return {
      opened,
      previews,
      blocked,
      conversion: opened > 0 ? ((previews / opened) * 100).toFixed(1) : "0.0",
    };
  }, [events]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Goal Mode Analytics</h1>
      <p className="mt-2 text-sm opacity-70">
        Tracks intent funnel events captured in local storage.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Intent Opened" value={String(funnel.opened)} />
        <Metric label="Intent Previewed" value={String(funnel.previews)} />
        <Metric label="Blocked Plans" value={String(funnel.blocked)} />
        <Metric label="Preview Conversion" value={`${funnel.conversion}%`} />
      </div>

      <div className="mt-8 rounded-xl border border-[var(--tc-border)] bg-[var(--tc-bg)] p-4">
        <h2 className="text-sm font-semibold">Recent Events</h2>
        <ul className="mt-3 space-y-2 text-xs">
          {events.slice(-12).reverse().map((event, i) => (
            <li key={`${event.ts}-${i}`} className="rounded-lg border border-[var(--tc-border)] p-2">
              <div className="font-medium">{event.name}</div>
              <div className="opacity-70">{new Date(event.ts).toLocaleString()}</div>
            </li>
          ))}
          {events.length === 0 && <li className="opacity-70">No events yet.</li>}
        </ul>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--tc-border)] bg-[var(--tc-bg)] p-3">
      <div className="text-xs opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
