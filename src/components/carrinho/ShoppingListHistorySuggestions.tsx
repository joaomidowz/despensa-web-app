import { ShoppingListCatalogItemResponse } from "../../lib/api/contracts";
import { formatCurrency, formatDateTime } from "../../lib/utils/formatters";
import { toNumber } from "./types";

function getHistoryItemName(item: ShoppingListCatalogItemResponse) {
  return item.name || item.canonical_name || "Item sem nome";
}

function getHistoryItemDate(value: string | null | undefined) {
  if (!value) return "sem data";

  try {
    return formatDateTime(value);
  } catch {
    return "sem data";
  }
}

export function ShoppingListHistorySuggestions({
  selectedItem,
  suggestions,
  onSelect,
}: {
  selectedItem: ShoppingListCatalogItemResponse | null;
  suggestions: ShoppingListCatalogItemResponse[];
  onSelect: (item: ShoppingListCatalogItemResponse) => void;
}) {
  if (selectedItem) {
    return (
      <div className="mt-2 flex flex-wrap items-center gap-2 px-1 text-xs text-muted">
        <span className="rounded-full bg-tertiary/10 px-2.5 py-1 font-semibold text-tertiary">
          preenchido pelo historico
        </span>
        {selectedItem.last_unit_price ? (
          <span>{formatCurrency(toNumber(selectedItem.last_unit_price))}</span>
        ) : null}
      </div>
    );
  }

  if (!suggestions.length) return null;

  return (
    <div className="mt-2 grid gap-2 rounded-2xl border border-border/10 bg-white p-2 shadow-sm">
      {suggestions.map((item) => (
        <button
          key={`${item.canonical_name || item.name}-${item.last_purchased_at}`}
          className="grid min-h-14 gap-1 rounded-xl px-3 py-2 text-left transition hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/30"
          type="button"
          onClick={() => onSelect(item)}
        >
          <span className="truncate text-sm font-semibold text-ink">{getHistoryItemName(item)}</span>
          <span className="truncate text-xs text-muted">
            {item.category ?? "Sem categoria"} -{" "}
            {item.last_unit_price ? formatCurrency(toNumber(item.last_unit_price)) : "sem preco"} -{" "}
            {getHistoryItemDate(item.last_purchased_at)}
          </span>
        </button>
      ))}
    </div>
  );
}
