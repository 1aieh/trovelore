# Trovelore Project Context

## Overview

Trovelore is a custom order management system for a small business managing international shipments. Orders are grouped into “blocks” and require a deposit before processing. The system supports both manually entered orders and orders fetched from Shopify. The backend now uses Supabase (PostgreSQL) for persistent storage of orders, buyers, and blocks, while Shopify product data is fetched directly via API.

This document outlines how the system is organized, how data flows between components, and how the MVP pattern and separation of concerns are applied throughout the architecture.

## Architecture Overview

### Data Sources

1. **Orders Table (Master Orders)**
   - **Purpose:**  
     Stores both manually entered and Shopify orders.  
   - **Key Columns:**  
     - `id` (Primary key, auto-increment)
     - `order_ref_no` (Unique order reference)
     - `order_date` (Timestamp)
     - `from_source` (Origin of the order – e.g. "Shopify", "Manual")
     - `block_id` (Foreign key linking to the Blocks table)
     - `buyer_id` (Foreign key linking to the Buyers table)
     - `buyer`, `city`, `zip_code`, `country`, `zone`
     - `ship_date`, `ship_status`, `received`
     - `products` (JSONB snapshot of line items)
     - `total_qty`, `value`, `shipping`, `total_amt`, `vat_amt`, `total_topay`
     - `deposit_25` (Deposit required, renamed from `25_deposit`)
     - Payment fields: `payment_1`, `date_p1`, `payment_2`, `date_p2`, `payment_3`, `date_p3`, `payment_4`, `date_p4`
     - Additional fields: `status`, `payment`, `email`, `shipping_address`, `notes`, `shopify_id`
     - `line_items` (Optional JSONB for detailed breakdown)
     - `subtotal_price`, `total_price`
     - `created_at` (Timestamp with default `now()`)

2. **Buyers Table**
   - **Purpose:**  
     Stores buyer information needed for order assignment and display.
   - **Key Columns:**  
     - `id` (Primary key)
     - `name`
     - `buyer_no`
     - `billing_name_address`
     - `vat_no`
     - `delivery_name_address`
     - `delivery_contact_person`
     - `delivery_contact_number` 
     - `delivery_contact_email`
     - `created_at` (Timestamp)

3. **Blocks Table**
   - **Purpose:**  
     Manages groupings of orders for shipping schedules.
   - **Key Columns:**  
     - `id` (Primary key)
     - `name` (Block name, unique)
     - `ship_month` (Text or date, representing the shipment month)
     - `ship_status` (Text, e.g. “Pending”, “In Production”, “Shipped”, “Closed”)

4. **Shopify Products (Fetched via API)**
   - **Purpose:**  
     Products aren’t stored in Supabase—they are fetched on-demand.  
   - **Key Fields (from Shopify API):**  
     - Product: `id`, `admin_graphql_api_id`, `title`, `product_type`
     - Variant: `price`, `sku`, `admin_graphql_api_id`
     - Images: `id`, `position`, `admin_graphql_api_id`, `src`

### Data Flow & Interconnections

- **Orders:**  
  All order data is stored in a single **Orders** table. Orders can come from two sources:
  - **Manual orders:** Entered via your UI.
  - **Shopify orders:** Fetched via the Shopify API and inserted into the same table with a flag in the `source` column.
  - **Merging Logic:**  
    When syncing, Shopify orders are compared against existing orders using their order reference (or shopify_id) so that duplicates are skipped. The MASTER view of orders is built by merging manual and Shopify orders.
  
- **Buyers:**  
  When creating or editing an order, the frontend can query the **Buyers** table (via an API route or directly using the Supabase client) for autocomplete or search. Once a buyer is selected, their `buyer_id` is linked to the order (with related details like name and contact info stored or displayed as needed).

- **Blocks:**  
  Orders reference blocks by a foreign key (`block_id`). The Blocks table holds shipping schedule data. The frontend can query blocks (e.g. via a `/api/blocks` endpoint or directly with Supabase) to let the user assign an order to a specific block.

- **Products:**  
  Products are fetched via a dedicated `/api/products` endpoint that calls Shopify’s API. For manual orders, when a user selects products, the chosen product details are stored as a JSON snapshot in the `products` column of the order. This ensures that whether an order is fetched from Shopify or entered manually, the product data is consistent for display.

### Application Architecture: MVP & Separation of Concerns

- **Model (Data Layer):**
  - **Supabase Tables:**  
    The orders, buyers, and blocks tables form the data model.  
  - **Database Queries:**  
    All data interactions (CRUD operations) are handled using the Supabase client or via custom API endpoints.
  
- **Presenter (Business Logic & API Routes):**
  - **API Endpoints:**  
    Next.js API routes (e.g., `/api/orders`, `/api/buyers`, `/api/blocks`, `/api/products`, `/api/sync`) act as the intermediary between the frontend and the Supabase backend.
  - **Business Logic:**  
    Functions to merge data, filter duplicate orders (e.g., skip Shopify orders if already imported), and transform data (e.g., mapping Shopify line items to your desired JSON structure).
  - **Separation of Concerns:**  
    Each API route has a focused responsibility—orders endpoints handle order data, buyers endpoints handle buyer data, etc. This makes testing and maintenance easier.
  
- **View (Frontend/UI):**
  - **React/Next.js Components:**  
    Your UI components (such as Dashboard, Order Editor, Buyer Autocomplete) consume the data from your API endpoints.
  - **State Management:**  
    The frontend maintains mutable state (e.g., an order’s JSON) that gets updated via user interactions and then synchronized with Supabase.
  - **Realtime Updates (Optional):**  
    If enabled, the frontend can subscribe to real-time changes from Supabase (e.g., using Supabase Realtime) to immediately reflect changes in the UI.

### Use Cases & Data Flow Examples

1. **Order Creation (Manual):**
   - The user starts with an empty order form.
   - The frontend queries the **Buyers** table to let the user search and assign a buyer.
   - The user selects products from a list fetched via the Shopify products API.
   - The selected product data is stored as a JSON snapshot in the order.
   - The order is inserted into the **Orders** table with `source = 'Manual'`.
   - If needed, the order is linked to a block by setting `block_id`.

2. **Shopify Order Synchronization:**
   - A background process or API route (`/api/sync`) fetches orders from Shopify.
   - Each fetched order is transformed into your Order format.
   - Orders are inserted into the **Orders** table with `source = 'Shopify'` if they do not already exist (using `shopify_id` or order reference for deduplication).

3. **Order Editing & Updates:**
   - The frontend fetches the complete list of orders from the **Orders** table (or via an API endpoint that returns the merged master view).
   - When a user edits an order (e.g., updates payment status or assigns a new block), the updated JSON is sent via an API route that updates the corresponding record in Supabase.
   - Optionally, if using Realtime, changes propagate to other connected clients.

4. **Querying & Filtering:**
   - The UI can query the **Buyers** and **Blocks** tables (using Supabase’s filtering methods) to build dynamic search fields or grouping in the dashboard.

---

## Conclusion

By replacing Google Sheets with Supabase, you gain a robust, scalable, and mutable database with strong relational integrity. The **Orders** table becomes your unified data source, while **Buyers** and **Blocks** are maintained in separate tables for better data management and querying. Products are fetched on demand from Shopify and stored as JSON snapshots in orders for display consistency.

Using an MVP pattern and clear separation of concerns—where API routes (Presenter) mediate between your Supabase data (Model) and your UI components (View)—ensures that your system is maintainable, testable, and scalable as your project grows.

This document serves as the context and blueprint for how data flows and interconnects across your application. Let me know if you need further details or adjustments!