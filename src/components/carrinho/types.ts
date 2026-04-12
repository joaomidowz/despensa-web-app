import { ShoppingListItemResponse } from "../../lib/api/contracts";

export type DraftState = {
  name: string;
  category: string;
  notes: string;
  desiredQty: string;
  estimatedUnitPrice: string;
};

export type ManualCheckoutItem = {
  shopping_list_item_id: string;
  product_name: string;
  quantity: string;
  unit_price: string;
};

export type ParsedShoppingListItem = {
  name: string;
  desired_qty: number;
  notes: string | null;
};

export function toNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (value === null || value === undefined) return Number.NaN;
  return Number(String(value).replace(",", "."));
}

export function formatQuantity(value: number | string) {
  return String(value).replace(/\.0+$/, "");
}

export function formatQuantityInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const normalized = String(value).replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return String(value);
  return normalized.replace(/(\.\d*?[1-9])0+$|\.0+$/, "$1");
}

export function formatCurrencyInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string") return value.replace(".", ",");
  const parsed = toNumber(value);
  if (Number.isNaN(parsed)) return "";
  return parsed.toFixed(2).replace(".", ",");
}

export function getEstimatedLineTotal(item: {
  desired_qty: number | string;
  estimated_unit_price?: number | string | null;
}) {
  const quantity = toNumber(item.desired_qty);
  const price = toNumber(item.estimated_unit_price ?? null);
  if (Number.isNaN(quantity) || Number.isNaN(price)) return null;
  return quantity * price;
}

export function buildDraftFromItem(item: ShoppingListItemResponse): DraftState {
  return {
    name: item.name,
    category: item.category ?? "",
    notes: item.notes ?? "",
    desiredQty: formatQuantityInput(item.desired_qty),
    estimatedUnitPrice: formatCurrencyInput(item.estimated_unit_price),
  };
}

function normalizeImportedLine(line: string) {
  return line
    .replace(/^[-*•\u2022]+\s*/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractDesiredQuantity(rawLine: string) {
  const line = rawLine.trim();
  const patterns = [
    /^(?<qty>\d+(?:[.,]\d+)?)\s*x\s+(?<name>.+)$/i,
    /^(?<name>.+?)\s+(?<qty>\d+(?:[.,]\d+)?)x$/i,
    /^(?<name>.+?)\s+x(?<qty>\d+(?:[.,]\d+)?)$/i,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.groups) continue;
    const quantity = toNumber(match.groups.qty);
    if (Number.isNaN(quantity) || quantity <= 0) continue;
    return {
      desired_qty: quantity,
      name: normalizeImportedLine(match.groups.name),
    };
  }

  return {
    desired_qty: 1,
    name: normalizeImportedLine(line),
  };
}

export function parsePastedShoppingList(input: string): ParsedShoppingListItem[] {
  const lines = input
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed: ParsedShoppingListItem[] = [];

  for (const rawLine of lines) {
    if (rawLine.endsWith(":")) {
      continue;
    }

    const extracted = extractDesiredQuantity(rawLine);
    if (!extracted.name) continue;

    parsed.push({
      name: extracted.name,
      desired_qty: extracted.desired_qty,
      notes: null,
    });
  }

  return parsed;
}
