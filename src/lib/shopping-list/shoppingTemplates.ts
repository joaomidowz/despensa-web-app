import type { ShoppingListItemResponse } from "../api/contracts";

export type ShoppingTemplateItem = {
  name: string;
  category?: string | null;
  notes?: string | null;
  desired_qty: number;
  estimated_unit_price?: number | null;
};

export type ShoppingTemplate = {
  id: string;
  name: string;
  description?: string;
  items: ShoppingTemplateItem[];
  createdAt: string;
  updatedAt: string;
};

const SHOPPING_TEMPLATE_STORAGE_PREFIX = "gestor-despensa.shopping-templates.v1";
const MAX_TEMPLATES = 20;

function buildStorageKey(householdId?: string | null) {
  return `${SHOPPING_TEMPLATE_STORAGE_PREFIX}.${householdId ?? "local"}`;
}

function toFiniteNumber(value: number | string | null | undefined, fallback: number | null) {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createTemplateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseTemplates(raw: string | null): ShoppingTemplate[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((template): template is ShoppingTemplate => {
      if (!template || typeof template !== "object") return false;
      const candidate = template as ShoppingTemplate;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        Array.isArray(candidate.items) &&
        candidate.items.every(
          (item) =>
            item &&
            typeof item === "object" &&
            typeof item.name === "string" &&
            typeof item.desired_qty === "number",
        )
      );
    });
  } catch {
    return [];
  }
}

export function loadShoppingTemplates(householdId?: string | null): ShoppingTemplate[] {
  if (typeof window === "undefined") return [];
  return parseTemplates(window.localStorage.getItem(buildStorageKey(householdId)));
}

export function buildTemplateItemsFromShoppingList(
  items: ShoppingListItemResponse[],
): ShoppingTemplateItem[] {
  const templateItems: ShoppingTemplateItem[] = [];

  for (const item of items) {
    const name = item.name.trim();
    if (!name) continue;

    templateItems.push({
      name,
      category: item.category ?? null,
      notes: item.notes ?? null,
      desired_qty: toFiniteNumber(item.desired_qty, 1) ?? 1,
      estimated_unit_price: toFiniteNumber(item.estimated_unit_price, null),
    });
  }

  return templateItems;
}

export function saveShoppingTemplate(
  householdId: string | null | undefined,
  input: {
    name: string;
    description?: string;
    items: ShoppingTemplateItem[];
  },
): ShoppingTemplate | null {
  const name = input.name.trim();
  const description = input.description?.trim();
  const items = input.items.filter((item) => item.name.trim());

  if (!name || !items.length || typeof window === "undefined") return null;

  const now = new Date().toISOString();
  const template: ShoppingTemplate = {
    id: createTemplateId(),
    name,
    ...(description ? { description } : {}),
    items,
    createdAt: now,
    updatedAt: now,
  };
  const storageKey = buildStorageKey(householdId);
  const nextTemplates = [
    template,
    ...parseTemplates(window.localStorage.getItem(storageKey)),
  ].slice(0, MAX_TEMPLATES);

  window.localStorage.setItem(storageKey, JSON.stringify(nextTemplates));
  return template;
}

export function deleteShoppingTemplate(
  householdId: string | null | undefined,
  templateId: string,
): ShoppingTemplate[] | null {
  if (!templateId || typeof window === "undefined") return null;

  const storageKey = buildStorageKey(householdId);
  const nextTemplates = parseTemplates(window.localStorage.getItem(storageKey)).filter(
    (template) => template.id !== templateId,
  );

  window.localStorage.setItem(storageKey, JSON.stringify(nextTemplates));
  return nextTemplates;
}
