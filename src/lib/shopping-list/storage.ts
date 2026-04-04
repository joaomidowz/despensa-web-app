const SHOPPING_LIST_KEY = "gestor-despensa.shopping-list.manual";

export type ManualShoppingListItem = {
  id: string;
  name: string;
};

export function loadManualShoppingList(): ManualShoppingListItem[] {
  try {
    const raw = window.localStorage.getItem(SHOPPING_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ManualShoppingListItem[];
  } catch {
    return [];
  }
}

export function saveManualShoppingList(items: ManualShoppingListItem[]) {
  window.localStorage.setItem(SHOPPING_LIST_KEY, JSON.stringify(items));
}
