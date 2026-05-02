import { HomePage } from "@/components/home/HomePage";
import axios from "axios";
import { fetchStakeWizValidatorInfos } from "@/lib/services/stakewizValidators.service";
import { ValidatorInfo } from "@/types/validator";
import { TokenAsset } from "@/hooks/useToken";

export default async function Page() {
  let initialMarkets: TokenAsset[] = [];
  let initialValidators: ValidatorInfo[] = [];

  try {
    // 1. Fetch Markets (Curated Tokens)
    // We use the internal proxy endpoint logic but on the server
    const marketRes = await axios.get(
      `${process.env.TOKEN_API_BASE_URL}/assets/curated?list=all&groupBy=asset`,
      {
        headers: {
          "x-api-key": process.env.TOKEN_API_KEY,
          Accept: "application/json",
        },
      }
    );
    initialMarkets = marketRes.data.assets || [];

    // 2. Fetch Validators
    const validators = await fetchStakeWizValidatorInfos();
    validators.sort((a, b) => b.stake - a.stake);
    initialValidators = validators;
  } catch (err) {
    console.error("Prefetch failed:", err);
  }

  return (
    <HomePage 
      initialMarkets={initialMarkets} 
      initialValidators={initialValidators} 
    />
  );
}
