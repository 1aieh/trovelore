// src/types/index.ts

export type OrderStatus =
  | "Deposit Pending"
  | "Deposit Received"
  | "In Production"
  | "Shipped"
  | "Delivered";

export type PaymentStatus = "0%" | "25%" | "50%" | "75%" | "100%";

// If you want a specific type for shipping status, you can define it; otherwise, use string.
export type ShipStatus = string;

// Add OrderItem interface for Shopify line items
export interface OrderItem {
  id: string;
  title: string;
  quantity: number;
  price: string;
  sku: string;
  variantTitle: string;
  subtotal_price: string;
  total_price: string;
}

export interface Order {
  // Database-generated or provided fields
  id: number | string;
  created_at?: string;      // Timestamp of creation
  order_ref?: string;       // Order reference
  order_date?: string;      // Order date (as string/timestamp)
  order_from?: string;      // Order source (e.g., "Online" or "Shopify")
  block_id?: number | null; // Foreign key to Blocks table
  buyer_id?: number | null; // Foreign key to Buyers table
  buyer: string;            // Buyer name
  city?: string;
  zip_code?: string;
  country?: string;
  zone?: string;
  ship_date?: string;
  ship_status?: ShipStatus;
  received?: string;
  // For product details, store a JSON snapshot (as a string)
  products?: string;
  total_qty?: string;
  value?: string;
  shipping?: string;
  total_amt?: string;
  vat_amt?: string;
  total_topay?: string;
  payment_status?: string;
  deposit_25?: string;
  payment_1?: string;
  date_p1?: string;
  payment_2?: string;
  date_p2?: string;
  payment_3?: string;
  date_p3?: string;
  payment_4?: string;
  date_p4?: string;
  shopify_id?: string;
  source?: "Shopify" | "Manual";
  // Add lineItems property for Shopify orders
  lineItems?: OrderItem[];
  subtotal_price?: string;
  total_price?: string;
}

// This is a simplified type for displaying in a table.
export interface OrderRow {
  id: string;
  order_ref: string;
  order_date: string;
  buyer: string;
  ship_status: string;
  products: string; // JSON string; we'll extract, for example, the product name for display.
  total_topay: number;
  payment_status: string;
}

// Block type for your Blocks table
export interface Block {
  id: string;
  name: string;
  ship_month: string;
  ship_status: string;
}

// A generic paginated response type.
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

/* ----------------------------------
   Shopify Product Types (for API fetch)
-------------------------------------*/

export interface Product {
  id: string;
  admin_graphql_api_id: string;
  title: string;
  product_type: string;
  variants: Variant[];
  images: Image[];
}

export interface Variant {
  price: string;
  sku: string;
  admin_graphql_api_id: string;
}

export interface Image {
  id: string;
  position: number;
  admin_graphql_api_id: string;
  src: string;
}