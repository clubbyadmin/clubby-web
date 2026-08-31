import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="inline-flex size-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-amber-400">
        <WifiOff className="size-7" strokeWidth={2.2} />
      </span>

      <h1 className="mt-6 text-xl font-semibold text-zinc-50">
        Você está offline
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
        Sem conexão no momento. Verifique sua internet e tente novamente para
        agendar no Studio Barbearia.
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center justify-center rounded-2xl bg-zinc-100 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-white"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
