import { useState } from "react";
import { ShoppingListItemResponse } from "../../lib/api/contracts";
import { formatCurrency, formatQuantity } from "../../lib/utils/formatters";
import { getEstimatedLineTotal } from "./types";

const sourceLabelMap: Record<ShoppingListItemResponse["source"], string> = {
  MANUAL: "Manual",
  INVENTORY: "Recomendado",
  SYSTEM: "Sistema",
  HISTORY: "Historico",
  TEMPLATE: "Template",
};

export function ShoppingModeEditor({
  items,
  onToggleChecked,
}: {
  items: ShoppingListItemResponse[];
  showPriceField: boolean;
  pendingItemIds: string[];
  onDeleteItem: (id: string) => void;
  onToggleChecked: (id: string) => void;
  onUpdateDraft: (id: string, patch: object) => void;
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
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
                  <p className="text-sm text-muted">
                    {item.category ?? "Sem categoria"} · {formatQuantity(item.desired_qty)}
                    {total !== null ? ` · ${formatCurrency(total)}` : ""}
                  </p>

                  {item.estimated_unit_price ? (
                    <p className="mt-1 text-sm text-muted">
                      Preco unitario {formatCurrency(Number(item.estimated_unit_price))}
                    </p>
                  ) : null}

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
