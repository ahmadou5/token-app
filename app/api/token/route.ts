import { NextResponse } from "next/server";
import axios from "axios";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  if (!endpoint)
    return NextResponse.json(
      { error: "No endpoint provided" },
      { status: 400 },
    );

  try {
    const response = await axios.get(
      `https://api.tokens.xyz/api/v1${endpoint}`,
      {
        headers: {
          "x-api-key": process.env.TOKEN_API_KEY,
          Accept: "application/json",
        },
      },
    );
    return NextResponse.json(response.data);
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error as Error).message },
      {
        status:
          (error as { response?: { status?: number } }).response?.status || 500,
      },
    );
  }
}
