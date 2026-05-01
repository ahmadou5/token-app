import { ValidatorInfo } from "@/types/validator";

export type Validator = ValidatorInfo;

export async function getValidators(): Promise<Validator[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const res = await fetch(`${baseUrl}/api/validators`, {
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "";
    const res = await fetch(`${baseUrl}/api/validators/${voteAccount}`, {
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
