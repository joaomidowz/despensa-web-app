export type OverviewResponse = {
  total_inventory_items: number;
  total_inventory_units: number | string;
  month_receipts_count: number;
  month_receipts_total: number | string;
  suggested_restock_count: number;
  low_stock_count: number;
};

export type PaginatedReceiptsResponse = {
  items: ReceiptListItem[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
};

export type ReceiptListItem = {
  receipt_id: string;
  market_name: string;
  receipt_date: string;
  total_amount: number | string;
};

export type ReceiptScanItemResponse = {
  raw_name: string;
  display_name: string;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  total_price: number | string;
  item_type: "PRODUCT" | "DISCOUNT";
};

export type ReceiptScanResponse = {
  market_name: string;
  receipt_date: string;
  total_amount: number | string;
  items: ReceiptScanItemResponse[];
};

export type ConfirmReceiptRequest = {
  market_name: string;
  receipt_date: string;
  total_amount: number;
  matched_shopping_list_item_ids?: string[];
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    total_price: number;
    item_type: "PRODUCT" | "DISCOUNT";
  }>;
};

export type ConfirmReceiptResponse = {
  message: string;
  receipt_id: string;
  items_processed: number;
  matched_shopping_list_item_ids?: string[];
};

export type ReconcileShoppingListRequest = {
  shopping_list_item_ids: string[];
  items: ConfirmReceiptRequest["items"];
};

export type ReconciledShoppingListMatchResponse = {
  shopping_list_item_id: string;
  shopping_list_name: string;
  receipt_product_name: string;
  score: number | string;
};

export type ReconcileShoppingListResponse = {
  matches: ReconciledShoppingListMatchResponse[];
  unmatched_shopping_list_item_ids: string[];
  unmatched_receipt_product_names: string[];
};

export type InventoryItemResponse = {
  inventory_id: string;
  product: {
    product_id: string;
    name: string;
    category: string;
  };
  current_qty: number | string;
  min_qty: number | string;
  status: string;
  updated_at: string;
};

export type CreateInventoryItemRequest = {
  product_name: string;
  category: string;
  current_qty: number;
  min_qty: number;
};

export type UpdateInventoryItemRequest = {
  product_name?: string;
  category?: string;
  current_qty?: number;
  min_qty?: number;
};

export type ReceiptDetailResponse = {
  receipt_id: string;
  market_name: string;
  receipt_date: string;
  total_amount: number | string;
  items: ReceiptDetailItem[];
};

export type ReceiptDetailItem = {
  product_id?: string | null;
  name: string;
  category?: string | null;
  quantity: number | string;
  unit_price: number | string;
  discount_amount: number | string;
  total_price: number | string;
  item_type: "PRODUCT" | "DISCOUNT";
};

export type UpdateReceiptRequest = {
  market_name: string;
  receipt_date: string;
  total_amount: number;
  items: Array<{
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    total_price: number;
    item_type: "PRODUCT" | "DISCOUNT";
  }>;
};

export type ShoppingListCatalogItemResponse = {
  name: string;
  category?: string | null;
  purchase_count: number;
  last_purchased_at: string;
};

export type ShoppingListItemSource = "MANUAL" | "INVENTORY" | "SYSTEM" | "HISTORY" | "TEMPLATE";

export type ShoppingListItemResponse = {
  shopping_list_item_id: string;
  product_id?: string | null;
  inventory_id?: string | null;
  source: ShoppingListItemSource;
  name: string;
  category?: string | null;
  notes?: string | null;
  desired_qty: number | string;
  checked: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateShoppingListItemRequest = {
  name: string;
  category?: string | null;
  notes?: string | null;
  desired_qty?: number;
};

export type UpdateShoppingListItemRequest = {
  name?: string;
  category?: string | null;
  notes?: string | null;
  desired_qty?: number;
  checked?: boolean;
};

export type HouseholdResponse = {
  household_id: string;
  name: string;
  owner_id: string;
};

export type CreateHouseholdRequest = {
  name: string;
};

export type JoinHouseholdRequest = {
  invite_token: string;
};

export type JoinHouseholdResponse = {
  message: string;
  household_id: string;
  household_name: string;
};

export type GenerateInviteRequest = {
  household_id: string;
};

export type GenerateInviteResponse = {
  invite_token: string;
  invite_url: string;
  expires_at: string;
};

export type CurrentHouseholdResponse = {
  household_id: string;
  name: string;
  owner_id: string;
  members: Array<{
    user_id: string;
    name: string;
  }>;
};
