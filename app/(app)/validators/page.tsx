import { getValidators } from "@/hooks/useValidators";
import { ValidatorsTable } from "./ValidatorsTable";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";

export default async function ValidatorsPage() {
  const validators = await getValidators();

  return (
    <div className="vl-page tg max-w-7xl mx-auto px-6 py-12">
      <header className="vl-header flex flex-col gap-6 mb-12">
        <div className="flex items-center gap-4">
          <Link href="/markets" className="p-3 rounded-2xl bg-[var(--tc-surface)] border border-[var(--tc-border)] hover:border-[var(--tc-accent)] text-[var(--tc-text-muted)] hover:text-[var(--tc-accent)] transition-all">
            <ArrowLeft size={20} weight="bold" />
          </Link>
          <div className="flex flex-col">
            <h1 className="text-4xl font-black text-[var(--tc-text-primary)] tracking-tight uppercase">Network Nodes</h1>
            <p className="text-[14px] font-bold text-[var(--tc-text-muted)]">Secure the Solana network and earn rewards by delegating your SOL.</p>
          </div>
        </div>
      </header>

      <ValidatorsTable initialValidators={validators} />
    </div>
  );
}
