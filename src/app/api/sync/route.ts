// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyOrders } from "@/lib/shopify-api";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    console.log("API route: Starting Shopify order sync...");

    const { searchParams } = new URL(request.url);
    const forceProcess = searchParams.get("force") === "true";
    if (forceProcess) {
      console.log("Force processing enabled - will attempt to process all orders");
    }

    if (!supabase) {
      console.error("Supabase client not initialized");
      return NextResponse.json(
        { success: false, error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Fetch raw orders from Shopify
    const shopifyOrders = await fetchShopifyOrders();
    console.log(`API route: Fetched ${shopifyOrders.length} orders from Shopify`);
    
    // Log the first order to see its structure
    if (shopifyOrders.length > 0) {
      console.log("First order structure:", JSON.stringify(shopifyOrders[0], null, 2));
    }

    let newOrdersCount = 0;
    let skippedOrdersCount = 0;
    let errorOrdersCount = 0;
    const errorDetails: string[] = [];

    // The orders are already mapped in fetchShopifyOrders
    // We should use them directly without trying to access raw Shopify fields
    for (const order of shopifyOrders) {
      // Use the shopify_id field which is already mapped
      const shopifyId = order.shopify_id;
      
      if (!shopifyId) {
        console.error("Order missing shopify_id, skipping:", order.order_ref || "unknown");
        errorOrdersCount++;
        errorDetails.push(`Order ${order.order_ref || "unknown"}: Missing shopify_id`);
        continue;
      }

      if (!forceProcess) {
        // Check for duplicate orders by shopify_id
        const { data: existingOrders, error: checkError } = await supabase
          .from("orders")
          .select("id")
          .eq("shopify_id", shopifyId);

        if (checkError) {
          console.error("Error checking for existing order:", checkError);
          errorOrdersCount++;
          errorDetails.push(`Order ${shopifyId}: Database error when checking for duplicates`);
          continue;
        }

        if (existingOrders && existingOrders.length > 0) {
          console.log(`Order with shopify_id ${shopifyId} already exists, skipping`);
          skippedOrdersCount++;
          continue;
        }
      }

      console.log(`Mapping new order: ${order.order_ref}`);

      // The order is already mapped, so we can insert it directly
      const { error: insertError } = await supabase
        .from("orders")
        .insert(order);

      if (insertError) {
        console.error("Error inserting order:", insertError);
        errorOrdersCount++;
        errorDetails.push(`Order ${shopifyId}: Database error when inserting`);
        continue;
      }

      console.log(`Successfully inserted order: ${shopifyId}`);
      newOrdersCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${shopifyOrders.length} orders: ${newOrdersCount} new, ${skippedOrdersCount} skipped, ${errorOrdersCount} errors`,
      details: errorDetails,
    });
  } catch (error) {
    console.error("Error in Shopify sync:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}