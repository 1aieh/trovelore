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

      // Skip if order already exists
      if (existing && existing.length > 0) {
        console.log(`Skipping existing order: ${order.order_ref}`);
        skippedOrdersCount++;
        continue;
      }

      console.log(`Processing new order: ${order.order_ref}`);

      try {
        // Get the table structure to see what columns are available
        const { data: tableInfo, error: tableError } = await supabase
          .from('orders')
          .select('*')
          .limit(1);
          
        if (tableError) {
          console.error("Error getting table structure:", tableError);
        } else {
          console.log("Available columns:", tableInfo.length > 0 ? Object.keys(tableInfo[0]) : "No data");
        }
        
        // Prepare order data for insertion, converting undefined to null
        // and mapping to the correct column names
        const newOrder = {
          // Try different field mappings based on your Supabase schema
          order_ref: order.order_ref,
          order_date: order.order_date,
          source: order.source || "Shopify",
          shopify_id: order.shopify_id,
          // Add other fields as needed, matching your Supabase schema
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