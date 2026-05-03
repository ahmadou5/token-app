"use client";

import { useEffect, useMemo, useRef } from "react";
import { useWallet } from "@solana/connector";
import { useRebalanceSettings } from "@/context/RebalanceSettingsContext";
import { useAlertCenter } from "@/context/AlertCenterContext";
import { usePortfolioData } from "@/hooks/usePortfolioData";

interface Allocation {
  symbol: string;
  pct: number;
}

function buildCurrentAllocations(
  tokens: Array<{ symbol: string; usdValue: number }>,
  totalUsd: number,
): Allocation[] {
  if (!totalUsd || totalUsd <= 0) return [];

  return tokens
    .filter((t) => t.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 6)
    .map((t) => ({
      symbol: t.symbol,
      pct: Number(((t.usdValue / totalUsd) * 100).toFixed(2)),
    }));
}

function buildTargetAllocations(symbols: string[], maxPct: number): Allocation[] {
  if (symbols.length === 0) return [];

  const base = 100 / symbols.length;
  const targets = symbols.map((symbol) => ({
    symbol,
    pct: Math.min(base, maxPct),
  }));

  const used = targets.reduce((sum, t) => sum + t.pct, 0);
  let remaining = Number((100 - used).toFixed(2));

  for (let i = 0; i < targets.length && remaining > 0; i += 1) {
    const room = Number((maxPct - targets[i].pct).toFixed(2));
    if (room <= 0) continue;
    const add = Math.min(room, remaining);
    targets[i].pct = Number((targets[i].pct + add).toFixed(2));
    remaining = Number((remaining - add).toFixed(2));
  }

  if (remaining > 0) {
    targets[0].pct = Number((targets[0].pct + remaining).toFixed(2));
  }

  return targets;
}

export function RebalanceAlertWatcher() {
  const { account, isConnected } = useWallet();
  const { settings } = useRebalanceSettings();
  const { addAlert } = useAlertCenter();
  const { tokens, totalUsd, refetch } = usePortfolioData(account ?? null);

  const lastCheckRef = useRef(0);
  const lastSignatureRef = useRef<string>("");

  const currentAllocations = useMemo(
    () => buildCurrentAllocations(tokens, totalUsd),
    [tokens, totalUsd],
  );

  useEffect(() => {
    if (!isConnected || !account || !settings.enabled) return;

    const intervalMs = Math.max(60_000, settings.checkIntervalHours * 60 * 60 * 1000);

    async function runCheck(force = false) {
      const now = Date.now();
      if (!force && now - lastCheckRef.current < intervalMs) return;
      lastCheckRef.current = now;

      await refetch();

      const symbols = currentAllocations.map((a) => a.symbol);
      const targets = buildTargetAllocations(symbols, settings.maxAllocationPctPerAsset);
      if (currentAllocations.length === 0 || targets.length === 0) return;

      const res = await fetch("/api/portfolio/rebalance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: account,
          currentAllocations,
          targetAllocations: targets,
          rule: settings,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        suggestions?: Array<{
          symbol: string;
          driftPct: number;
          currentPct: number;
          targetPct: number;
        }>;
        err?: string;
      };

      if (!res.ok || !data.ok) {
        addAlert({
          title: "Rebalance check failed",
          message: data.err ?? "Could not evaluate drift.",
          level: "error",
          actions: [
            { kind: "run_rebalance_now", label: "Run Check Now" },
            { kind: "open_portfolio", label: "Open Portfolio" },
          ],
        });
        return;
      }

      const suggestions = data.suggestions ?? [];
      if (suggestions.length === 0) return;

      const fingerprint = suggestions
        .map((s) => `${s.symbol}:${s.driftPct.toFixed(2)}`)
        .join("|");

      if (fingerprint === lastSignatureRef.current) return;
      lastSignatureRef.current = fingerprint;

      const top = suggestions[0];
      addAlert({
        title: "Rebalance threshold breached",
        message: `${suggestions.length} assets exceed drift threshold. Top: ${top.symbol} drift ${top.driftPct.toFixed(2)}% (${top.currentPct.toFixed(2)}% -> ${top.targetPct.toFixed(2)}%).`,
        level: "warning",
        actions: [
          { kind: "run_rebalance_now", label: "Run Check Now" },
          { kind: "open_portfolio", label: "Open Portfolio" },
        ],
      });
    }

    function handleManualRun() {
      void runCheck(true);
    }

    const timer = window.setInterval(runCheck, intervalMs);
    const kickoff = window.setTimeout(runCheck, 2000);
    window.addEventListener("rebalance-run-now", handleManualRun);

    return () => {
      window.clearInterval(timer);
      window.clearTimeout(kickoff);
      window.removeEventListener("rebalance-run-now", handleManualRun);
    };
  }, [
    isConnected,
    account,
    settings,
    currentAllocations,
    addAlert,
    refetch,
  ]);

  return null;
}
