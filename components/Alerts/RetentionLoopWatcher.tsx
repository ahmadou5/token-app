"use client";

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/connector";
import { useAlertCenter } from "@/context/AlertCenterContext";
import { trackEvent } from "@/lib/analytics";
import type { GoalEvent } from "@/types/analytics";

const INACTIVITY_HOURS = 72;
const CHECK_INTERVAL_MS = 15 * 60 * 1000;
const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function buildCooldownKey(owner: string): string {
  return `retention_alert_last_${owner}`;
}

export function RetentionLoopWatcher() {
  const { account, isConnected } = useWallet();
  const { addAlert } = useAlertCenter();
  const lastFingerprintRef = useRef<string>("");

  useEffect(() => {
    if (!isConnected || !account) return;

    async function runCheck() {
      try {
        const res = await fetch("/api/analytics/events?limit=1500", { cache: "no-store" });
        const data = (await res.json()) as { ok: boolean; events?: GoalEvent[] };
        if (!res.ok || !data.ok || !Array.isArray(data.events)) return;

        const confirmedForWallet = data.events
          .filter(
            (e) =>
              e.name === "intent_execute_confirmed" &&
              String(e.payload?.owner ?? "") === account,
          )
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

        if (confirmedForWallet.length === 0) return;

        const lastTs = new Date(confirmedForWallet[0].ts).getTime();
        if (!Number.isFinite(lastTs)) return;

        const elapsedMs = Date.now() - lastTs;
        const thresholdMs = INACTIVITY_HOURS * 60 * 60 * 1000;
        if (elapsedMs < thresholdMs) return;

        const hoursInactive = Math.floor(elapsedMs / (60 * 60 * 1000));
        const fingerprint = `${account}:${confirmedForWallet[0].ts}`;
        if (fingerprint === lastFingerprintRef.current) return;

        const cooldownKey = buildCooldownKey(account);
        const lastAlertTs = Number(window.localStorage.getItem(cooldownKey) ?? "0");
        if (Number.isFinite(lastAlertTs) && Date.now() - lastAlertTs < ALERT_COOLDOWN_MS) return;

        lastFingerprintRef.current = fingerprint;
        window.localStorage.setItem(cooldownKey, String(Date.now()));

        addAlert({
          title: "Strategy resume opportunity",
          message: `No confirmed Goal Mode execution in ~${hoursInactive}h. Resume with one tap to keep your outcome plan active.`,
          level: "info",
          actions: [
            { kind: "resume_strategy_now", label: "Resume Strategy" },
            { kind: "open_portfolio", label: "Open Portfolio" },
          ],
        });

        trackEvent("retention_reengagement_alerted", {
          owner: account,
          inactiveHours: hoursInactive,
          basedOnTxAt: confirmedForWallet[0].ts,
        });
      } catch {
        // non-blocking
      }
    }

    const kickoff = window.setTimeout(runCheck, 3000);
    const timer = window.setInterval(runCheck, CHECK_INTERVAL_MS);

    return () => {
      window.clearTimeout(kickoff);
      window.clearInterval(timer);
    };
  }, [account, isConnected, addAlert]);

  return null;
}

