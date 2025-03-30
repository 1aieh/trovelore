import { Order, OrderItem } from "@/types";

const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.trim();

export async function fetchShopifyOrders(): Promise<Order[]> {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD || !SHOPIFY_API_KEY) {
    throw new Error("Missing Shopify API credentials for orders");
  }

  // Construct the Shopify API URL using the desired fields.
  // Adjust the API version as needed.
  const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json?status=any&fields=id,order_number,created_at,source_name,customer,email,line_items,subtotal_price,total_price,current_total_tax,financial_status,shipping_lines`;

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

  // Map the fetched Shopify orders to your Order interface.
  return data.orders.map((shopifyOrder: any) => {
    const customer = shopifyOrder.customer || {};
    const defaultAddress = customer.default_address || {};
    
    // Compute total quantity from line items
    const totalQty = shopifyOrder.line_items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0
    );

    // Extract shipping price if available
    let shippingPrice = 0; // Changed to number with default 0
    if (Array.isArray(shopifyOrder.shipping_lines) && shopifyOrder.shipping_lines.length > 0) {
      shippingPrice = parseFloat(shopifyOrder.shipping_lines[0].price || "0");
    }

    return {
      // Use order_number as the unique identifier and order reference.
      id: parseInt(shopifyOrder.order_number.toString()), // Changed to number
      created_at: shopifyOrder.created_at,
      order_ref: shopifyOrder.order_number.toString(),
      order_date: shopifyOrder.created_at,
      order_from: shopifyOrder.source_name || "Shopify",
      block_id: null,         // Not provided by Shopify; set later via manual assignment.
      buyer_id: null,         // Not provided by Shopify; set later if needed.
      buyer: customer.first_name && customer.last_name
        ? `${customer.first_name} ${customer.last_name}`.trim()
        : "",
      city: defaultAddress.city || "",
      zip_code: defaultAddress.zip || "",
      country: defaultAddress.country || "",
      zone: "",               // Not provided by Shopify.
      ship_date: null,        // Not provided.
      ship_status: "Not Shipped",
      received: "No",         // Text field in Supabase
      // Store the entire line items array as a JSON snapshot.
      products: shopifyOrder.line_items, // Changed to direct object for jsonb
      total_qty: totalQty,    // Changed to number
      value: parseFloat(shopifyOrder.subtotal_price || "0"), // Changed to number
      shipping: shippingPrice, // Changed to number
      total_amt: parseFloat(shopifyOrder.total_price || "0"), // Changed to number
      vat_amt: parseFloat(shopifyOrder.current_total_tax || "0"), // Changed to number
      total_topay: parseFloat(shopifyOrder.total_price || "0"), // Changed to number
      payment_status: shopifyOrder.financial_status === "paid" ? "Deposit Paid" : "No Payment Received",
      deposit_25: 0,          // Changed to number
      payment_1: null,        // Changed to null
      date_p1: null,          // Changed to null
      payment_2: null,        // Changed to null
      date_p2: null,          // Changed to null
      payment_3: null,        // Changed to null
      date_p3: null,          // Changed to null
      payment_4: null,        // Changed to null
      date_p4: null,          // Changed to null
      shopify_id: shopifyOrder.id.toString(),
      source: "Shopify",
      // Map line items individually (if needed for display or further processing)
      lineItems: shopifyOrder.line_items.map((item: any): OrderItem => {
        const quantity = Number(item.quantity) || 1;
        const price = item.price;
        const total = (parseFloat(price) * quantity).toFixed(2);
        return {
          id: item.id.toString(),
          title: item.title,
          quantity: quantity,
          price: price,
          sku: item.sku || "",
          variant_title: item.variant_title || "",
          product_id: item.product_id,
          variant_id: item.variant_id,
          vendor: item.vendor,
          name: item.name,
          subtotal_price: price,
          total_price: total,
        };
      }),
    } as Order;
  });
}