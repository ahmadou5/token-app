import { NextResponse } from "next/server";
import { fetchStakeWizValidatorInfos } from "@/lib/services/stakewizValidators.service";

export async function GET() {
  try {
    const validators = await fetchStakeWizValidatorInfos();

    // Sort by stake amount (descending) by default
    validators.sort((a, b) => b.stake - a.stake);

    // Keep response contract used by the frontend hook
    return NextResponse.json({
      validators,
      currentEpochInfo: null,
    });
  } catch (error) {
    console.error("Error fetching validators from StakeWiz:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch validators from StakeWiz",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
