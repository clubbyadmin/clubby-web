"use client";

import { AdminNav } from "@/components/admin-nav";
import { ErrorState, LoadingState } from "@/components/api-state";
import { AccentIconWrap } from "@/components/shell/accent-ui";
import { TenantBadge } from "@/components/tenant-brand";
import { useTenant } from "@/contexts/tenant-context";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/mock-data";
import {
  api,
  getErrorMessage,
  type AdjustStockPayload,
  type ApiProduct,
  type ApiProductCategory,
} from "@/services/api";
import {
  AlertTriangle,
  ArrowDownToLine,
  Loader2,
  Package,
  PackageMinus,
  PackagePlus,
  Plus,
  SlidersHorizontal,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

const CATEGORY_LABELS: Record<ApiProductCategory, string> = {
  USO_INTERNO: "Uso interno",
  REVENDA: "Revenda",
};

type ProductFilter = "ALL" | ApiProductCategory | "LOW_STOCK";

type ProductFormState = {
  name: string;
  category: ApiProductCategory;
  stockQuantity: string;
  minStockAlert: string;
  unitCost: string;
  salePrice: string;
};

type StockActionState = {
  product: ApiProduct;
  type: AdjustStockPayload["type"];
  quantity: string;
  reason: string;
};

const INITIAL_FORM: ProductFormState = {
  name: "",
  category: "USO_INTERNO",
  stockQuantity: "0",
  minStockAlert: "1",
  unitCost: "",
  salePrice: "",
};

export function EstoqueBoard() {
  const { tenant, loading: tenantLoading } = useTenant();
  const tenantId = tenant.id === "local" ? undefined : tenant.id;

  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [filter, setFilter] = useState<ProductFilter>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProductFormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [stockAction, setStockAction] = useState<StockActionState | null>(null);
  const [stockSubmitting, setStockSubmitting] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);

  const loadInventory = useCallback(async () => {
    if (!tenantId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.getInventory({ tenantId });
      setProducts(response);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const stats = useMemo(() => {
    const lowStock = products.filter(
      (product) => product.isLowStock && product.stockQuantity > 0,
    ).length;
    const outOfStock = products.filter(
      (product) => product.stockQuantity <= 0,
    ).length;

    return {
      total: products.length,
      lowStock,
      outOfStock,
      alerts: lowStock + outOfStock,
    };
  }, [products]);

  const visibleProducts = useMemo(() => {
    if (filter === "ALL") {
      return products;
    }

    if (filter === "LOW_STOCK") {
      return products.filter((product) => product.isLowStock);
    }

    return products.filter((product) => product.category === filter);
  }, [filter, products]);

  async function handleCreateProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tenantId) {
      setFormError("Tenant indisponível. Recarregue o painel e tente novamente.");
      return;
    }

    if (!form.name.trim()) {
      setFormError("Informe o nome do produto.");
      return;
    }

    const stockQuantity = Number(form.stockQuantity.replace(",", "."));
    const minStockAlert = Number(form.minStockAlert.replace(",", "."));
    const unitCost = Number(form.unitCost.replace(",", "."));
    const salePrice = form.salePrice
      ? Number(form.salePrice.replace(",", "."))
      : null;

    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      setFormError("Informe uma quantidade inicial válida.");
      return;
    }

    if (!Number.isFinite(minStockAlert) || minStockAlert < 0) {
      setFormError("Informe o alerta mínimo de estoque.");
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setFormError("Informe o custo unitário.");
      return;
    }

    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0)) {
      setFormError("Informe um preço de venda válido.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      await api.createProduct({
        tenantId,
        name: form.name.trim(),
        category: form.category,
        stockQuantity,
        minStockAlert,
        unitCost,
        salePrice: form.category === "REVENDA" ? salePrice : null,
      });

      setModalOpen(false);
      setForm(INITIAL_FORM);
      await loadInventory();
    } catch (requestError) {
      setFormError(getErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdjustStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stockAction) {
      return;
    }

    const quantity = Number(stockAction.quantity.replace(",", "."));

    if (!Number.isFinite(quantity) || quantity < 0) {
      setStockError("Informe uma quantidade válida.");
      return;
    }

    if (stockAction.type !== "ADJUSTMENT" && quantity <= 0) {
      setStockError("Informe uma quantidade maior que zero.");
      return;
    }

    setStockSubmitting(true);
    setStockError(null);

    try {
      await api.adjustStock(stockAction.product.id, {
        type: stockAction.type,
        quantity,
        reason: stockAction.reason.trim() || undefined,
      });

      setStockAction(null);
      await loadInventory();
    } catch (requestError) {
      setStockError(getErrorMessage(requestError));
    } finally {
      setStockSubmitting(false);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col px-4 pb-4 pt-6 sm:px-6 lg:px-10 xl:px-12">
      <header className="mb-4 flex flex-col gap-4 lg:mb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <TenantBadge />
          <p className="mt-3 text-sm text-zinc-400">
            Insumos e revenda · {tenant.name}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError(null);
            setForm(INITIAL_FORM);
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-[color-mix(in_srgb,var(--accent)_20%,transparent)]"
        >
          <Plus className="size-4" />
          Adicionar produto
        </button>
      </header>

      <AdminNav className="mb-4 lg:hidden" />

      {tenantLoading || (loading && products.length === 0 && !error) ? (
        <LoadingState message="Carregando estoque..." />
      ) : !tenantId ? (
        <p className="rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-6 text-center text-sm text-zinc-400">
          Não foi possível identificar o estabelecimento. Recarregue o painel
          para carregar o estoque.
        </p>
      ) : error && products.length === 0 ? (
        <ErrorState message={error} onRetry={() => void loadInventory()} />
      ) : (
        <>
          {error ? (
            <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
              <button
                type="button"
                onClick={() => void loadInventory()}
                className="ml-2 underline"
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          <section className="grid gap-3 md:grid-cols-3">
            <SummaryCard
              label="Itens cadastrados"
              value={String(stats.total)}
              hint="Produtos de uso interno e revenda"
              icon={Package}
            />
            <SummaryCard
              label="Estoque baixo"
              value={String(stats.lowStock)}
              hint="Abaixo do alerta mínimo"
              icon={AlertTriangle}
              emphasis={stats.lowStock > 0 ? "warning" : undefined}
            />
            <SummaryCard
              label="Esgotados"
              value={String(stats.outOfStock)}
              hint="Quantidade zerada"
              icon={PackageMinus}
              emphasis={stats.outOfStock > 0 ? "negative" : undefined}
            />
          </section>

          <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Package className="size-4 text-[var(--accent)]" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Produtos em estoque
                </h2>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {(
                  [
                    { id: "ALL", label: "Todos" },
                    { id: "USO_INTERNO", label: "Uso interno" },
                    { id: "REVENDA", label: "Revenda" },
                    { id: "LOW_STOCK", label: "Alertas" },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                      filter === item.id
                        ? "bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)] ring-1 ring-[color-mix(in_srgb,var(--accent)_25%,transparent)]"
                        : "bg-zinc-950 text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200",
                    )}
                  >
                    {item.label}
                    {item.id === "LOW_STOCK" && stats.alerts > 0
                      ? ` (${stats.alerts})`
                      : ""}
                  </button>
                ))}
              </div>
            </div>

            {visibleProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
                Nenhum produto encontrado neste filtro.
              </p>
            ) : (
              <>
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                        <th className="pb-3 pr-4 font-medium">Produto</th>
                        <th className="pb-3 pr-4 font-medium">Categoria</th>
                        <th className="pb-3 pr-4 font-medium">Estoque</th>
                        <th className="pb-3 pr-4 font-medium">Alerta mín.</th>
                        <th className="pb-3 pr-4 font-medium">Custo unit.</th>
                        <th className="pb-3 pr-4 font-medium">Status</th>
                        <th className="pb-3 font-medium">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProducts.map((product) => (
                        <tr
                          key={product.id}
                          className="border-b border-zinc-800/80 last:border-0"
                        >
                          <td className="py-3 pr-4 font-medium text-zinc-100">
                            {product.name}
                          </td>
                          <td className="py-3 pr-4 text-zinc-400">
                            {CATEGORY_LABELS[product.category]}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-zinc-100">
                            {formatQty(product.stockQuantity)}
                          </td>
                          <td className="py-3 pr-4 text-zinc-400">
                            {formatQty(product.minStockAlert)}
                          </td>
                          <td className="py-3 pr-4 text-zinc-100">
                            {formatCurrency(product.unitCost)}
                          </td>
                          <td className="py-3 pr-4">
                            <StockBadge product={product} />
                          </td>
                          <td className="py-3">
                            <StockActions
                              product={product}
                              onAction={(type) =>
                                setStockAction({
                                  product,
                                  type,
                                  quantity: type === "ADJUSTMENT"
                                    ? String(product.stockQuantity)
                                    : "1",
                                  reason: "",
                                })
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-3 md:hidden">
                  {visibleProducts.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-zinc-100">
                            {product.name}
                          </p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {CATEGORY_LABELS[product.category]} · mín.{" "}
                            {formatQty(product.minStockAlert)}
                          </p>
                        </div>
                        <StockBadge product={product} />
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[var(--accent)]">
                            {formatQty(product.stockQuantity)} un.
                          </p>
                          <p className="text-xs text-zinc-500">
                            {formatCurrency(product.unitCost)}
                          </p>
                        </div>
                        <StockActions
                          product={product}
                          onAction={(type) =>
                            setStockAction({
                              product,
                              type,
                              quantity: type === "ADJUSTMENT"
                                ? String(product.stockQuantity)
                                : "1",
                              reason: "",
                            })
                          }
                        />
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>
        </>
      )}

      {modalOpen ? (
        <ProductModal
          form={form}
          submitting={submitting}
          error={formError}
          onClose={() => setModalOpen(false)}
          onChange={setForm}
          onSubmit={handleCreateProduct}
        />
      ) : null}

      {stockAction ? (
        <StockModal
          action={stockAction}
          submitting={stockSubmitting}
          error={stockError}
          onClose={() => {
            setStockAction(null);
            setStockError(null);
          }}
          onChange={setStockAction}
          onSubmit={handleAdjustStock}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  emphasis,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Package;
  emphasis?: "warning" | "negative";
}) {
  return (
    <article
      className={cn(
        "rounded-2xl border bg-zinc-900/80 p-4",
        emphasis === "warning" && "border-amber-500/20 bg-amber-500/5",
        emphasis === "negative" && "border-rose-500/20 bg-rose-500/5",
        !emphasis && "border-zinc-800",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold",
              emphasis === "warning" && "text-amber-300",
              emphasis === "negative" && "text-rose-300",
              !emphasis && "text-zinc-50",
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-zinc-400">{hint}</p>
        </div>
        <AccentIconWrap className="size-11">
          <Icon className="size-5" strokeWidth={2.2} />
        </AccentIconWrap>
      </div>
    </article>
  );
}

function StockBadge({ product }: { product: ApiProduct }) {
  if (product.stockQuantity <= 0) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-300 ring-1 ring-rose-500/20">
        <PackageMinus className="size-3" />
        Esgotado
      </span>
    );
  }

  if (product.isLowStock) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300 ring-1 ring-amber-500/20">
        <TriangleAlert className="size-3" />
        Baixo
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-300 ring-1 ring-emerald-500/20">
      Em dia
    </span>
  );
}

function StockActions({
  product,
  onAction,
}: {
  product: ApiProduct;
  onAction: (type: AdjustStockPayload["type"]) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onAction("IN")}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700"
        aria-label={`Entrada em ${product.name}`}
      >
        <PackagePlus className="size-3.5 text-[var(--accent)]" />
        Entrada
      </button>
      <button
        type="button"
        onClick={() => onAction("ADJUSTMENT")}
        className="inline-flex items-center gap-1 rounded-lg border border-zinc-800 px-2 py-1.5 text-xs font-medium text-zinc-200 transition hover:border-zinc-700"
        aria-label={`Ajustar ${product.name}`}
      >
        <SlidersHorizontal className="size-3.5 text-zinc-400" />
        Ajuste
      </button>
    </div>
  );
}

function ProductModal({
  form,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  form: ProductFormState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<ProductFormState>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-50">
            Adicionar novo produto
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome">
            <input
              required
              value={form.name}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Ex: Pomada modeladora"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[color-mix(in_srgb,var(--accent)_40%,transparent)]"
            />
          </Field>

          <Field label="Categoria">
            <select
              value={form.category}
              onChange={(event) =>
                onChange((current) => ({
                  ...current,
                  category: event.target.value as ApiProductCategory,
                }))
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            >
              <option value="USO_INTERNO">Uso interno</option>
              <option value="REVENDA">Revenda</option>
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Quantidade inicial">
              <input
                required
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={form.stockQuantity}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    stockQuantity: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              />
            </Field>

            <Field label="Alerta mínimo">
              <input
                required
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={form.minStockAlert}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    minStockAlert: event.target.value,
                  }))
                }
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Custo unitário (R$)">
              <input
                required
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.unitCost}
                onChange={(event) =>
                  onChange((current) => ({
                    ...current,
                    unitCost: event.target.value,
                  }))
                }
                placeholder="0,00"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
              />
            </Field>

            {form.category === "REVENDA" ? (
              <Field label="Preço de venda (R$)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.salePrice}
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      salePrice: event.target.value,
                    }))
                  }
                  placeholder="Opcional"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                />
              </Field>
            ) : (
              <div className="hidden sm:block" />
            )}
          </div>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? "Salvando..." : "Cadastrar produto"}
          </button>
        </form>
      </div>
    </div>
  );
}

function StockModal({
  action,
  submitting,
  error,
  onClose,
  onChange,
  onSubmit,
}: {
  action: StockActionState;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<StockActionState | null>>;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  const titles: Record<AdjustStockPayload["type"], string> = {
    IN: "Entrada de estoque",
    OUT: "Saída de estoque",
    ADJUSTMENT: "Ajuste de quantidade",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 p-4 md:items-center">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-50">
              {titles[action.type]}
            </h2>
            <p className="mt-1 text-xs text-zinc-500">{action.product.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 p-2 text-zinc-400"
            aria-label="Fechar"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <p className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300">
            Estoque atual:{" "}
            <span className="font-semibold text-zinc-50">
              {formatQty(action.product.stockQuantity)}
            </span>
          </p>

          <Field
            label={
              action.type === "ADJUSTMENT"
                ? "Nova quantidade"
                : "Quantidade da entrada"
            }
          >
            <input
              required
              type="number"
              min={action.type === "ADJUSTMENT" ? "0" : "0.001"}
              step="0.001"
              inputMode="decimal"
              value={action.quantity}
              onChange={(event) =>
                onChange((current) =>
                  current
                    ? { ...current, quantity: event.target.value }
                    : current,
                )
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </Field>

          <Field label="Motivo (opcional)">
            <input
              value={action.reason}
              onChange={(event) =>
                onChange((current) =>
                  current
                    ? { ...current, reason: event.target.value }
                    : current,
                )
              }
              placeholder="Ex: Compra do fornecedor"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
            />
          </Field>

          {error ? (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] px-4 py-3 text-sm font-semibold text-zinc-950 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="size-4" />
            )}
            {submitting ? "Salvando..." : "Confirmar movimentação"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function formatQty(value: number) {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 3,
  });
}
