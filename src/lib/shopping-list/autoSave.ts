import { ShoppingListItemResponse } from "../api/contracts";

const AUTO_SAVE_STORAGE_KEY = "gestor-despensa.shopping-list.auto-save";

export type ShoppingListCheckedDelta = {
  id: string;
  checked: boolean;
  ts: number;
};

type StoredShoppingListSnapshot = {
  lastSyncedAt: number;
  items: Record<string, ShoppingListCheckedDelta>;
};

function readSnapshot(): StoredShoppingListSnapshot {
  try {
    const raw = window.localStorage.getItem(AUTO_SAVE_STORAGE_KEY);
    if (!raw) {
      return { lastSyncedAt: 0, items: {} };
    }
    const parsed = JSON.parse(raw) as StoredShoppingListSnapshot;
    return {
      lastSyncedAt: parsed.lastSyncedAt ?? 0,
      items: parsed.items ?? {},
    };
  } catch {
    return { lastSyncedAt: 0, items: {} };
  }
}

function writeSnapshot(snapshot: StoredShoppingListSnapshot) {
  window.localStorage.setItem(AUTO_SAVE_STORAGE_KEY, JSON.stringify(snapshot));
}

export function saveCheckedDelta(change: ShoppingListCheckedDelta) {
  const snapshot = readSnapshot();
  snapshot.items[change.id] = change;
  writeSnapshot(snapshot);
}

export function markCheckedDeltasSynced(changes: ShoppingListCheckedDelta[]) {
  if (!changes.length) return;

  const snapshot = readSnapshot();
  let latestTs = snapshot.lastSyncedAt;

  for (const change of changes) {
    const current = snapshot.items[change.id];
    if (!current || current.ts <= change.ts) {
      delete snapshot.items[change.id];
    }
    latestTs = Math.max(latestTs, change.ts);
  }

  snapshot.lastSyncedAt = latestTs;
  writeSnapshot(snapshot);
}

export function getCheckedSnapshot() {
  return readSnapshot();
}

export function overlayLocalCheckedState(items: ShoppingListItemResponse[]) {
  const snapshot = readSnapshot();
  const hasPending = Object.keys(snapshot.items).length > 0;
  const serverLastUpdatedAt = items.reduce((latest, item) => {
    const itemTs = new Date(item.updated_at).getTime();
    return Math.max(latest, itemTs);
  }, 0);

  const shouldPreferLocal = hasPending || snapshot.lastSyncedAt > serverLastUpdatedAt;
  if (!shouldPreferLocal) {
    return {
      items,
      shouldSync: false,
      pendingChanges: [] as ShoppingListCheckedDelta[],
    };
  }

  const mergedItems = items.map((item) => {
    const localChange = snapshot.items[item.shopping_list_item_id];
    if (!localChange) return item;

    const itemUpdatedAt = new Date(item.updated_at).getTime();
    if (itemUpdatedAt > localChange.ts) return item;

    return {
      ...item,
      checked: localChange.checked,
      updated_at: new Date(localChange.ts).toISOString(),
    };
  });

  return {
    items: mergedItems,
    shouldSync: hasPending,
    pendingChanges: Object.values(snapshot.items),
  };
}
