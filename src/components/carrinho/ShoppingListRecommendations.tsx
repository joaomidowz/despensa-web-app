import type { ShoppingListCatalogItemResponse } from "../../lib/api/contracts";
import type { PurchaseRecommendation } from "../../lib/shopping-list/purchaseRecommendations";
import { formatCurrency, formatDateTime } from "../../lib/utils/formatters";
import { Button } from "../ui/Button";
import { toNumber } from "./types";

function getRecommendationName(item: ShoppingListCatalogItemResponse) {
  return item.name || item.canonical_name || "Item sem nome";
}

function getLastPurchaseLabel(item: ShoppingListCatalogItemResponse) {
  if (!item.last_purchased_at) return "sem data";

  try {
    return formatDateTime(item.last_purchased_at);
  } catch {
    return "sem data";
  }
}

function getPriceLabel(item: ShoppingListCatalogItemResponse) {
  return item.last_unit_price ? formatCurrency(toNumber(item.last_unit_price)) : "sem preco";
}

function getPriorityLabel(score: number) {
  if (score >= 60) return "Alta";
  if (score >= 35) return "Media";
  return "Baixa";
}

export function ShoppingListRecommendations({
  isAdding,
  isLoading,
  recommendations,
  onAdd,
  onDismiss,
  onSnooze,
}: {
  isAdding: boolean;
  isLoading: boolean;
  recommendations: PurchaseRecommendation[];
  onAdd: (item: ShoppingListCatalogItemResponse) => void;
  onDismiss: (item: ShoppingListCatalogItemResponse) => void;
  onSnooze: (item: ShoppingListCatalogItemResponse) => void;
}) {
  if (isLoading) {
    return (
      <div className="rounded-lg bg-secondary/70 px-4 py-5 text-sm text-muted">
        Carregando recomendacoes...
      </div>
    );
  }

  if (!recommendations.length) {
    return (
      <div className="rounded-lg bg-secondary/70 px-4 py-5 text-sm text-muted">
        Nenhuma recomendacao contextual agora.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {recommendations.map((recommendation) => (
        <article
          key={recommendation.key}
          className="grid min-h-52 gap-4 rounded-lg bg-secondary/70 p-4"
        >
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="truncate text-base font-bold text-ink">
                  {getRecommendationName(recommendation.item)}
                </h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-tertiary">
                  {recommendation.item.category ?? "Sem categoria"}
                </p>
              </div>
              <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-muted">
                {getPriorityLabel(recommendation.score)}
              </span>
            </div>

            <p className="mt-3 text-sm text-muted">
              Ultimo preco {getPriceLabel(recommendation.item)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Ultima compra {getLastPurchaseLabel(recommendation.item)}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {recommendation.reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-muted"
                >
                  {reason}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-2 self-end">
            <Button
              isFullWidth
              isLoading={isAdding}
              size="sm"
              variant="outline"
              onClick={() => onAdd(recommendation.item)}
            >
              Adicionar
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="ghost" onClick={() => onSnooze(recommendation.item)}>
                Depois
              </Button>
              <Button
                className="text-red-600 hover:bg-red-50"
                size="sm"
                variant="ghost"
                onClick={() => onDismiss(recommendation.item)}
              >
                Ocultar
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
