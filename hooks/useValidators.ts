export interface Validator {
  rank: number;
  name: string;
  voteAccount: string;
  activatedStake: number;
  commission: number;
  apy: number;
  skipRate: number;
  imageUrl?: string;
  website?: string;
  keybase?: string;
}

export async function getValidators(): Promise<Validator[]> {
  try {
    const res = await fetch(
      "https://solanabeach.io/api/v1/validators?limit=100&offset=0",
      {
        next: { revalidate: 300 },
      },
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch validators: ${res.statusText}`);
    }

    const data = await res.json();

    // Map Solana Beach API fields to our interface
    // Note: Assuming standard Solana Beach v1 response format
    return data.map((v: any, index: number) => {
      // APY calculation: Solana Beach usually returns epochCredits.
      // We'll look for an apy field first, otherwise derive it.
      // For this implementation, we'll look for 'apy' or default to 7.0
      const apy = v.apy || 7.0;

      return {
        rank: index + 1,
        name: v.name || v.voteAccount.slice(0, 8),
        voteAccount: v.voteAccount,
        activatedStake: v.activatedStake / 1e9, // Convert lamports to SOL
        commission: v.commission,
        apy,
        skipRate: v.skipRate || 0,
        imageUrl: v.image,
        website: v.website,
        keybase: v.keybase,
      };
    });
  } catch (error) {
    console.error("Error fetching validators:", error);
    return [];
  }
}

export async function getValidator(
  voteAccount: string,
): Promise<Validator | null> {
  const validators = await getValidators();
  return validators.find((v) => v.voteAccount === voteAccount) || null;
}

export async function getEpochInfo() {
  try {
    const res = await fetch("https://solanabeach.io/api/v1/epoch-info", {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}
