// Direct test of Shopify API without using the fetchShopifyOrders function
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Log environment variables to debug
console.log("Shopify API Key available:", !!process.env.NEXT_PUBLIC_SHOPIFY_API_KEY);
console.log("Shopify API Password available:", !!process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD);
console.log("Shopify Store URL available:", !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL);

async function directShopifyTest() {
  try {
    const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
    const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
    
    if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD) {
      throw new Error("Missing Shopify API credentials");
    }
    
    console.log("Directly fetching Shopify orders...");
    
    // Construct the Shopify API URL - ensure we request all the required fields
    const apiUrl = `https://${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json?status=any&fields=id,name,order_number,created_at,billing_address,customer,line_items,subtotal_price,total_price`;
    
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
    
    if (data.orders.length > 0) {
      const firstOrder = data.orders[0];
      console.log("First order keys:", Object.keys(firstOrder));
      
      // Check for required fields
      const requiredFields = [
        'id', 'name', 'order_number', 'created_at', 
        'billing_address', 'customer', 'line_items', 
        'subtotal_price', 'total_price'
      ];
      
      const missingFields = requiredFields.filter(field => !(field in firstOrder));
      
      if (missingFields.length === 0) {
        console.log("\n✅ REQUIREMENT FULFILLED: Raw Shopify order objects contain all required fields");
        
        // Verify the data types and content of each field
        console.log("\nField verification:");
        console.log(`- id: ${typeof firstOrder.id} - ${firstOrder.id}`);
        console.log(`- name: ${typeof firstOrder.name} - ${firstOrder.name}`);
        console.log(`- order_number: ${typeof firstOrder.order_number} - ${firstOrder.order_number}`);
        console.log(`- created_at: ${typeof firstOrder.created_at} - ${firstOrder.created_at}`);
        console.log(`- billing_address: ${typeof firstOrder.billing_address} - ${firstOrder.billing_address ? "Present" : "Missing"}`);
        console.log(`- customer: ${typeof firstOrder.customer} - ${firstOrder.customer ? "Present" : "Missing"}`);
        console.log(`- line_items: ${typeof firstOrder.line_items} - ${Array.isArray(firstOrder.line_items) ? `Array with ${firstOrder.line_items.length} items` : "Not an array"}`);
        console.log(`- subtotal_price: ${typeof firstOrder.subtotal_price} - ${firstOrder.subtotal_price}`);
        console.log(`- total_price: ${typeof firstOrder.total_price} - ${firstOrder.total_price}`);
      } else {
        console.log("\n❌ REQUIREMENT NOT FULFILLED: Missing required fields:", missingFields);
      }
      
      // Save the raw order to a file for reference
      const dataDir = path.resolve(process.cwd(), 'src/data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const samplePath = path.resolve(dataDir, 'shopify-order-raw.json');
      fs.writeFileSync(samplePath, JSON.stringify(firstOrder, null, 2));
      console.log(`\nRaw order saved to: ${samplePath}`);
      
      // Output a summary of the order
      console.log("\nOrder Summary:");
      console.log(`Order: ${firstOrder.name || `#${firstOrder.order_number}` || firstOrder.id}`);
      console.log(`Date: ${firstOrder.created_at}`);
      console.log(`Customer: ${firstOrder.customer ? 
        `${firstOrder.customer.first_name || ''} ${firstOrder.customer.last_name || ''}`.trim() : 
        'Unknown'}`);
      console.log(`Total Items: ${firstOrder.line_items ? firstOrder.line_items.length : 0}`);
      console.log(`Total Price: ${firstOrder.total_price || 'Unknown'}`);
    } else {
      console.log("No orders returned from Shopify");
    }
  } catch (error) {
    console.error("Error in direct Shopify test:", error);
  }
}

// Run the test
directShopifyTest();