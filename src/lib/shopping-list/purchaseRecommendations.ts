import type {
  ShoppingListCatalogItemResponse,
  ShoppingListItemResponse,
} from "../api/contracts";

export type PurchaseRecommendationFeedbackAction = "later" | "dismissed";

export type PurchaseRecommendationFeedbackEntry = {
  action: PurchaseRecommendationFeedbackAction;
  updatedAt: string;
  snoozeUntil?: string;
};

export type PurchaseRecommendationFeedbackMap = Record<string, PurchaseRecommendationFeedbackEntry>;

export type PurchaseRecommendation = {
  key: string;
  item: ShoppingListCatalogItemResponse;
  score: number;
  daysSinceLastPurchase: number | null;
  reasons: string[];
};

const RECOMMENDATION_FEEDBACK_STORAGE_PREFIX =
  "gestor-despensa.purchase-recommendation-feedback.v1";
const SNOOZE_DAYS = 7;

function normalizeRecommendationTerm(value: string | null | undefined) {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getPurchaseRecommendationFeedbackKey(value: string | null | undefined) {
  return normalizeRecommendationTerm(value);
}

function buildStorageKey(householdId?: string | null) {
  return `${RECOMMENDATION_FEEDBACK_STORAGE_PREFIX}.${householdId ?? "local"}`;
}

function parseFeedbackMap(raw: string | null): PurchaseRecommendationFeedbackMap {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, PurchaseRecommendationFeedbackEntry] => {
          const value = entry[1];
          return (
            typeof entry[0] === "string" &&
            Boolean(value) &&
            typeof value === "object" &&
            !Array.isArray(value) &&
            ((value as PurchaseRecommendationFeedbackEntry).action === "later" ||
              (value as PurchaseRecommendationFeedbackEntry).action === "dismissed")
          );
        },
      ),
    );
  } catch {
    return {};
  }
}

function getDate(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp);
}

function getDaysSince(dateValue: string | null | undefined, now: Date) {
  const date = getDate(dateValue);
  if (!date) return null;
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / 86_400_000);
}

function getPurchaseCount(item: ShoppingListCatalogItemResponse) {
  return Number.isFinite(item.purchase_count) ? item.purchase_count : 0;
}

function isSnoozed(feedback: PurchaseRecommendationFeedbackEntry | undefined, now: Date) {
  if (!feedback || feedback.action !== "later" || !feedback.snoozeUntil) return false;
  const snoozeDate = getDate(feedback.snoozeUntil);
  return Boolean(snoozeDate && snoozeDate.getTime() > now.getTime());
}

export function shouldHidePurchaseRecommendation(
  feedback: PurchaseRecommendationFeedbackEntry | undefined,
  now = new Date(),
) {
  return feedback?.action === "dismissed" || isSnoozed(feedback, now);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function getMonthWindowScore(lastPurchaseDate: Date | null, now: Date) {
  if (!lastPurchaseDate) return 0;
  const dayDistance = Math.abs(lastPurchaseDate.getDate() - now.getDate());
  if (dayDistance <= 2) return 6;
  if (dayDistance <= 5) return 3;
  return 0;
}

function getWeekdayScore(lastPurchaseDate: Date | null, now: Date) {
  if (!lastPurchaseDate) return 0;
  return lastPurchaseDate.getDay() === now.getDay() ? 4 : 0;
}

function scoreRecommendation({
  categoryHasContext,
  daysSinceLastPurchase,
  feedback,
  item,
  lastPurchaseDate,
  now,
}: {
  categoryHasContext: boolean;
  daysSinceLastPurchase: number | null;
  feedback: PurchaseRecommendationFeedbackEntry | undefined;
  item: ShoppingListCatalogItemResponse;
  lastPurchaseDate: Date | null;
  now: Date;
}) {
  const purchaseCount = getPurchaseCount(item);
  let score = Math.min(purchaseCount, 8) * 8;

  if (daysSinceLastPurchase === null) {
    score += 5;
  } else if (daysSinceLastPurchase >= 45) {
    score += 40;
  } else if (daysSinceLastPurchase >= 30) {
    score += 32;
  } else if (daysSinceLastPurchase >= 21) {
    score += 24;
  } else if (daysSinceLastPurchase >= 14) {
    score += 15;
  } else if (daysSinceLastPurchase >= 7) {
    score += 6;
  } else {
    score -= 10;
  }

  score += getMonthWindowScore(lastPurchaseDate, now);
  score += getWeekdayScore(lastPurchaseDate, now);

  if (categoryHasContext) score += 8;
  if (item.last_unit_price !== null && item.last_unit_price !== undefined) score += 3;
  if (feedback?.action === "later") score -= 10;

  return score;
}

function buildReasons({
  categoryHasContext,
  daysSinceLastPurchase,
  item,
  lastPurchaseDate,
  now,
}: {
  categoryHasContext: boolean;
  daysSinceLastPurchase: number | null;
  item: ShoppingListCatalogItemResponse;
  lastPurchaseDate: Date | null;
  now: Date;
}) {
  const reasons: string[] = [];
  const purchaseCount = getPurchaseCount(item);

  reasons.push(
    purchaseCount > 1 ? `${purchaseCount} compras no historico` : "ja comprado antes",
  );

  if (daysSinceLastPurchase === null) {
    reasons.push("sem data recente");
  } else if (daysSinceLastPurchase === 0) {
    reasons.push("comprado hoje");
  } else {
    reasons.push(`ultima compra ha ${daysSinceLastPurchase} dia(s)`);
  }

  if (categoryHasContext && item.category) {
    reasons.push(`combina com ${item.category}`);
  }

  if (getMonthWindowScore(lastPurchaseDate, now) > 0) {
    reasons.push("janela parecida do mes");
  }

  return reasons.slice(0, 3);
}

export function getCatalogItemRecommendationKey(item: ShoppingListCatalogItemResponse) {
  return normalizeRecommendationTerm(item.canonical_name) || normalizeRecommendationTerm(item.name);
}

export function loadPurchaseRecommendationFeedback(
  householdId?: string | null,
): PurchaseRecommendationFeedbackMap {
  if (typeof window === "undefined") return {};
  return parseFeedbackMap(window.localStorage.getItem(buildStorageKey(householdId)));
}

export function rememberPurchaseRecommendationFeedback(
  householdId: string | null | undefined,
  item: ShoppingListCatalogItemResponse,
  action: PurchaseRecommendationFeedbackAction,
  now = new Date(),
): PurchaseRecommendationFeedbackMap | null {
  const key = getCatalogItemRecommendationKey(item);
  return rememberPurchaseRecommendationFeedbackByKey(householdId, key, action, now);
}

export function rememberPurchaseRecommendationFeedbackForName(
  householdId: string | null | undefined,
  productName: string,
  action: PurchaseRecommendationFeedbackAction,
  now = new Date(),
): PurchaseRecommendationFeedbackMap | null {
  const key = getPurchaseRecommendationFeedbackKey(productName);
  return rememberPurchaseRecommendationFeedbackByKey(householdId, key, action, now);
}

function rememberPurchaseRecommendationFeedbackByKey(
  householdId: string | null | undefined,
  key: string,
  action: PurchaseRecommendationFeedbackAction,
  now: Date,
) {
  if (!key || typeof window === "undefined") return null;

  const storageKey = buildStorageKey(householdId);
  const current = parseFeedbackMap(window.localStorage.getItem(storageKey));
  const entry: PurchaseRecommendationFeedbackEntry = {
    action,
    updatedAt: now.toISOString(),
    ...(action === "later" ? { snoozeUntil: addDays(now, SNOOZE_DAYS).toISOString() } : {}),
  };
  const nextFeedback = {
    ...current,
    [key]: entry,
  };

  window.localStorage.setItem(storageKey, JSON.stringify(nextFeedback));
  return nextFeedback;
}

export function buildPurchaseRecommendations(
  catalogItems: ShoppingListCatalogItemResponse[],
  currentShoppingListItems: ShoppingListItemResponse[],
  feedback: PurchaseRecommendationFeedbackMap,
  limit = 5,
  now = new Date(),
): PurchaseRecommendation[] {
  const currentItemKeys = new Set(
    currentShoppingListItems
      .map((item) => normalizeRecommendationTerm(item.name))
      .filter(Boolean),
  );
  const currentCategories = new Set(
    currentShoppingListItems
      .map((item) => normalizeRecommendationTerm(item.category))
      .filter(Boolean),
  );
  const bestItems = new Map<string, ShoppingListCatalogItemResponse>();

  for (const item of catalogItems) {
    const key = getCatalogItemRecommendationKey(item);
    if (!key || currentItemKeys.has(key)) continue;

    const itemFeedback = feedback[key];
    if (shouldHidePurchaseRecommendation(itemFeedback, now)) continue;

    const existing = bestItems.get(key);
    const existingDate = getDate(existing?.last_purchased_at);
    const itemDate = getDate(item.last_purchased_at);

    if (!existing || (itemDate?.getTime() ?? 0) > (existingDate?.getTime() ?? 0)) {
      bestItems.set(key, item);
    }
  }

  return Array.from(bestItems.entries())
    .map(([key, item]) => {
      const lastPurchaseDate = getDate(item.last_purchased_at);
      const daysSinceLastPurchase = getDaysSince(item.last_purchased_at, now);
      const categoryHasContext = currentCategories.has(normalizeRecommendationTerm(item.category));
      const itemFeedback = feedback[key];
      const score = scoreRecommendation({
        categoryHasContext,
        daysSinceLastPurchase,
        feedback: itemFeedback,
        item,
        lastPurchaseDate,
        now,
      });

      return {
        key,
        item,
        score,
        daysSinceLastPurchase,
        reasons: buildReasons({
          categoryHasContext,
          daysSinceLastPurchase,
          item,
          lastPurchaseDate,
          now,
        }),
      };
    })
    .filter((recommendation) => recommendation.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return getPurchaseCount(right.item) - getPurchaseCount(left.item);
    })
    .slice(0, limit);
}
