import { ValidatorInfo } from "@/types/validator";
import { fetchStakeWizValidatorInfos, getStakeWizValidatorByAddress } from "@/lib/services/stakewizValidators.service";

export type Validator = ValidatorInfo;

export async function getValidators(): Promise<Validator[]> {
  try {
    // If on server, call service directly to avoid fetch issues
    if (typeof window === "undefined") {
      const validators = await fetchStakeWizValidatorInfos();
      validators.sort((a, b) => b.stake - a.stake);
      return validators;
    }

    const res = await fetch("/api/validators", {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch validators: ${res.statusText}`);
    }

    const data = await res.json();
    return data.validators || [];
  } catch (error) {
    console.error("Error fetching validators:", error);
    return [];
  }
}

export async function getValidator(
  voteAccount: string,
): Promise<Validator | null> {
  try {
    // If on server, call service directly
    if (typeof window === "undefined") {
      return await getStakeWizValidatorByAddress(voteAccount);
    }

    const res = await fetch(`/api/validators/${voteAccount}`, {
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch validator: ${res.statusText}`);
    }

    const data = await res.json();
    return data.response || null;
  } catch (error) {
    console.error("Error fetching validator:", error);
    return null;
  }
}

export async function getEpochInfo() {
  try {
    // We can keep this if needed, or update it to use a StakeWiz endpoint if they have one.
    // For now, let's keep it as is or return null if we want to rely solely on StakeWiz.
    const res = await fetch("https://solanabeach.io/api/v1/epoch-info", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}
