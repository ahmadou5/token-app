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
    <div className="td-page">
      <div className="td-topbar">
        <div className="td-topbar__left">
          <Link href="/validators" className="td-back">
            <svg viewBox="0 0 16 16" fill="none" width="14" height="14">
              <path
                d="M10 4l-4 4 4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Validators
          </Link>
          <span className="td-breadcrumb__sep" style={{ color: "var(--tc-text-muted)", fontSize: 12 }}>/</span>
          <span
            className="td-breadcrumb__item td-breadcrumb__item--mint"
            style={{ color: "var(--tc-text-muted)", fontSize: 11, fontFamily: "var(--tc-font-mono)" }}
          >
            {voteAccount.slice(0, 8)}…{voteAccount.slice(-6)}
          </span>
        </div>
      </div>

      <ValidatorDetailContent validator={validator} />
    </div>
  );
}