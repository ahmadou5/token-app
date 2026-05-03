"use client";

import { useCallback, useState } from "react";
import type { IntentPlan, IntentRequest } from "@/types/intent";

export type IntentPlannerStatus = "idle" | "loading" | "ready" | "error";

interface UseIntentPlannerResult {
  plan: IntentPlan | null;
  status: IntentPlannerStatus;
  error: string | null;
  previewIntent: (payload: IntentRequest) => Promise<IntentPlan | null>;
  clear: () => void;
}

export function useIntentPlanner(): UseIntentPlannerResult {
  const [plan, setPlan] = useState<IntentPlan | null>(null);
  const [status, setStatus] = useState<IntentPlannerStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setPlan(null);
    setStatus("idle");
    setError(null);
  }, []);

  const previewIntent = useCallback(async (payload: IntentRequest) => {
    try {
      setStatus("loading");
      setError(null);

      const res = await fetch("/api/intent/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        ok: boolean;
        plan?: IntentPlan;
        err?: string;
      };

      if (!res.ok || !data.ok || !data.plan) {
        throw new Error(data.err ?? "Failed to preview intent");
      }

      setPlan(data.plan);
      setStatus("ready");
      return data.plan;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to preview intent";
      setPlan(null);
      setStatus("error");
      setError(message);
      return null;
    }
  }, []);

  return { plan, status, error, previewIntent, clear };
}
