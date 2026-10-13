import { AlertCircle, Loader2, RefreshCw } from "lucide-react";

type LoadingStateProps = {
  message?: string;
};

export function LoadingState({ message = "Carregando..." }: LoadingStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <Loader2
        className="size-8 animate-spin text-amber-400"
        strokeWidth={2.2}
      />
      <p className="mt-4 text-sm text-zinc-400">{message}</p>
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = "Falha ao carregar dados",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
        <AlertCircle className="size-6" strokeWidth={2.2} />
      </span>
      <h2 className="mt-4 text-base font-semibold text-zinc-100">{title}</h2>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-400">
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:border-zinc-700"
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </button>
      ) : null}
    </div>
  );
}
