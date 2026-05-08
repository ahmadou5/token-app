import { getValidators } from "@/hooks/useValidators";
import { ValidatorsTable } from "./ValidatorsTable";

export default async function ValidatorsPage() {
  const validators = await getValidators();

  return (
    <div className="tg">
      {/* Hero */}
      <div className="tg-hero">
        <h1 className="tg-hero__title">Network Nodes</h1>
        <p className="tg-hero__sub">
          The Solana network is powered by decentralized nodes. Stake your SOL
          with high-performance validators to secure the blockchain and earn
          protocol rewards.
        </p>
      </div>

      {/* Table */}
      <div className="max-w-[1400px] w-full mx-auto px-6 py-12" style={{ padding: "0 24px 80px" }}>
        <ValidatorsTable initialValidators={validators} />
      </div>
    </div>
  );
}