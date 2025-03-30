// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyOrders } from "@/lib/shopify-api";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient"; // Admin client

export async function POST(request: NextRequest) {
  try {
    console.log("API route: Starting Shopify order sync...");

    // Ensure Supabase client is available.
    if (!supabase) {
      console.error("Supabase client not initialized");
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Fetch orders from Shopify API
    const shopifyOrders = await fetchShopifyOrders();
    console.log(`API route: Fetched ${shopifyOrders.length} orders from Shopify`);

    // Debug: Log first order structure
    if (shopifyOrders.length > 0) {
      console.log("Sample order structure:", JSON.stringify(shopifyOrders[0], null, 2));
    }

    let newOrdersCount = 0;
    let skippedOrdersCount = 0;
    let errorOrdersCount = 0;
    let errorDetails = [];

    // Loop over each Shopify order
    for (const order of shopifyOrders) {
      // Ensure shopify_id exists
      if (!order.shopify_id) {
        console.error("Order missing shopifyId, skipping:", order.order_ref);
        errorOrdersCount++;
        errorDetails.push(`Order ${order.order_ref || 'unknown'}: Missing shopify_id`);
        continue;
      }

      // Check if an order with the same shopify_id already exists in Supabase
      const { data: existing, error: selectError } = await supabase
        .from("orders")
        .select("shopify_id")
        .eq("shopify_id", order.shopify_id);

      if (selectError) {
        console.error("Error selecting order:", selectError);
        errorOrdersCount++;
        errorDetails.push(`Order ${order.order_ref}: ${selectError.message}`);
        continue;
      }

      // Also check if order_ref already exists to prevent unique constraint violation
      const orderRef = order.order_ref || order.name || `#${order.order_number}` || '';
      const { data: existingRef, error: selectRefError } = await supabase
        .from("orders")
        .select("order_ref")
        .eq("order_ref", orderRef);

      if (selectRefError) {
        console.error("Error checking for duplicate order_ref:", selectRefError);
        errorOrdersCount++;
        errorDetails.push(`Order ${order.order_ref}: ${selectRefError.message}`);
        continue;
      }

      // Skip if order already exists by shopify_id
      if (existing && existing.length > 0) {
        console.log(`Skipping existing order: ${order.order_ref}`);
        skippedOrdersCount++;
        continue;
      }

      // Skip if order_ref already exists
      if (existingRef && existingRef.length > 0) {
        console.log(`Skipping order with duplicate order_ref: ${orderRef}`);
        skippedOrdersCount++; // Changed from errorOrdersCount to skippedOrdersCount
        continue; // Skip this order but don't count it as an error
      }

      console.log(`Processing new order: ${order.order_ref}`);

      try {
        // Prepare order data for insertion, mapping Shopify fields to Supabase columns
        const newOrder = {
          // Basic order information
          order_ref: orderRef, // Use the same orderRef we checked above
          order_date: order.created_at || new Date().toISOString(),
          order_from: "Shopify", // This matches your order_from column
          
          // Customer information
          buyer: order.customer ? 
            `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() : 
            '',
          
          // Address information from billing_address
          city: order.billing_address?.city || '',
          zip_code: order.billing_address?.zip || '',
          country: order.billing_address?.country || '',
          
          // Default shipping information
          zone: '',
          ship_date: null,
          ship_status: 'Not Shipped',
          received: 'No',
          
          // Product information
          products: order.line_items || [], // Changed from JSON.stringify to direct object for jsonb
          total_qty: order.line_items ? 
            order.line_items.reduce((sum, item) => {
              // Convert quantity to number if it's a string, then add to sum
              const itemQty = typeof item.quantity === 'string' ? 
                parseInt(item.quantity) || 0 : 
                item.quantity || 0;
              return sum + itemQty;
            }, 0) : // Removed toString() to keep as number
            0, // Changed from '0' to 0
          
          // Financial information
          value: parseFloat(order.total_price || '0'), // Convert to number
          shipping: order.shipping_lines && order.shipping_lines.length > 0 ? 
            parseFloat(order.shipping_lines[0].price || '0') : // Convert to number
            0, // Changed from '0' to 0
          total_amt: parseFloat(order.total_price || '0'), // Convert to number
          vat_amt: 0, // Changed from '0' to 0
          total_topay: parseFloat(order.total_price || '0'), // Convert to number
          payment_status: 'No Payment Received',
          
          // Payment tracking fields (empty by default)
          deposit_25: 0, // Changed from null to 0
          payment_1: null,
          date_p1: null,
          payment_2: null,
          date_p2: null,
          payment_3: null,
          date_p3: null,
          payment_4: null,
          date_p4: null,
          
          // Shopify identifier
          shopify_id: order.id?.toString() || '',
          source: "Shopify"
        };
      
        console.log("Attempting to insert order with data:", JSON.stringify(newOrder, null, 2));
      
        // Insert the new order into Supabase
        const { error: insertError } = await supabase
          .from("orders")
          .insert(newOrder);

        if (insertError) {
          console.error("Error inserting order:", insertError);
          console.error("Order data causing error:", JSON.stringify(newOrder, null, 2));
          errorOrdersCount++;
          errorDetails.push(`Order ${order.order_ref}: ${insertError.message}`);
        } else {
          newOrdersCount++;
          console.log(`Successfully inserted order: ${order.order_ref}`);
        }
      } catch (orderError: any) {
        console.error(`Error processing order ${order?.order_ref || 'unknown'}:`, orderError);
        errorOrdersCount++;
        errorDetails.push(`Order ${order?.order_ref || 'unknown'}: ${orderError?.message || 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synchronized ${newOrdersCount} new orders from Shopify`,
      stats: {
        total: shopifyOrders.length,
        new: newOrdersCount,
        skipped: skippedOrdersCount,
        errors: errorOrdersCount,
      },
      errorDetails: errorDetails.slice(0, 10) // Include first 10 error details for debugging
    });
  } catch (error: any) {
    console.error("Error during synchronization:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}