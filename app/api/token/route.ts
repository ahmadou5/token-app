import { NextResponse } from "next/server";
import axios from "axios";
import { limiter } from "@/lib/rate-limit";

// Define allowed API patterns to prevent SSRF (Server-Side Request Forgery)
// We only allow specific paths on the upstream API.
const ALLOWED_PATTERNS = [
  /^\/assets\/curated$/,               // List curated assets
  /^\/assets\/search$/,                // Search tokens
  /^\/assets\/[a-zA-Z0-9\.-]+$/,       // Single asset (by ID or Mint)
  /^\/assets\/[a-zA-Z0-9\.-]+\/ohlcv$/, // OHLCV data for an asset
  /^\/assets\/[a-zA-Z0-9\.-]+\/variants$/, // Variants for an asset
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  // 1. Rate Limiting Check
  // We identify users by their IP address (or 'anonymous' if missing)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "anonymous";
  const isRateAllowed = limiter.check(100, ip); // 100 requests per minute

  if (!isRateAllowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  // 2. Input Validation
  if (!endpoint) {
    return NextResponse.json(
      { error: "No endpoint provided" },
      { status: 400 }
    );
  }

  // 3. SSRF & Path Traversal Protection: Whitelist Check
  // We extract the path part of the endpoint (ignoring query strings for the pattern match)
  const pathPart = endpoint.split("?")[0];
  const isWhitelisted = ALLOWED_PATTERNS.some((pattern) => pattern.test(pathPart));

  if (!isWhitelisted) {
    console.warn(`[Security] Blocked unauthorized proxy attempt to: ${endpoint} from IP: ${ip}`);
    return NextResponse.json(
      { error: "Access to this endpoint is restricted." },
      { status: 403 }
    );
  }

  try {
    const response = await axios.get(
      `${process.env.TOKEN_API_BASE_URL}${endpoint}`,
      {
        headers: {
          "x-api-key": process.env.TOKEN_API_KEY,
          Accept: "application/json",
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    const status = (error as { response?: { status?: number } }).response?.status || 500;
    return NextResponse.json(
      { error: (error as Error).message },
      { status },
    );
  }
}
