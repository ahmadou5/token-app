import { getValidators } from "@/hooks/useValidators";
import { ValidatorsTable } from "./ValidatorsTable";
import Link from "next/link";

export default async function ValidatorsPage() {
  const validators = await getValidators();

  return (
    <div className="max-w-[1400px] mx-auto px-6 pb-24">
      <header className="tg-hero !py-16 !text-left !px-0 !bg-transparent">
        <h1 className="tg-hero__title !text-5xl !mb-4 uppercase tracking-tighter">Network Nodes</h1>
        <p className="tg-hero__sub !text-[16px] !max-w-2xl font-medium leading-relaxed">
          The Solana network is powered by decentralized nodes. Stake your SOL with high-performance validators to secure the blockchain and earn protocol rewards.
        </p>
      </header>

      <ValidatorsTable initialValidators={validators} />
    </div>
  );
}
