import { AccentIconWrap } from "@/components/app-shell";
import { TenantBrand } from "@/components/tenant-brand";
import type { LucideIcon } from "lucide-react";
import {
  CalendarClock,
  ChevronRight,
  Sparkles,
  UserRound,
} from "lucide-react";
import Link from "next/link";

type QuickActionProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: QuickActionProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-36 flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 text-left transition active:scale-[0.98] hover:border-zinc-700 hover:bg-zinc-900"
    >
      <AccentIconWrap className="size-11">
        <Icon className="size-5" strokeWidth={2.2} />
      </AccentIconWrap>
      <span>
        <span className="block text-sm font-semibold text-zinc-100">
          {title}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
          {description}
        </span>
      </span>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="relative flex flex-1 flex-col px-5 pb-8 pt-10">
      <header className="flex flex-col items-center text-center">
        <TenantBrand showTagline />
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-50">
          Clubby
        </h1>
      </header>

      <section className="mt-10 grid grid-cols-2 gap-3">
        <QuickAction
          href="/agendar"
          icon={CalendarClock}
          title="Agendar horário"
          description="Escolha serviço, profissional e melhor horário."
        />
        <QuickAction
          href="/cliente"
          icon={UserRound}
          title="Área do Cliente"
          description="Veja agendamentos, histórico e benefícios."
        />
      </section>

      <section className="mt-8">
        <Link
          href="/agendar"
          className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-5 py-4 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)] transition active:scale-[0.98]"
        >
          <Sparkles className="size-4" strokeWidth={2.4} />
          Agendar agora
          <ChevronRight
            className="size-4 transition group-hover:translate-x-0.5"
            strokeWidth={2.4}
          />
        </Link>
      </section>

      <footer className="mt-auto pt-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">
          Powered by Clubby
        </p>
      </footer>
    </div>
  );
}
