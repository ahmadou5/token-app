import { promises as fs } from "node:fs";
import path from "node:path";
import type { EarnProvider } from "@/context/SwapSettingsContext";

const STORE_PATH = path.join(process.cwd(), "data", "yield-positions.json");

export interface StoredYieldPosition {
  wallet: string;
  provider: EarnProvider;
  mint: string;
  symbol: string;
  amount: number;
  yieldUsd: number;
  updatedAt: string;
}

async function readAll(): Promise<StoredYieldPosition[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoredYieldPosition[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(positions: StoredYieldPosition[]): Promise<void> {
  await fs.writeFile(STORE_PATH, JSON.stringify(positions, null, 2), "utf8");
}

export async function listYieldPositions(wallet: string): Promise<StoredYieldPosition[]> {
  const all = await readAll();
  return all.filter((p) => p.wallet === wallet && p.amount > 0);
}

export async function applyYieldPositionDelta(input: {
  wallet: string;
  provider: EarnProvider;
  mint: string;
  symbol: string;
  action: "deposit" | "withdraw";
  amount: number;
}): Promise<StoredYieldPosition[]> {
  const all = await readAll();
  const idx = all.findIndex(
    (p) =>
      p.wallet === input.wallet &&
      p.provider === input.provider &&
      p.mint === input.mint,
  );

  const delta = input.action === "deposit" ? input.amount : -input.amount;
  const now = new Date().toISOString();

  if (idx === -1) {
    if (delta > 0) {
      all.push({
        wallet: input.wallet,
        provider: input.provider,
        mint: input.mint,
        symbol: input.symbol,
        amount: delta,
        yieldUsd: 0,
        updatedAt: now,
      });
    }
  } else {
    const next = Math.max(0, all[idx].amount + delta);
    all[idx] = {
      ...all[idx],
      amount: next,
      updatedAt: now,
    };
  }

  await writeAll(all);
  return all.filter((p) => p.wallet === input.wallet && p.amount > 0);
}
