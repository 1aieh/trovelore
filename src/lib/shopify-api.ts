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
    let shippingPrice = "";
    if (Array.isArray(shopifyOrder.shipping_lines) && shopifyOrder.shipping_lines.length > 0) {
      shippingPrice = shopifyOrder.shipping_lines[0].price || "";
    }

    return {
      // Use order_number as the unique identifier and order reference.
      id: shopifyOrder.order_number.toString(),
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
      ship_date: "",          // Not provided.
      ship_status: "",        // Not provided (default could be set on Supabase).
      received: "",           // Not provided.
      // Store the entire line items array as a JSON snapshot.
      products: JSON.stringify(shopifyOrder.line_items),
      total_qty: totalQty.toString(),
      value: shopifyOrder.subtotal_price,
      shipping: shippingPrice,
      total_amt: shopifyOrder.total_price,
      vat_amt: shopifyOrder.current_total_tax,
      total_topay: shopifyOrder.total_price, // For now, assume equal to total price.
      payment_status: shopifyOrder.financial_status === "paid" ? "Deposit Paid" : "Deposit Pending",
      deposit_25: "",         // Not provided.
      payment_1: "",          // Not provided.
      date_p1: "",            // Not provided.
      payment_2: "",          // Not provided.
      date_p2: "",            // Not provided.
      payment_3: "",          // Not provided.
      date_p3: "",            // Not provided.
      payment_4: "",          // Not provided.
      date_p4: "",            // Not provided.
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
          quantity,
          price: price,
          sku: item.sku || "",
          variantTitle: item.variant_title || "",
          subtotal_price: price,
          total_price: total,
        };
      }),
      subtotal_price: shopifyOrder.subtotal_price,
      total_price: shopifyOrder.total_price,
    } as Order;
  });
}