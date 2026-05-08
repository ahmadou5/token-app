import { getValidator } from "@/hooks/useValidators";
import { ValidatorDetailContent } from "./ValidatorDetailContent";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ voteAccount: string }>;
}

export default async function ValidatorDetailPage({ params }: PageProps) {
  const { voteAccount } = await params;
  const validator = await getValidator(voteAccount);

  if (!validator) {
    notFound();
  }

  return (
    <div className="vs-page max-w-4xl mx-auto px-4 py-8">
      <header className="vs-header flex items-center gap-4 mb-8">
        <Link href="/validators" className="vs-back-btn p-2 rounded-full hover:bg-[var(--tc-bg-muted)] transition-colors">
          <svg viewBox="0 0 16 16" fill="none" width="20" height="20">
            <path d="M10 4l-4 4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <h1 className="vs-title text-2xl font-bold text-[var(--tc-text-primary)]">Network Detail</h1>
      </header>

      <ValidatorDetailContent validator={validator} />
    </div>
  );
}
