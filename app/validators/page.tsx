import { getValidators } from "@/hooks/useValidators";
import { ValidatorsTable } from "./ValidatorsTable";
import Link from "next/link";

export default async function ValidatorsPage() {
  const validators = await getValidators();

  return (
    <div className="vl-page max-w-7xl mx-auto px-4 py-8">
      <header className="vl-header flex items-center gap-4 mb-8">
        <Link href="/" className="vl-back-btn p-2 rounded-full hover:bg-[var(--tc-bg-muted)] transition-colors">
          <svg viewBox="0 0 16 16" fill="none" width="20" height="20">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="vl-title text-2xl font-bold text-[var(--tc-text-primary)]">Validators</h1>
      </header>

      <ValidatorsTable initialValidators={validators} />
    </div>
  );
}
