import { NextResponse } from "next/server";
import { getStakeWizValidatorByAddress } from "@/lib/services/stakewizValidators.service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: "Address parameter is missing" },
        { status: 400 }
      );
    }

    const validator = await getStakeWizValidatorByAddress(address);

    if (!validator) {
      return NextResponse.json(
        { error: "Validator not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ response: validator });
  } catch (error: unknown) {
    if(error instanceof Error)
    console.error("API Error:", error.message || error);
    return NextResponse.json(
      { error: "Failed to fetch validator data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
