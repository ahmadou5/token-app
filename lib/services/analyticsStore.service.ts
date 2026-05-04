import { promises as fs } from "node:fs";
import path from "node:path";
import type { GoalEvent } from "@/types/analytics";

const STORE_PATH = path.join(process.cwd(), "data", "analytics-events.json");
const MAX_EVENTS = 5000;

async function readAll(): Promise<GoalEvent[]> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as GoalEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(events: GoalEvent[]) {
  await fs.writeFile(STORE_PATH, JSON.stringify(events.slice(-MAX_EVENTS)), "utf8");
}

export async function listGoalEvents(limit = 200): Promise<GoalEvent[]> {
  const all = await readAll();
  return all.slice(-Math.max(1, Math.min(limit, 2000)));
}

export async function appendGoalEvent(event: GoalEvent): Promise<void> {
  const all = await readAll();
  all.push(event);
  await writeAll(all);
}

