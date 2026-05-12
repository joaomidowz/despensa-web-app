import { ShoppingListCatalogItemResponse } from "../api/contracts";

function normalizeHistoryTerm(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreHistoryItem(item: ShoppingListCatalogItemResponse, query: string) {
  const normalizedName = normalizeHistoryTerm(item.name);
  const normalizedCanonicalName = normalizeHistoryTerm(item.canonical_name);
  const searchableName = normalizedName || normalizedCanonicalName;

  if (!query || query.length < 2) return 0;
  if (normalizedName === query || normalizedCanonicalName === query) return 100;
  if (normalizedName.startsWith(query) || normalizedCanonicalName.startsWith(query)) return 90;
  if (normalizedName.includes(query) || normalizedCanonicalName.includes(query)) return 75;

  const queryTokens = query.split(" ").filter((token) => token.length >= 2);
  const nameTokens = new Set(searchableName.split(" ").filter((token) => token.length >= 2));
  if (queryTokens.length && queryTokens.every((token) => nameTokens.has(token))) return 60;

  return 0;
}

export function buildShoppingHistoryIndex(items: ShoppingListCatalogItemResponse[]) {
  const index = new Map<string, ShoppingListCatalogItemResponse>();

  for (const item of items) {
    const key = normalizeHistoryTerm(item.canonical_name) || normalizeHistoryTerm(item.name);
    if (!key) continue;

    const existing = index.get(key);
    if (!existing || Date.parse(item.last_purchased_at) > Date.parse(existing.last_purchased_at)) {
      index.set(key, item);
    }
  }

  return Array.from(index.values());
}

export function findShoppingHistorySuggestions(
  indexedItems: ShoppingListCatalogItemResponse[],
  query: string,
  limit = 4,
) {
  const normalizedQuery = normalizeHistoryTerm(query);
  if (normalizedQuery.length < 2) return [];

  return indexedItems
    .map((item) => ({
      item,
      score: scoreHistoryItem(item, normalizedQuery),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (right.item.purchase_count !== left.item.purchase_count) {
        return right.item.purchase_count - left.item.purchase_count;
      }
      return Date.parse(right.item.last_purchased_at) - Date.parse(left.item.last_purchased_at);
    })
    .slice(0, limit)
    .map((entry) => entry.item);
}
