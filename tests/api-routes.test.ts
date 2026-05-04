import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as intentQuotePost } from "@/app/api/intent/quote/route";
import { POST as strategyExecutePost } from "@/app/api/strategy/execute/route";
import { POST as portfolioRebalancePost } from "@/app/api/portfolio/rebalance/route";

const USDC_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const SOL_MINT = "So11111111111111111111111111111111111111112";

function buildJsonRequest(url: string, body: unknown) {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/intent/quote", () => {
    it("returns a plan for a valid request", async () => {
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          outAmount: "123450000",
          priceImpactPct: "0.001",
          routePlan: [{ swapInfo: { label: "Orca" } }],
        }),
      } as Response);

      const req = buildJsonRequest("http://localhost/api/intent/quote", {
        inputMint: USDC_MINT,
        outputMint: SOL_MINT,
        inputAmountUi: "100",
        inputDecimals: 6,
        slippagePercent: 0.5,
        goal: "grow_sol_low_risk",
        riskProfile: "moderate",
        provider: "metis",
      });

      const res = await intentQuotePost(req);
      const data = (await res.json()) as {
        ok: boolean;
        plan?: { blocked: boolean; steps: Array<{ kind: string }> };
      };

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.plan).toBeDefined();
      expect(Array.isArray(data.plan?.steps)).toBe(true);
      expect(data.plan?.steps[0]?.kind).toBe("swap");
    });

    it("returns 400 for invalid amount", async () => {
      const req = buildJsonRequest("http://localhost/api/intent/quote", {
        inputMint: USDC_MINT,
        outputMint: SOL_MINT,
        inputAmountUi: "0",
        inputDecimals: 6,
        slippagePercent: 0.5,
        goal: "grow_sol_low_risk",
        riskProfile: "moderate",
        provider: "metis",
      });

      const res = await intentQuotePost(req);
      const data = (await res.json()) as { ok: boolean; err?: string };

      expect(res.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.err).toMatch(/Invalid input amount/i);
    });
  });

  describe("POST /api/strategy/execute", () => {
    it("returns executable actions for unblocked plan", async () => {
      const req = buildJsonRequest("http://localhost/api/strategy/execute", {
        owner: "wallet_abc",
        plan: {
          blocked: false,
          steps: [
            { kind: "swap", protocol: "metis", action: "swap" },
            { kind: "stake", protocol: "native-stake", action: "stake" },
          ],
        },
      });

      const res = await strategyExecutePost(req);
      const data = (await res.json()) as {
        ok: boolean;
        dryRun: boolean;
        actions: Array<{ status: string }>;
      };

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.dryRun).toBe(false);
      expect(data.actions[0]?.status).toBe("ready");
    });

    it("returns 400 when plan is blocked", async () => {
      const req = buildJsonRequest("http://localhost/api/strategy/execute", {
        owner: "wallet_abc",
        plan: {
          blocked: true,
          steps: [{ kind: "swap", protocol: "metis", action: "swap" }],
        },
      });

      const res = await strategyExecutePost(req);
      const data = (await res.json()) as { ok: boolean; err?: string };

      expect(res.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.err).toMatch(/Risk checks failed/i);
    });
  });

  describe("POST /api/portfolio/rebalance", () => {
    it("returns drift suggestions when threshold is exceeded", async () => {
      const req = buildJsonRequest("http://localhost/api/portfolio/rebalance", {
        owner: "wallet_abc",
        currentAllocations: [
          { symbol: "SOL", pct: 80 },
          { symbol: "USDC", pct: 20 },
        ],
        targetAllocations: [
          { symbol: "SOL", pct: 55 },
          { symbol: "USDC", pct: 45 },
        ],
        rule: {
          enabled: true,
          maxAllocationPctPerAsset: 70,
          driftThresholdPct: 10,
          checkIntervalHours: 24,
        },
      });

      const res = await portfolioRebalancePost(req);
      const data = (await res.json()) as {
        ok: boolean;
        suggestions: Array<{ symbol: string; driftPct: number }>;
      };

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.suggestions.length).toBeGreaterThan(0);
      expect(data.suggestions[0]?.symbol).toBe("SOL");
    });

    it("returns 400 when required fields are missing", async () => {
      const req = buildJsonRequest("http://localhost/api/portfolio/rebalance", {
        owner: "wallet_abc",
      });

      const res = await portfolioRebalancePost(req);
      const data = (await res.json()) as { ok: boolean; err?: string };

      expect(res.status).toBe(400);
      expect(data.ok).toBe(false);
      expect(data.err).toMatch(/Missing required fields/i);
    });
  });
});

