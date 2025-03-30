// src/types/index.ts

export type OrderStatus =
  | "Deposit Pending"
  | "Deposit Received"
  | "In Production"
  | "Shipped"
  | "Delivered";

export type PaymentStatus = 
  | "No Payment Received" 
  | "0%" 
  | "25%" 
  | "50%" 
  | "75%" 
  | "100%";

// If you want a specific type for shipping status, you can define it; otherwise, use string.
export type ShipStatus = "Not Shipped" | "Shipped" | "Delivered" | string;

// Add OrderItem interface for Shopify line items
export interface OrderItem {
  id: string | number;
  title: string;
  quantity: number | string; // Allow both number and string for quantity
  price: string;
  sku: string;
  variant_title?: string;
  product_id?: string | number;
  variant_id?: string | number;
  vendor?: string;
  name?: string;
  grams?: number;
  requires_shipping?: boolean;
  subtotal_price?: string;
  total_price?: string;
}

// Shopify customer interface
export interface ShopifyCustomer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  default_address?: ShopifyAddress;
}

// Shopify address interface
export interface ShopifyAddress {
  first_name: string;
  last_name: string;
  address1: string;
  address2?: string;
  city: string;
  zip: string;
  country: string;
  phone?: string;
  company?: string;
}

// Shopify shipping line interface
export interface ShopifyShippingLine {
  price: string;
  title: string;
  code?: string;
}

export interface Order {
  // Database-generated or provided fields (matching your Supabase table)
  id?: number;                // int8 in Supabase
  created_at?: string;        // timestamptz in Supabase
  order_ref?: string;         // text in Supabase
  order_date?: string | Date; // date in Supabase
  order_from?: string;        // text in Supabase
  block_id?: number | null;   // int8 in Supabase
  buyer_id?: number | null;   // int8 in Supabase
  buyer?: string;             // text in Supabase
  city?: string;              // text in Supabase
  zip_code?: string;          // text in Supabase
  country?: string;           // text in Supabase
  zone?: string;              // text in Supabase
  ship_date?: string | Date | null; // date in Supabase
  ship_status?: ShipStatus;   // text in Supabase
  received?: string;          // text in Supabase
  products?: any;             // jsonb in Supabase
  total_qty?: number;         // int4 in Supabase
  value?: number;             // numeric in Supabase
  shipping?: number;          // numeric in Supabase
  total_amt?: number | null;  // numeric in Supabase
  vat_amt?: number | null;    // numeric in Supabase
  total_topay?: number;       // numeric in Supabase
  payment_status?: string;    // text in Supabase
  deposit_25?: number | null; // numeric in Supabase
  payment_1?: number | null;  // numeric in Supabase
  date_p1?: string | Date | null; // date in Supabase
  payment_2?: number | null;  // numeric in Supabase
  date_p2?: string | Date | null; // date in Supabase
  payment_3?: number | null;  // numeric in Supabase
  date_p3?: string | Date | null; // date in Supabase
  payment_4?: number | null;  // numeric in Supabase
  date_p4?: string | Date | null; // date in Supabase
  shopify_id?: string;        // text in Supabase
  source?: "Shopify" | "Manual"; // text in Supabase
  
  // Shopify-specific fields for mapping purposes (optional, not stored in DB)
  name?: string;
  order_number?: number;
  customer?: ShopifyCustomer;
  billing_address?: ShopifyAddress;
  shipping_address?: ShopifyAddress;
  line_items?: OrderItem[];
  shipping_lines?: ShopifyShippingLine[];
  total_price?: string;
  subtotal_price?: string;
  financial_status?: string;
  lineItems?: OrderItem[]; // For frontend use
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