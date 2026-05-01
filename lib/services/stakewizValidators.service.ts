import { ValidatorInfo, StakeWizValidator } from "@/types/validator";

// StakeWiz public validators endpoint
const STAKEWIZ_VALIDATORS_URL = "https://api.stakewiz.com/validators";

function toNumber(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function mapStakeWizToValidatorInfo(v: StakeWizValidator): ValidatorInfo {
  const latitude = toNumber(v.ip_latitude);
  const longitude = toNumber(v.ip_longitude);

  // In StakeWiz response activated_stake appears to be in SOL already
  const stakeSol = typeof v.activated_stake === "number" ? v.activated_stake : 0;

  return {
    address: v.identity,
    votingPubkey: v.vote_identity,

    name: v.name || `Validator ${v.identity.slice(0, 8)}...`,
    commission: typeof v.commission === "number" ? v.commission : 0,

    stake: stakeSol,
    delegatedStake: stakeSol,
    activatedStake: stakeSol,

    apy: typeof v.total_apy === "number" ? v.total_apy : 0,
    skipRate:
      typeof v.skip_rate === "number"
        ? v.skip_rate
        : typeof v.wiz_skip_rate === "number"
          ? v.wiz_skip_rate
          : 0,

    dataCenter: v.ip_org || v.ip_asn || "Unknown",

    website: v.website || undefined,
    description: v.description || "Solana validator node",
    avatar: v.image || "",

    status: v.delinquent ? "delinquent" : "active",

    epochCredits: typeof v.epoch_credits === "number" ? [v.epoch_credits] : [],

    lastVote: typeof v.last_vote === "number" ? v.last_vote : 0,
    rootSlot: typeof v.root_slot === "number" ? v.root_slot : 0,

    country: v.ip_country || undefined,
    city: v.ip_city || undefined,

    uptime: typeof v.uptime === "number" ? v.uptime : undefined,

    performanceHistory: [],

    location:
      typeof latitude === "number" && typeof longitude === "number"
        ? {
            coordinates: [longitude, latitude],
            city: v.ip_city || undefined,
            country: v.ip_country || undefined,
            latitude,
            longitude,
            lat: latitude,
            lng: longitude,
          }
        : undefined,

    identity: v.identity,
    voteIdentity: v.vote_identity,
    rank: v.rank,
    version: v.version,
    isJito: v.is_jito,
    asn: v.ip_asn,
    asnOrganization: v.ip_org,
    totalApy: v.total_apy,
    stakingApy: v.staking_apy,
    jitoApy: v.jito_apy,
  };
}

/**
 * Retry logic with exponential backoff
 */
async function fetchWithRetry(
  url: string,
  maxRetries: number = 3,
  timeout: number = 15000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`StakeWiz retry attempt ${attempt}/${maxRetries} for ${url}`);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          "User-Agent": "StakeitValidator/1.0",
        },
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return res;
      }

      if (res.status >= 400 && res.status < 500) {
        throw new Error(`StakeWiz request failed: ${res.status} ${res.statusText}`);
      }

      lastError = new Error(`HTTP ${res.status}: ${res.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === "AbortError") {
        lastError = new Error(`StakeWiz request timeout after ${timeout}ms`);
        console.warn(`StakeWiz timeout on attempt ${attempt + 1}: ${lastError.message}`);
        break;
      }

      console.warn(`StakeWiz fetch error on attempt ${attempt + 1}: ${lastError.message}`);

      if (attempt < maxRetries) {
        const delay = 100 * Math.pow(2, attempt);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to fetch validators after retries");
}

export async function fetchStakeWizValidators(): Promise<StakeWizValidator[]> {
  const res = await fetchWithRetry(STAKEWIZ_VALIDATORS_URL, 3, 15000);

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("StakeWiz response was not an array");
  }

  return data as StakeWizValidator[];
}

export async function fetchStakeWizValidatorInfos(): Promise<ValidatorInfo[]> {
  const raw = await fetchStakeWizValidators();
  return raw.map(mapStakeWizToValidatorInfo);
}

export async function getStakeWizValidatorByAddress(
  address: string
): Promise<ValidatorInfo | null> {
  const raw = await fetchStakeWizValidators();
  const found = raw.find(
    (v) => v.identity === address || v.vote_identity === address
  );
  return found ? mapStakeWizToValidatorInfo(found) : null;
}
