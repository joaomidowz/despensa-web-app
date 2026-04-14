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
  onToggleChecked,
  onUpdateDraft,
}: {
  items: ShoppingListItemResponse[];
  showPriceField: boolean;
  onToggleChecked: (id: string) => void;
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
    onUpdateDraft(id, { desiredQty: value });
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

          return (
            <div
              key={item.shopping_list_item_id}
              className="rounded-[22px] bg-white px-5 py-4 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                <label className="mt-1 cursor-pointer">
                  <input
                    checked={item.checked}
                    className="peer sr-only"
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
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
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
              </div>

              {isExpanded ? (
                <div className="ml-11 mt-3 rounded-2xl bg-secondary/45 px-4 py-3">
                  <p className="text-sm text-muted">{item.category ?? "Sem categoria"}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        Quantidade
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/25 bg-white text-tertiary transition hover:border-primary/30 hover:text-primary"
                          type="button"
                          onClick={() => stepQuantity(item.shopping_list_item_id, item.desired_qty, -1)}
                        >
                          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            remove
                          </span>
                        </button>
                        <input
                          className="input-shell min-h-10 flex-1 rounded-xl px-3 py-2 text-right"
                          inputMode="decimal"
                          placeholder="1"
                          type="number"
                          min="0"
                          step="1"
                          value={formatQuantityInput(item.desired_qty)}
                          onChange={(event) => updateQuantity(item.shopping_list_item_id, event.target.value)}
                        />
                        <button
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-border/25 bg-white text-tertiary transition hover:border-primary/30 hover:text-primary"
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
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Preco unitario estimado
                        </p>
                        <input
                          className="input-shell mt-2 min-h-10 w-full rounded-xl px-3 py-2 text-right"
                          inputMode="decimal"
                          placeholder="0,00"
                          value={formatCurrencyInput(item.estimated_unit_price)}
                          onChange={(event) => updatePrice(item.shopping_list_item_id, event.target.value)}
                        />
                      </div>
                    ) : null}
                  </div>

                  <p className="mt-3 text-sm font-semibold text-ink">
                    Total previsto {total === null ? "--" : formatCurrency(total)}
                  </p>
                  {item.notes ? <p className="mt-1 text-sm text-muted">{item.notes}</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
