import { NextRequest, NextResponse } from "next/server";
import { appendGoalEvent, listGoalEvents } from "@/lib/services/analyticsStore.service";
import type { GoalEvent } from "@/types/analytics";

interface EventsPostBody {
  name?: string;
  payload?: Record<string, unknown>;
  ts?: string;
}

export async function GET(req: NextRequest) {
  try {
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 200;
    const events = await listGoalEvents(limit);
    return NextResponse.json({ ok: true, events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load analytics events";
    console.error("[api/analytics/events][GET] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventsPostBody;

    if (!body.name || typeof body.name !== "string") {
      return NextResponse.json({ ok: false, err: "Missing event name" }, { status: 400 });
    }

    const event: GoalEvent = {
      name: body.name,
      payload: body.payload ?? {},
      ts: typeof body.ts === "string" ? body.ts : new Date().toISOString(),
    };

    await appendGoalEvent(event);
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to store analytics event";
    console.error("[api/analytics/events][POST] Error:", error);
    return NextResponse.json({ ok: false, err: message }, { status: 500 });
  }
}

