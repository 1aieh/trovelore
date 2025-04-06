// src/app/api/sync/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyOrders, fetchAllShopifyOrders } from "@/lib/shopify-api";
import { supabaseAdmin as supabase } from "@/lib/supabaseClient";

export async function POST(request: NextRequest) {
  try {
    console.log("API route: Starting Shopify order sync...");

    const { searchParams } = new URL(request.url);
    const forceProcess = searchParams.get("force") === "true";
    const fullSync = searchParams.get("full") === "true";
    const batchSize = parseInt(searchParams.get("batchSize") || "50");
    const createdAtMin = searchParams.get("createdAtMin");
    
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

    let shopifyOrders = [];
    let hasMore = false;
    let nextSinceId = null;
    let totalOrdersProcessed = 0;
    let newOrdersCount = 0;
    let skippedOrdersCount = 0;
    let errorOrdersCount = 0;
    let updatedOrdersCount = 0;
    const errorDetails: string[] = [];

    // Use different fetch strategy based on fullSync parameter
    if (fullSync) {
      // For full sync, use fetchAllShopifyOrders which handles pagination internally
      console.log(`Starting full sync${createdAtMin ? ` since ${createdAtMin}` : ''} with batch size ${batchSize}`);
      
      try {
        shopifyOrders = await fetchAllShopifyOrders({
          batchSize,
          createdAtMin: createdAtMin || null,
          onProgress: (progress) => {
            console.log(`Fetched ${progress.fetched} orders so far...`);
          }
        });
        
        console.log(`API route: Fetched ${shopifyOrders.length} total orders from Shopify`);
      } catch (error) {
        console.error("Error fetching all Shopify orders:", error);
        return NextResponse.json(
          { success: false, error: `Error fetching orders: ${(error as Error).message}` },
          { status: 500 }
        );
      }
      
      // Process all fetched orders
      const results = await processOrders(shopifyOrders, forceProcess);
      newOrdersCount = results.newOrdersCount;
      skippedOrdersCount = results.skippedOrdersCount;
      errorOrdersCount = results.errorOrdersCount;
      updatedOrdersCount = results.updatedOrdersCount;
      errorDetails.push(...results.errorDetails);
      totalOrdersProcessed = shopifyOrders.length;
    } else {
      // For incremental sync, use pagination with manual processing between pages
      let page = 1;
      let sinceId = searchParams.get("sinceId") || null;
      
      do {
        try {
          // Fetch one page of orders
          const result = await fetchShopifyOrders(
            page, 
            batchSize, 
            sinceId, 
            createdAtMin || null
          );
          
          shopifyOrders = result.orders;
          hasMore = result.hasMore;
          nextSinceId = result.nextSinceId;
          
          console.log(`API route: Fetched ${shopifyOrders.length} orders from Shopify (page ${page})`);
          
          // Process this batch of orders
          const results = await processOrders(shopifyOrders, forceProcess);
          newOrdersCount += results.newOrdersCount;
          skippedOrdersCount += results.skippedOrdersCount;
          errorOrdersCount += results.errorOrdersCount;
          updatedOrdersCount += results.updatedOrdersCount;
          errorDetails.push(...results.errorDetails);
          totalOrdersProcessed += shopifyOrders.length;
          
          // Prepare for next page
          page++;
          sinceId = nextSinceId;
          
          // Add a small delay between pages to avoid rate limiting
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.error(`Error processing page ${page}:`, error);
          errorDetails.push(`Error on page ${page}: ${(error as Error).message}`);
          errorOrdersCount += shopifyOrders.length;
          break;
        }
      } while (hasMore);
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${totalOrdersProcessed} orders: ${newOrdersCount} new, ${updatedOrdersCount} updated, ${skippedOrdersCount} skipped, ${errorOrdersCount} errors`,
      details: errorDetails,
      hasMore,
      nextSinceId
    });
  } catch (error) {
    console.error("Error in Shopify sync:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Helper function to process a batch of orders
async function processOrders(orders: any[], forceProcess: boolean) {
  let newOrdersCount = 0;
  let skippedOrdersCount = 0;
  let errorOrdersCount = 0;
  let updatedOrdersCount = 0;
  const errorDetails: string[] = [];

  for (const order of orders) {
    // Use the shopify_id field which is already mapped
    const shopifyId = order.shopify_id;
    
    if (!shopifyId) {
      console.error("Order missing shopify_id, skipping:", order.order_ref || "unknown");
      errorOrdersCount++;
      errorDetails.push(`Order ${order.order_ref || "unknown"}: Missing shopify_id`);
      continue;
    }

    try {
      if (!forceProcess) {
        // Check for duplicate orders by shopify_id
        const { data: existingOrders, error: checkError } = await supabase
          .from("orders")
          .select("id, created_at")
          .eq("shopify_id", shopifyId);

        if (checkError) {
          console.error("Error checking for existing order:", checkError);
          errorOrdersCount++;
          errorDetails.push(`Order ${shopifyId}: Database error when checking for duplicates: ${checkError.message}`);
          continue;
        }

        if (existingOrders && existingOrders.length > 0) {
          // Order exists - check if we should update it based on timestamps
          const existingOrder = existingOrders[0];
          const existingDate = new Date(existingOrder.created_at);
          const newOrderDate = new Date(order.created_at);
          
          // If the order in Shopify is newer than our record, update it
          if (newOrderDate > existingDate) {
            const { error: updateError } = await supabase
              .from("orders")
              .update(order)
              .eq("id", existingOrder.id);
              
            if (updateError) {
              console.error("Error updating order:", updateError);
              errorOrdersCount++;
              errorDetails.push(`Order ${shopifyId}: Database error when updating: ${updateError.message}`);
              continue;
            }
            
            console.log(`Successfully updated order: ${shopifyId}`);
            updatedOrdersCount++;
          } else {
            console.log(`Order with shopify_id ${shopifyId} already exists and is up to date, skipping`);
            skippedOrdersCount++;
          }
          continue;
        }
      }

      console.log(`Inserting new order: ${order.order_ref}`);

      // The order is already mapped, so we can insert it directly
      const { error: insertError } = await supabase
        .from("orders")
        .insert(order);

      if (insertError) {
        console.error("Error inserting order:", insertError);
        errorOrdersCount++;
        errorDetails.push(`Order ${shopifyId}: Database error when inserting: ${insertError.message}`);
        continue;
      }

      console.log(`Successfully inserted order: ${shopifyId}`);
      newOrdersCount++;
    } catch (error) {
      console.error(`Error processing order ${shopifyId}:`, error);
      errorOrdersCount++;
      errorDetails.push(`Order ${shopifyId}: Processing error: ${(error as Error).message}`);
    }
  }

  return {
    newOrdersCount,
    skippedOrdersCount,
    errorOrdersCount,
    updatedOrdersCount,
    errorDetails
  };
}
