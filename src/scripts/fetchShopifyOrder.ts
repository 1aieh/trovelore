// Script to fetch and display a raw Shopify order
import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Define types for Shopify order data
interface ShopifyAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  province_code: string;
  zip: string;
  country: string;
}

interface ShopifyLineItem {
  name: string;
  quantity: number;
  price: string;
}

interface ShopifyCustomer {
  first_name: string;
  last_name: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  created_at: string;
  customer?: ShopifyCustomer;
  email: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: ShopifyLineItem[];
  shipping_address?: ShopifyAddress;
}

interface ShopifyOrdersListResponse {
  orders: ShopifyOrder[];
}

interface ShopifyOrderResponse {
  order: ShopifyOrder;
}

// Shopify API credentials - use the correct environment variable names
const SHOPIFY_STORE = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || 'trovelore.myshopify.com';
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY || '';
const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD || '';

// Remove the specific order ID and fetch the most recent order instead
async function fetchShopifyOrder() {
  try {
    console.log('Using Shopify credentials:');
    console.log(`Store: ${SHOPIFY_STORE}`);
    console.log(`API Key: ${SHOPIFY_API_KEY.substring(0, 5)}...`); // Only show first few chars for security
    console.log(`Password: ${SHOPIFY_API_PASSWORD.substring(0, 5)}...`); // Only show first few chars for security
    
    // First, fetch a list of orders limited to just the most recent one
    const listUrl = `https://${SHOPIFY_STORE}/admin/api/2023-10/orders.json?limit=1&status=any`;
    
    // Create authorization header using Base64 encoding
    const authString = Buffer.from(`${SHOPIFY_API_KEY}:${SHOPIFY_API_PASSWORD}`).toString('base64');
    
    // Make the API request to get the most recent order
    console.log('Fetching most recent order...');
    const listResponse = await fetch(listUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!listResponse.ok) {
      throw new Error(`HTTP error! Status: ${listResponse.status}, Message: ${await listResponse.text()}`);
    }
    
    // Parse the JSON response to get the list of orders
    const listData = await listResponse.json() as ShopifyOrdersListResponse;
    
    if (!listData.orders || listData.orders.length === 0) {
      throw new Error('No orders found in the store.');
    }
    
    // Get the ID of the most recent order
    const recentOrderId = listData.orders[0].id;
    console.log(`Found recent order with ID: ${recentOrderId}`);
    
    // Now fetch the complete details of this specific order
    const orderUrl = `https://${SHOPIFY_STORE}/admin/api/2023-10/orders/${recentOrderId}.json`;
    
    console.log(`Fetching complete details for order ${recentOrderId}...`);
    const orderResponse = await fetch(orderUrl, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!orderResponse.ok) {
      throw new Error(`HTTP error! Status: ${orderResponse.status}, Message: ${await orderResponse.text()}`);
    }
    
    // Parse the JSON response and type it
    const data = await orderResponse.json() as ShopifyOrderResponse;
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'src/data');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save the raw order data to a file
    const outputPath = path.join(outputDir, 'shopify-order-sample.json');
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    
    console.log('Raw Shopify order:');
    console.log(JSON.stringify(data, null, 2));
    console.log(`\nOrder data saved to: ${outputPath}`);
    
    // Extract and display key information
    console.log('\nKey Order Information:');
    if (data.order) {
      const order = data.order;
      console.log(`Order Number: ${order.name}`);
      console.log(`Created At: ${order.created_at}`);
      console.log(`Customer: ${order.customer?.first_name} ${order.customer?.last_name}`);
      console.log(`Email: ${order.email}`);
      console.log(`Total Price: ${order.total_price} ${order.currency}`);
      console.log(`Payment Status: ${order.financial_status}`);
      console.log(`Fulfillment Status: ${order.fulfillment_status || 'Unfulfilled'}`);
      
      console.log('\nLine Items:');
      order.line_items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.name} (${item.quantity} × ${item.price})`);
      });
      
      console.log('\nShipping Address:');
      const address = order.shipping_address;
      if (address) {
        console.log(`  ${address.name}`);
        console.log(`  ${address.address1}`);
        if (address.address2) console.log(`  ${address.address2}`);
        console.log(`  ${address.city}, ${address.province_code} ${address.zip}`);
        console.log(`  ${address.country}`);
      } else {
        console.log('  No shipping address provided');
      }
    }
  } catch (error) {
    console.error('Error fetching Shopify order:', error);
  }
}

// Execute the function
fetchShopifyOrder();