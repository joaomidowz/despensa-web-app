import { ShoppingListItemResponse } from "../api/contracts";

const SHOPPING_PURCHASE_SESSION_KEY = "gestor-despensa.shopping-list.purchase-session";

export type PendingShoppingPurchaseItem = {
  shopping_list_item_id: string;
  name: string;
  notes?: string | null;
  desired_qty: number | string;
};

export function savePendingShoppingPurchase(items: ShoppingListItemResponse[]) {
  const payload: PendingShoppingPurchaseItem[] = items.map((item) => ({
    shopping_list_item_id: item.shopping_list_item_id,
    name: item.name,
    notes: item.notes ?? null,
    desired_qty: item.desired_qty,
  }));
  window.localStorage.setItem(SHOPPING_PURCHASE_SESSION_KEY, JSON.stringify(payload));
}

export function loadPendingShoppingPurchase(): PendingShoppingPurchaseItem[] {
  try {
    const raw = window.localStorage.getItem(SHOPPING_PURCHASE_SESSION_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PendingShoppingPurchaseItem[];
  } catch {
    return [];
  }
}

export function clearPendingShoppingPurchase() {
  window.localStorage.removeItem(SHOPPING_PURCHASE_SESSION_KEY);
}
