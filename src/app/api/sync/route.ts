// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyOrders } from "@/lib/shopify-api";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient"; // Use admin client for higher privileges

export async function POST(request: NextRequest) {
  try {
    console.log("API route: Starting Shopify order sync...");
    
    // Verify Supabase connection
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

    // Debug: Log the first order to see its structure
    if (shopifyOrders.length > 0) {
      console.log("Sample order structure:", JSON.stringify(shopifyOrders[0], null, 2));
    }

    let newOrdersCount = 0;
    let skippedOrdersCount = 0;
    let errorOrdersCount = 0;

    // Loop over each Shopify order
    for (const order of shopifyOrders) {
      // Ensure shopify_id exists
      if (!order.shopify_id) {
        console.error("Order missing shopify_id, skipping:", order.order_ref);
        errorOrdersCount++;
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
        continue;
      }

      // Skip if order already exists
      if (existing && existing.length > 0) {
        console.log(`Skipping existing order: ${order.order_ref}`);
        skippedOrdersCount++;
        continue;
      }

      console.log(`Processing new order: ${order.order_ref}`);
      
      // Prepare order data for insertion
      // Convert any undefined values to null for Postgres compatibility
      const newOrder = Object.entries(order).reduce((acc, [key, value]) => {
        acc[key] = value === undefined ? null : value;
        return acc;
      }, {} as Record<string, any>);
      
      // Ensure products is a string
      if (newOrder.products && typeof newOrder.products !== 'string') {
        newOrder.products = JSON.stringify(newOrder.products);
      }
      
      // Remove any fields that might cause issues with your schema
      delete newOrder.lineItems;
      
      // Insert the new order into Supabase
      const { error: insertError } = await supabase
        .from("orders")
        .insert(newOrder);

      if (insertError) {
        console.error("Error inserting order:", insertError);
        console.error("Order data causing error:", JSON.stringify(newOrder, null, 2));
        errorOrdersCount++;
      } else {
        newOrdersCount++;
        console.log(`Successfully inserted order: ${order.order_ref}`);
      }
    }

    // Force a delay to ensure database operations complete
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      success: true,
      message: `Synchronized ${newOrdersCount} new orders from Shopify`,
      stats: {
        total: shopifyOrders.length,
        new: newOrdersCount,
        skipped: skippedOrdersCount,
        errors: errorOrdersCount
      }
    });
  } catch (error: any) {
    console.error("Error during synchronization:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}