// Test script to diagnose mapping issues between Shopify orders and Supabase schema
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Log environment variables to debug
console.log("Shopify API Key available:", !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
console.log("Shopify API Password available:", !!process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD);
console.log("Shopify Store URL available:", !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL);

async function testShopifyMapping() {
  try {
    console.log("Directly fetching Shopify orders to test mapping...");
    
    const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
    const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
    
    if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD) {
      throw new Error("Missing Shopify API credentials");
    }
    
    // Construct the Shopify API URL - ensure we request all the required fields
    const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json?status=any&fields=id,name,order_number,created_at,billing_address,customer,line_items,subtotal_price,total_price,current_total_tax,financial_status,shipping_lines`;
    
    console.log("API URL:", apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD,
        "Content-Type": "application/json",
      },
    });
    
    if (!response.ok) {
      throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.orders || !Array.isArray(data.orders)) {
      console.log("Unexpected response format:", data);
      throw new Error("Unexpected response format from Shopify API");
    }
    
    console.log(`Successfully fetched ${data.orders.length} orders directly from Shopify API`);
    
    // Use the direct API response as our shopifyOrders
    const shopifyOrders = data.orders;
    
    if (shopifyOrders.length === 0) {
      console.log("No orders to test mapping with.");
      return;
    }
    
    // Get the first order for testing
    const firstOrder = shopifyOrders[0];
    
    // Log the raw order structure
    console.log("\n=== RAW ORDER STRUCTURE ===");
    console.log(JSON.stringify(firstOrder, null, 2));
    
    // Check for key fields that should be mapped to Supabase
    console.log("\n=== FIELD MAPPING ANALYSIS ===");
    
    // Check order identification fields
    console.log("\nOrder Identification:");
    console.log(`id: ${firstOrder.id || 'MISSING'}`);
    console.log(`name: ${firstOrder.name || 'MISSING'}`);
    console.log(`order_number: ${firstOrder.order_number || 'MISSING'}`);
    console.log(`created_at: ${firstOrder.created_at || 'MISSING'}`);
    
    // Check customer information
    console.log("\nCustomer Information:");
    const customer = firstOrder.customer || {};
    console.log(`customer: ${customer ? JSON.stringify(customer) : 'MISSING'}`);
    console.log(`customer.first_name: ${customer.first_name || 'MISSING'}`);
    console.log(`customer.last_name: ${customer.last_name || 'MISSING'}`);
    
    // Check address information
    console.log("\nAddress Information:");
    const billingAddress = firstOrder.billing_address || {};
    console.log(`billing_address: ${billingAddress ? JSON.stringify(billingAddress) : 'MISSING'}`);
    console.log(`billing_address.city: ${billingAddress.city || 'MISSING'}`);
    console.log(`billing_address.zip: ${billingAddress.zip || 'MISSING'}`);
    console.log(`billing_address.country: ${billingAddress.country || 'MISSING'}`);
    
    // Check pricing information
    console.log("\nPricing Information:");
    console.log(`subtotal_price: ${firstOrder.subtotal_price || 'MISSING'}`);
    console.log(`total_price: ${firstOrder.total_price || 'MISSING'}`);
    
    // Check line items
    console.log("\nLine Items:");
    const lineItems = firstOrder.line_items || [];
    console.log(`line_items count: ${lineItems.length}`);
    if (lineItems.length > 0) {
      console.log(`First line item: ${JSON.stringify(lineItems[0])}`);
    }
    
    // Save the raw order to a file for reference
    const dataDir = path.resolve(process.cwd(), 'src/data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const samplePath = path.resolve(dataDir, 'shopify-order-raw.json');
    fs.writeFileSync(samplePath, JSON.stringify(firstOrder, null, 2));
    console.log(`\nRaw order saved to: ${samplePath}`);
    
    // Now compare with what the shopify-api.ts would return
    console.log("\n=== COMPARING WITH EXPECTED MAPPING ===");
    
    // Create a mapped order based on the logic in shopify-api.ts
    const customer2 = firstOrder.customer || {};
    const defaultAddress = customer2.default_address || {};
    
    // Compute total quantity from line items
    const totalQty = firstOrder.line_items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity || 0),
      0
    );

    // Extract shipping price if available
    let shippingPrice = 0;
    if (Array.isArray(firstOrder.shipping_lines) && firstOrder.shipping_lines.length > 0) {
      shippingPrice = parseFloat(firstOrder.shipping_lines[0].price || "0");
    }

    const mappedOrder = {
      id: parseInt(firstOrder.order_number.toString()),
      created_at: firstOrder.created_at,
      order_ref: firstOrder.order_number.toString(),
      order_date: firstOrder.created_at,
      order_from: firstOrder.source_name || "Shopify",
      block_id: null,
      buyer_id: null,
      buyer: customer2.first_name && customer2.last_name
        ? `${customer2.first_name} ${customer2.last_name}`.trim()
        : "",
      city: defaultAddress.city || "",
      zip_code: defaultAddress.zip || "",
      country: defaultAddress.country || "",
      zone: "",
      ship_date: null,
      ship_status: "Not Shipped",
      received: "No",
      products: firstOrder.line_items,
      total_qty: totalQty,
      value: parseFloat(firstOrder.subtotal_price || "0"),
      shipping: shippingPrice,
      total_amt: parseFloat(firstOrder.total_price || "0"),
      vat_amt: parseFloat(firstOrder.current_total_tax || "0"),
      total_topay: parseFloat(firstOrder.total_price || "0"),
      payment_status: firstOrder.financial_status === "paid" ? "Deposit Paid" : "No Payment Received",
      deposit_25: 0,
      payment_1: null,
      date_p1: null,
      payment_2: null,
      date_p2: null,
      payment_3: null,
      date_p3: null,
      payment_4: null,
      date_p4: null,
      shopify_id: firstOrder.id.toString(),
      source: "Shopify",
    };
    
    // Save the mapped order to a file
    const mappedPath = path.resolve(dataDir, 'shopify-order-mapped.json');
    fs.writeFileSync(mappedPath, JSON.stringify(mappedOrder, null, 2));
    console.log(`Mapped order saved to: ${mappedPath}`);
    
    // Check for issues in the mapping
    console.log("\n=== MAPPING ISSUES ===");
    
    // Check if billing_address is being used instead of default_address
    if (billingAddress.city && !defaultAddress.city) {
      console.log("⚠️ ISSUE: billing_address.city exists but is not being mapped (using default_address.city instead)");
    }
    
    if (billingAddress.zip && !defaultAddress.zip) {
      console.log("⚠️ ISSUE: billing_address.zip exists but is not being mapped (using default_address.zip instead)");
    }
    
    if (billingAddress.country && !defaultAddress.country) {
      console.log("⚠️ ISSUE: billing_address.country exists but is not being mapped (using default_address.country instead)");
    }
    
    // Check if customer information is being properly mapped
    if (customer.first_name && customer.last_name && !mappedOrder.buyer) {
      console.log("⚠️ ISSUE: Customer name exists but buyer field is empty");
    }
    
    console.log("\n=== MAPPING SUMMARY ===");
    console.log(`Order ID: ${firstOrder.id}`);
    console.log(`Order Number: ${firstOrder.order_number}`);
    console.log(`Raw Customer: ${customer.first_name} ${customer.last_name}`);
    console.log(`Mapped Buyer: ${mappedOrder.buyer}`);
    console.log(`Raw City: ${billingAddress.city || 'MISSING'}`);
    console.log(`Mapped City: ${mappedOrder.city}`);
    console.log(`Raw Zip: ${billingAddress.zip || 'MISSING'}`);
    console.log(`Mapped Zip: ${mappedOrder.zip_code}`);
    console.log(`Raw Country: ${billingAddress.country || 'MISSING'}`);
    console.log(`Mapped Country: ${mappedOrder.country}`);
    
  } catch (error) {
    console.error("Error in mapping test:", error);
  }
}

// Run the test
testShopifyMapping();