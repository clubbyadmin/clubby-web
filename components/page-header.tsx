import { ChevronLeft } from "lucide-react";
import Link from "next/link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
};

export function PageHeader({
  title,
  subtitle,
  backHref = "/",
}: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start gap-3">
      <Link
        href={backHref}
        className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        aria-label="Voltar"
      >
        <ChevronLeft className="size-5" strokeWidth={2.2} />
      </Link>

      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-50">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
    </header>
  );
}
