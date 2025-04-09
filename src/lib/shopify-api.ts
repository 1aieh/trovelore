import { Order, OrderItem, Product } from "@/types";

const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.trim();

export interface ShopifyPaginationInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

// Function to fetch Shopify products
export async function fetchShopifyProducts(params: {
  limit?: number;
  cursor?: string;
  query?: string;
  ids?: string[];  // Array of product IDs to fetch
}): Promise<{ products: Product[]; pagination: ShopifyPaginationInfo }> {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD || !SHOPIFY_API_KEY) {
    throw new Error("Missing Shopify API credentials for products");
  }

  try {
    // Construct query parameters
    const queryParams = new URLSearchParams();
    if (params.limit) queryParams.append("limit", params.limit.toString());
    if (params.cursor) queryParams.append("page_info", params.cursor);
    if (params.query) queryParams.append("query", params.query);
    if (params.ids?.length) queryParams.append("ids", params.ids.join(","));

    // Fields to retrieve for products
    queryParams.append("fields", "id,title,variants,images,product_type,admin_graphql_api_id");

    // Construct the API URL
    const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2023-07/products.json?${queryParams}`;

    console.log("Fetching Shopify products:", apiUrl);

    const response = await fetch(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status}`);
    }

    const data = await response.json();

    // Extract pagination info from headers
    const linkHeader = response.headers.get("Link");
    const hasNextPage = linkHeader?.includes('rel="next"') || false;
    const nextPageMatch = linkHeader?.match(/page_info=([^>&]+)/);
    const endCursor = nextPageMatch ? nextPageMatch[1] : undefined;

    return {
      products: data.products,
      pagination: {
        hasNextPage,
        endCursor,
      },
    };
  } catch (error) {
    console.error("Error fetching Shopify products:", error);
    throw error;
  }
}

export async function fetchShopifyOrders(): Promise<Order[]> {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD || !SHOPIFY_API_KEY) {
    throw new Error("Missing Shopify API credentials for orders");
  }

  // Construct the Shopify API URL using the desired fields.
  // Make sure to include all necessary fields
  const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json?status=any&fields=id,name,order_number,created_at,source_name,customer,email,billing_address,line_items,subtotal_price,total_price,current_total_tax,financial_status,shipping_lines`;

  console.log("Shopify API URL:", apiUrl);

  const response = await fetch(apiUrl, {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Log the raw response to see what we're getting
  console.log("Raw Shopify API response for first order:", 
    data.orders && data.orders.length > 0 
      ? JSON.stringify(data.orders[0], null, 2) 
      : "No orders found");

  // Map the fetched Shopify orders to your Order interface.
  return data.orders.map((shopifyOrder: any) => {
    const customer = shopifyOrder.customer || {};
    // Use billing_address for address information
    const billingAddress = shopifyOrder.billing_address || {};
    
    // Enhanced logging for customer data validation
    console.log(`\nProcessing order ${shopifyOrder.id}:`);
    
    // Check and log empty or missing customer fields
    if (!customer.first_name && !customer.last_name) {
      console.warn(`⚠️ Order ${shopifyOrder.id}: Both first_name and last_name are missing`);
    } else {
      if (!customer.first_name) console.warn(`⚠️ Order ${shopifyOrder.id}: first_name is missing`);
      if (!customer.last_name) console.warn(`⚠️ Order ${shopifyOrder.id}: last_name is missing`);
    }
    
    // Detailed logging of customer data
    console.log('Customer Details:', {
      order_id: shopifyOrder.id,
      first_name: customer.first_name || '(empty)',
      last_name: customer.last_name || '(empty)',
      email: customer.email || '(empty)',
      raw_customer: customer
    });
    
    // Compute total quantity from line items
    const totalQty = shopifyOrder.line_items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0
    );

    // Extract shipping price if available
    let shippingPrice = 0;
    if (Array.isArray(shopifyOrder.shipping_lines) && shopifyOrder.shipping_lines.length > 0) {
      shippingPrice = parseFloat(shopifyOrder.shipping_lines[0].price || "0");
    }

    // Convert line items to JSON string for storage
    const productsJson = JSON.stringify(shopifyOrder.line_items);

    const mappedOrder = {
      id: parseInt(shopifyOrder.order_number.toString()),
      created_at: shopifyOrder.created_at,
      order_ref: shopifyOrder.order_number.toString(),
      order_date: shopifyOrder.created_at,
      order_from: shopifyOrder.source_name || "Shopify",
      block_id: null,
      buyer_id: null,
      buyer: [customer.first_name, customer.last_name]
        .filter(Boolean) // Remove empty/null/undefined values
        .join(' ') || "(No Name)", // Join with space, default to "(No Name)" if empty
      // Use billing_address fields for address information
      city: billingAddress.city || "",
      zip_code: billingAddress.zip || "",
      country: billingAddress.country || "",
      zone: "",
      ship_date: null,
      ship_status: "Not Shipped",
      received: "No",
      products: productsJson,
      total_qty: totalQty,
      value: parseFloat(shopifyOrder.subtotal_price || "0"),
      shipping: shippingPrice,
      total_amt: parseFloat(shopifyOrder.total_price || "0"),
      vat_amt: parseFloat(shopifyOrder.current_total_tax || "0"),
      total_topay: parseFloat(shopifyOrder.total_price || "0"),
      payment_status: shopifyOrder.financial_status === "paid" ? "Deposit Paid" : "No Payment Received",
      deposit_25: 0,
      payment_1: null,
      date_p1: null,
      payment_2: null,
      date_p2: null,
      payment_3: null,
      date_p3: null,
      payment_4: null,
      date_p4: null,
      shopify_id: shopifyOrder.id.toString(),
      source: "Shopify",
    };
    
    // Log the mapped order for debugging
    console.log(`Mapped order: ${JSON.stringify(mappedOrder, null, 2)}`);
    
    return mappedOrder;
  });
}
