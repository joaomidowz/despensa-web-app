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
