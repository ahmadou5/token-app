"use client";

import { useEffect, useMemo, useState } from "react";
import type { GoalEvent } from "@/types/analytics";

export default function AnalyticsPage() {
  const [events, setEvents] = useState<GoalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const res = await fetch("/api/analytics/events?limit=500", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; events?: GoalEvent[] };
        if (!active) return;
        if (res.ok && data.ok && Array.isArray(data.events)) {
          setEvents(data.events);
        } else {
          setEvents([]);
        }
      } catch {
        if (active) setEvents([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadEvents();
    return () => {
      active = false;
    };
  }, []);

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

  const kpis = useMemo(() => {
    const executeConfirmed = events.filter((e) => e.name === "intent_execute_confirmed");
    const executeStarted = events.filter((e) => e.name === "intent_execute_started");
    const nowMs = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    const activeWallets = new Set(
      executeConfirmed
        .filter((e) => {
          const t = new Date(e.ts).getTime();
          return Number.isFinite(t) && nowMs - t <= sevenDaysMs;
        })
        .map((e) => String(e.payload?.owner ?? ""))
        .filter(Boolean),
    );

    const openedBySession = new Map<string, number>();
    for (const ev of events) {
      if (ev.name !== "intent_opened") continue;
      const id = String(ev.payload?.intentSessionId ?? "");
      if (!id) continue;
      openedBySession.set(id, new Date(ev.ts).getTime());
    }

    const confirmDurationsMs: number[] = [];
    for (const ev of executeConfirmed) {
      const explicit = Number(ev.payload?.durationMs);
      if (Number.isFinite(explicit) && explicit > 0) {
        confirmDurationsMs.push(explicit);
        continue;
      }
      const id = String(ev.payload?.intentSessionId ?? "");
      const openedAt = id ? openedBySession.get(id) : undefined;
      const confirmedAt = new Date(ev.ts).getTime();
      if (!openedAt || !Number.isFinite(confirmedAt) || confirmedAt <= openedAt) continue;
      confirmDurationsMs.push(confirmedAt - openedAt);
    }
    confirmDurationsMs.sort((a, b) => a - b);
    const mid = Math.floor(confirmDurationsMs.length / 2);
    const medianConfirmMs =
      confirmDurationsMs.length === 0
        ? 0
        : confirmDurationsMs.length % 2 === 1
          ? confirmDurationsMs[mid]
          : Math.round((confirmDurationsMs[mid - 1] + confirmDurationsMs[mid]) / 2);

    const byWallet = new Map<string, number[]>();
    for (const ev of executeConfirmed) {
      const wallet = String(ev.payload?.owner ?? "");
      const ts = new Date(ev.ts).getTime();
      if (!wallet || !Number.isFinite(ts)) continue;
      const list = byWallet.get(wallet) ?? [];
      list.push(ts);
      byWallet.set(wallet, list);
    }

    let retainedWallets = 0;
    for (const [, times] of byWallet) {
      times.sort((a, b) => a - b);
      const first = times[0];
      const hasSevenDayReturn = times.some((t) => t - first >= sevenDaysMs);
      if (hasSevenDayReturn) retainedWallets += 1;
    }

    return {
      waow: activeWallets.size,
      executionConversion:
        funnel.opened > 0 ? ((executeStarted.length / funnel.opened) * 100).toFixed(1) : "0.0",
      retention7d:
        byWallet.size > 0 ? ((retainedWallets / byWallet.size) * 100).toFixed(1) : "0.0",
      medianConfirmMins: medianConfirmMs > 0 ? (medianConfirmMs / 60000).toFixed(1) : "0.0",
    };
  }, [events, funnel.opened]);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-semibold">Goal Mode Analytics</h1>
      <p className="mt-2 text-sm opacity-70">
        Tracks intent funnel events captured in persistent backend storage.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Intent Opened" value={String(funnel.opened)} />
        <Metric label="Intent Previewed" value={String(funnel.previews)} />
        <Metric label="Blocked Plans" value={String(funnel.blocked)} />
        <Metric label="Preview Conversion" value={`${funnel.conversion}%`} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="WAOW (7d)" value={String(kpis.waow)} />
        <Metric label="Intent -> Execute" value={`${kpis.executionConversion}%`} />
        <Metric label="7d Retention" value={`${kpis.retention7d}%`} />
        <Metric label="Median Confirm Time" value={`${kpis.medianConfirmMins}m`} />
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
          {!loading && events.length === 0 && <li className="opacity-70">No events yet.</li>}
          {loading && <li className="opacity-70">Loading events...</li>}
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
