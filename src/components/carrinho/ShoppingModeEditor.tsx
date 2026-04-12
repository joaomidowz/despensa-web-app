import { ReactNode } from "react";
import { ShoppingListItemResponse } from "../../lib/api/contracts";
import { formatCurrency } from "../../lib/utils/formatters";
import { DraftState, formatCurrencyInput, formatQuantityInput, getEstimatedLineTotal } from "./types";

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
  pendingItemIds,
  onDeleteItem,
  onToggleChecked,
  onUpdateDraft,
}: {
  items: ShoppingListItemResponse[];
  showPriceField: boolean;
  pendingItemIds: string[];
  onDeleteItem: (id: string) => void;
  onToggleChecked: (id: string) => void;
  onUpdateDraft: (id: string, patch: Partial<DraftState>) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 md:hidden">
        {items.map((item) => {
          const total = getEstimatedLineTotal(item);
          const isBusy = pendingItemIds.includes(item.shopping_list_item_id);

          return (
            <div key={item.shopping_list_item_id} className="relative overflow-hidden rounded-[22px] bg-white px-5 py-4 shadow-sm">
              <label className="absolute left-5 top-4">
                <input
                  checked={item.checked}
                  className="peer sr-only"
                  type="checkbox"
                  onChange={() => onToggleChecked(item.shopping_list_item_id)}
                />
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-border/35 bg-secondary text-transparent transition peer-checked:border-primary peer-checked:bg-primary peer-checked:text-white">
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                    check
                  </span>
                </span>
              </label>

              <div className="flex items-start justify-between gap-3 pl-11">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    Item
                  </p>
                  <p className="mt-1 truncate text-lg font-bold text-ink">{item.name}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="rounded-full bg-secondary px-3 py-1 text-[11px] font-semibold text-tertiary">
                    {sourceLabelMap[item.source]}
                  </span>
                  <span className="text-[11px] font-semibold text-muted">
                    {item.checked ? "Marcado" : "Pendente"}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-2 rounded-2xl bg-secondary/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                <DetailRow label="Categoria">
                  <input
                    className="input-shell min-h-10 w-full rounded-xl px-3 py-2 text-xs"
                    placeholder="Categoria"
                    value={item.category ?? ""}
                    onChange={(event) =>
                      onUpdateDraft(item.shopping_list_item_id, { category: event.target.value })
                    }
                  />
                </DetailRow>
                <DetailRow label="Observacao">
                  <input
                    className="input-shell min-h-10 w-full rounded-xl px-3 py-2 text-xs"
                    placeholder="Marca, sabor, tamanho"
                    value={item.notes ?? ""}
                    onChange={(event) =>
                      onUpdateDraft(item.shopping_list_item_id, { notes: event.target.value })
                    }
                  />
                </DetailRow>
                <DetailRow label="Quantidade">
                  <input
                    className="input-shell min-h-10 w-full rounded-xl px-3 py-2 text-right text-xs"
                    inputMode="decimal"
                    placeholder="1"
                    value={formatQuantityInput(item.desired_qty)}
                    onChange={(event) =>
                      onUpdateDraft(item.shopping_list_item_id, { desiredQty: event.target.value })
                    }
                  />
                </DetailRow>
                {showPriceField ? (
                  <DetailRow label="Valor">
                    <input
                      className="input-shell min-h-10 w-full rounded-xl px-3 py-2 text-right text-xs"
                      inputMode="decimal"
                      placeholder="0"
                      value={formatCurrencyInput(item.estimated_unit_price)}
                      onChange={(event) =>
                        onUpdateDraft(item.shopping_list_item_id, {
                          estimatedUnitPrice: event.target.value.replace(/[^0-9,.-]/g, ""),
                        })
                      }
                    />
                  </DetailRow>
                ) : null}
                <DetailRow label="Total">
                  <p className="text-sm font-semibold text-ink">
                    {total === null ? "--" : formatCurrency(total)}
                  </p>
                </DetailRow>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted" />
                <button
                  className="text-sm font-semibold text-tertiary transition hover:text-red-600 disabled:opacity-50"
                  disabled={isBusy}
                  type="button"
                  onClick={() => onDeleteItem(item.shopping_list_item_id)}
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-[28px] bg-secondary/50 md:block">
        <table className="min-w-[980px] w-full text-sm">
          <thead>
            <tr className="border-b border-border/10 text-left text-xs uppercase tracking-[0.12em] text-muted">
              <th className="px-4 py-3">Ok</th>
              <th className="px-4 py-3">Produto</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Qtd</th>
              <th className="px-4 py-3">Observacoes</th>
              {showPriceField ? <th className="px-4 py-3">Valor</th> : null}
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-right">Acao</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const total = getEstimatedLineTotal(item);
              const isBusy = pendingItemIds.includes(item.shopping_list_item_id);
              return (
                <tr key={item.shopping_list_item_id} className="border-b border-border/10 align-top">
                  <td className="px-4 py-3">
                    <input
                      checked={item.checked}
                      className="mt-2 h-4 w-4 rounded border-border/30 accent-primary"
                      type="checkbox"
                      onChange={() => onToggleChecked(item.shopping_list_item_id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input-shell min-w-[12rem]"
                      value={item.name}
                      onChange={(event) =>
                        onUpdateDraft(item.shopping_list_item_id, { name: event.target.value })
                      }
                    />
                    <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {sourceLabelMap[item.source]}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input-shell min-w-[10rem]"
                      value={item.category ?? ""}
                      onChange={(event) =>
                        onUpdateDraft(item.shopping_list_item_id, { category: event.target.value })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input-shell w-24"
                      inputMode="decimal"
                      placeholder="1"
                      value={formatQuantityInput(item.desired_qty)}
                      onChange={(event) =>
                        onUpdateDraft(item.shopping_list_item_id, { desiredQty: event.target.value })
                      }
                    />
                  </td>
                  <td className="px-4 py-3">
                    <input
                      className="input-shell min-w-[16rem]"
                      placeholder="Marca, sabor, tamanho"
                      value={item.notes ?? ""}
                      onChange={(event) =>
                        onUpdateDraft(item.shopping_list_item_id, { notes: event.target.value })
                      }
                    />
                  </td>
                  {showPriceField ? (
                    <td className="px-4 py-3">
                      <input
                        className="input-shell w-28"
                        inputMode="decimal"
                        placeholder="0"
                        value={formatCurrencyInput(item.estimated_unit_price)}
                        onChange={(event) =>
                          onUpdateDraft(item.shopping_list_item_id, {
                            estimatedUnitPrice: event.target.value.replace(/[^0-9,.-]/g, ""),
                          })
                        }
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-semibold text-ink">
                    {total === null ? "--" : formatCurrency(total)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      className="text-xs font-semibold text-muted transition hover:text-red-600 disabled:opacity-50"
                      disabled={isBusy}
                      type="button"
                      onClick={() => onDeleteItem(item.shopping_list_item_id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-2 px-2 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
