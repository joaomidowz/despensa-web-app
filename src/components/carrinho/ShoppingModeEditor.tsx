import { useState } from "react";
import { ShoppingListItemResponse } from "../../lib/api/contracts";
import { formatCurrency } from "../../lib/utils/formatters";
import {
  formatCurrencyInput,
  formatQuantityInput,
  getEstimatedLineTotal,
  toNumber,
} from "./types";

const sourceLabelMap: Record<ShoppingListItemResponse["source"], string> = {
  MANUAL: "Manual",
  INVENTORY: "Recomendado",
  SYSTEM: "Sistema",
  HISTORY: "Historico",
  TEMPLATE: "Template",
};

export function ShoppingModeEditor({
  items,
  showPriceField,
  pendingItemIds = [],
  onToggleChecked,
  onRequestDelete,
  onUpdateDraft,
}: {
  items: ShoppingListItemResponse[];
  showPriceField: boolean;
  pendingItemIds?: string[];
  onToggleChecked: (id: string) => void;
  onRequestDelete: (item: ShoppingListItemResponse) => void;
  onUpdateDraft: (id: string, patch: {
    desiredQty?: string;
    estimatedUnitPrice?: string;
  }) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function updateQuantity(id: string, value: string) {
    if (value === "" || /^[0-9]*([.,][0-9]*)?$/.test(value)) {
      onUpdateDraft(id, { desiredQty: value });
    }
  }

  function updatePrice(id: string, value: string) {
    onUpdateDraft(id, { estimatedUnitPrice: value.replace(/[^0-9,.-]/g, "") });
  }

  function stepQuantity(id: string, currentValue: number | string, delta: number) {
    const next = Math.max(0, (Number.isNaN(toNumber(currentValue)) ? 0 : toNumber(currentValue)) + delta);
    onUpdateDraft(id, { desiredQty: String(next).replace(/\.0+$/, "") });
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3">
        {items.map((item) => {
          const total = getEstimatedLineTotal(item);
          const isExpanded = expandedIds.includes(item.shopping_list_item_id);
          const isPending = pendingItemIds.includes(item.shopping_list_item_id);

          return (
            <div
              key={item.shopping_list_item_id}
              className="rounded-[22px] bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
            >
              <div className="grid grid-cols-[1.75rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3">
                <label className="mt-1 cursor-pointer">
                  <input
                    checked={item.checked}
                    className="peer sr-only"
                    disabled={isPending}
                    type="checkbox"
                    onChange={() => onToggleChecked(item.shopping_list_item_id)}
                  />

                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-border/35 bg-secondary text-transparent transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                      check
                    </span>
                  </span>
                </label>

                <button
                  aria-expanded={isExpanded}
                  className="flex min-w-0 items-start justify-between gap-3 text-left"
                  type="button"
                  onClick={() => toggleExpanded(item.shopping_list_item_id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-bold text-ink">{item.name}</p>
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-tertiary">
                        {sourceLabelMap[item.source]}
                      </span>
                    </div>
                  </div>
                  <span
                    className={[
                      "material-symbols-outlined mt-0.5 text-muted transition-transform duration-200",
                      isExpanded ? "rotate-180" : "",
                    ].join(" ")}
                    aria-hidden="true"
                  >
                    expand_more
                  </span>
                </button>

                {isExpanded ? (
                <div className="col-span-2 space-y-4 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <p className="text-sm text-muted">{item.category ?? "Sem categoria"}</p>
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {total === null ? "--" : formatCurrency(total)}
                    </p>
                  </div>

                  <div
                    className={[
                      "grid items-end gap-3",
                      showPriceField
                        ? "grid-cols-[minmax(0,0.38fr)_minmax(0,0.62fr)]"
                        : "grid-cols-1",
                    ].join(" ")}
                  >
                    <div className="min-w-0">
                      <label className="mb-1 block text-xs font-medium text-muted">
                        Quantidade
                      </label>
                      <div className="grid min-w-0 grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-1.5">
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/20 bg-white text-tertiary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isPending}
                          type="button"
                          onClick={() => stepQuantity(item.shopping_list_item_id, item.desired_qty, -1)}
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            remove
                          </span>
                        </button>
                        <input
                          className="h-8 min-w-0 w-full appearance-none rounded-xl border border-border/20 bg-white px-0 py-2 text-center text-sm font-semibold outline-none transition focus:ring-4 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          disabled={isPending}
                          inputMode="decimal"
                          placeholder="1"
                          type="text"
                          style={{
                            color: "var(--foreground)",
                            backgroundColor: "var(--white)",
                            borderColor: "color-mix(in srgb, var(--gray-border) 20%, white)",
                          }}
                          value={formatQuantityInput(item.desired_qty)}
                          onChange={(event) => updateQuantity(item.shopping_list_item_id, event.target.value)}
                        />
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-full border border-border/20 bg-white text-tertiary transition hover:border-primary/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={isPending}
                          type="button"
                          onClick={() => stepQuantity(item.shopping_list_item_id, item.desired_qty, 1)}
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            add
                          </span>
                        </button>
                      </div>
                    </div>

                    {showPriceField ? (
                      <div className="min-w-0">
                        <label className="mb-1 block text-xs font-medium text-muted">
                          Preco Unit.
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
                            R$
                          </span>
                          <input
                            className="h-8 min-w-0 w-full rounded-xl border border-border/20 bg-white pl-8 pr-3 text-right text-sm font-semibold outline-none transition focus:ring-4"
                            disabled={isPending}
                            inputMode="decimal"
                            placeholder="0,00"
                            style={{
                              color: "var(--foreground)",
                              backgroundColor: "var(--white)",
                              borderColor: "color-mix(in srgb, var(--gray-border) 20%, white)",
                            }}
                            value={formatCurrencyInput(item.estimated_unit_price)}
                            onChange={(event) => updatePrice(item.shopping_list_item_id, event.target.value)}
                          />
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-1">
                    <button
                      aria-label={`Remover ${item.name} da lista`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/15 bg-secondary/70 px-4 py-2 text-sm font-semibold text-tertiary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isPending}
                      type="button"
                      onClick={() => onRequestDelete(item)}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        delete
                      </span>
                      <span>Apagar</span>
                    </button>
                  </div>

                  {item.notes ? <p className="mt-3 text-sm text-muted">{item.notes}</p> : null}
                </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
