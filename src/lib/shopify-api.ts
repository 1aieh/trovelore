import { Order, OrderItem } from "@/types";

const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.trim();
const SHOPIFY_API_VERSION = "2023-10"; // Updated to more recent API version

// Validate environment variables
function validateEnvironmentVariables() {
  const missingVars = [];
  if (!SHOPIFY_STORE_URL) missingVars.push("NEXT_PUBLIC_SHOPIFY_STORE_URL");
  if (!SHOPIFY_API_PASSWORD) missingVars.push("NEXT_PUBLIC_SHOPIFY_API_PASSWORD");
  if (!SHOPIFY_API_KEY) missingVars.push("NEXT_PUBLIC_SHOPIFY_API_KEY");
  
  if (missingVars.length > 0) {
    throw new Error(`Missing Shopify API credentials: ${missingVars.join(", ")}`);
  }
}

// Helper function to calculate deposit amount (25% of total)
function calculateDeposit(totalPrice: number): number {
  return parseFloat((totalPrice * 0.25).toFixed(2));
}

// Helper function to determine payment status based on Shopify financial status
function determinePaymentStatus(financialStatus: string): string {
  switch (financialStatus) {
    case "paid":
      return "Deposit Paid";
    case "partially_paid":
      return "Partial Payment";
    case "refunded":
      return "Refunded";
    case "voided":
      return "Voided";
    default:
      return "No Payment Received";
  }
}

// Helper function to safely parse numeric values
function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(numValue) ? 0 : numValue;
}

// Function to fetch orders with pagination
export async function fetchShopifyOrders(
  page = 1,
  limit = 50,
  sinceId: string | null = null,
  createdAtMin: string | null = null
): Promise<{ orders: Order[]; hasMore: boolean; nextSinceId: string | null }> {
  validateEnvironmentVariables();

  // Build query parameters
  const queryParams = new URLSearchParams({
    status: "any",
    limit: limit.toString(),
    fields: [
      "id",
      "name",
      "order_number",
      "created_at",
      "source_name",
      "customer",
      "email",
      "billing_address",
      "shipping_address",
      "line_items",
      "subtotal_price",
      "total_price",
      "current_total_tax",
      "financial_status",
      "shipping_lines",
      "fulfillment_status"
    ].join(",")
  });

  // Add optional filters
  if (sinceId) queryParams.append("since_id", sinceId);
  if (createdAtMin) queryParams.append("created_at_min", createdAtMin);

  // Construct the Shopify API URL
  const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/${SHOPIFY_API_VERSION}/orders.json?${queryParams.toString()}`;

  console.log(`Fetching Shopify orders page ${page}, limit ${limit}${sinceId ? `, since_id ${sinceId}` : ""}`);

  // Implement retry logic
  const maxRetries = 3;
  let retries = 0;
  let response;

  while (retries < maxRetries) {
    try {
      response = await fetch(apiUrl, {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD!,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        console.log(`Rate limited. Retrying after ${retryAfter} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        retries++;
        continue;
      }

      if (!response.ok) {
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      break; // Success, exit retry loop
    } catch (error) {
      retries++;
      if (retries >= maxRetries) {
        throw error;
      }
      console.log(`Retry ${retries}/${maxRetries} after error: ${error}`);
      await new Promise(resolve => setTimeout(resolve, 2000 * retries));
    }
  }

  if (!response || !response.ok) {
    throw new Error("Failed to fetch Shopify orders after retries");
  }

  const data = await response.json();
  
  // Determine if there are more orders to fetch
  const hasMore = data.orders.length === limit;
  const nextSinceId = hasMore && data.orders.length > 0 
    ? data.orders[data.orders.length - 1].id.toString() 
    : null;

  // Map the fetched Shopify orders to your Order interface
  const mappedOrders = data.orders.map((shopifyOrder: any) => mapShopifyOrderToOrder(shopifyOrder));

  return {
    orders: mappedOrders,
    hasMore,
    nextSinceId
  };
}

// Separate function for mapping Shopify orders to our Order type
export function mapShopifyOrderToOrder(shopifyOrder: any): Order {
  try {
    const customer = shopifyOrder.customer || {};
    const billingAddress = shopifyOrder.billing_address || {};
    const shippingAddress = shopifyOrder.shipping_address || {};
    
    // Compute total quantity from line items
    const totalQty = Array.isArray(shopifyOrder.line_items) 
      ? shopifyOrder.line_items.reduce(
          (sum: number, item: any) => sum + Number(item.quantity || 0),
          0
        )
      : 0;

    // Extract shipping price if available
    let shippingPrice = 0;
    if (Array.isArray(shopifyOrder.shipping_lines) && shopifyOrder.shipping_lines.length > 0) {
      shippingPrice = safeParseFloat(shopifyOrder.shipping_lines[0].price);
    }

    // Parse prices
    const subtotalPrice = safeParseFloat(shopifyOrder.subtotal_price);
    const totalPrice = safeParseFloat(shopifyOrder.total_price);
    const taxAmount = safeParseFloat(shopifyOrder.current_total_tax);

    // Calculate 25% deposit
    const depositAmount = calculateDeposit(totalPrice);

    // Process line items to ensure they match our OrderItem type
    const lineItems = Array.isArray(shopifyOrder.line_items) 
      ? shopifyOrder.line_items.map((item: any) => ({
          id: item.id?.toString() || "",
          title: item.title || "",
          quantity: item.quantity || 0,
          price: item.price?.toString() || "0",
          sku: item.sku || "",
          variant_title: item.variant_title || "",
          product_id: item.product_id?.toString() || "",
          variant_id: item.variant_id?.toString() || "",
          vendor: item.vendor || "",
          name: item.name || item.title || "",
          grams: item.grams || 0,
          requires_shipping: item.requires_shipping || true,
          subtotal_price: item.price ? (parseFloat(item.price) * (item.quantity || 0)).toFixed(2) : "0.00",
          total_price: item.price ? (parseFloat(item.price) * (item.quantity || 0)).toFixed(2) : "0.00"
        }))
      : [];

    // Convert line items to JSON string for storage
    const productsJson = JSON.stringify(lineItems);

    // Determine payment status
    const paymentStatus = determinePaymentStatus(shopifyOrder.financial_status);

    // Create the mapped order
    const mappedOrder: Order = {
      id: parseInt(shopifyOrder.order_number.toString()),
      created_at: shopifyOrder.created_at,
      order_ref: shopifyOrder.order_number.toString(),
      order_date: shopifyOrder.created_at,
      order_from: shopifyOrder.source_name || "Shopify",
      block_id: null,
      buyer_id: null,
      buyer: customer.first_name && customer.last_name
        ? `${customer.first_name} ${customer.last_name}`.trim()
        : "",
      city: billingAddress.city || shippingAddress.city || "",
      zip_code: billingAddress.zip || shippingAddress.zip || "",
      country: billingAddress.country || shippingAddress.country || "",
      zone: "",
      ship_date: null,
      ship_status: shopifyOrder.fulfillment_status === "fulfilled" ? "Shipped" : "Not Shipped",
      received: "No",
      products: productsJson,
      total_qty: totalQty,
      value: subtotalPrice,
      shipping: shippingPrice,
      total_amt: totalPrice,
      vat_amt: taxAmount,
      total_topay: totalPrice,
      payment_status: paymentStatus,
      deposit_25: depositAmount,
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
      // Include additional fields for frontend use
      email: customer.email || "",
      line_items: lineItems,
    };
    
    return mappedOrder;
  } catch (error) {
    console.error(`Error mapping Shopify order ${shopifyOrder?.id || 'unknown'}:`, error);
    throw new Error(`Failed to map Shopify order: ${(error as Error).message}`);
  }
}

// Function to fetch all orders with automatic pagination
export async function fetchAllShopifyOrders(
  options: { 
    batchSize?: number; 
    createdAtMin?: string | null;
    onProgress?: (progress: { fetched: number; total: number | null }) => void;
  } = {}
): Promise<Order[]> {
  const { 
    batchSize = 50, 
    createdAtMin = null,
    onProgress = () => {} 
  } = options;
  
  let allOrders: Order[] = [];
  let hasMore = true;
  let sinceId: string | null = null;
  let page = 1;
  
  while (hasMore) {
    const result = await fetchShopifyOrders(page, batchSize, sinceId, createdAtMin);
    allOrders = [...allOrders, ...result.orders];
    
    // Update progress
    onProgress({ 
      fetched: allOrders.length, 
      total: null // Shopify doesn't provide total count in advance
    });
    
    hasMore = result.hasMore;
    sinceId = result.nextSinceId;
    page++;
    
    // Add a small delay to avoid rate limiting
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return allOrders;
}
