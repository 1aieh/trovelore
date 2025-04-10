import { Order, OrderItem, Product, ShopifyRawOrder } from "@/types";

const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL?.trim();
const SHOPIFY_API_PASSWORD = process.env.NEXT_PUBLIC_SHOPIFY_API_PASSWORD?.trim();
const SHOPIFY_API_KEY = process.env.NEXT_PUBLIC_SHOPIFY_API_KEY?.trim();

export interface ShopifyPaginationInfo {
  hasNextPage: boolean;
  endCursor?: string;
}

// Custom error class for Shopify API errors
export class ShopifyAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'ShopifyAPIError';
  }
}

// API request configuration
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Helper function to add timeout to fetch
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Helper function to implement retry logic
async function retryOperation<T>(
  operation: () => Promise<T>,
  attempts: number = RETRY_ATTEMPTS,
  delay: number = RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error: unknown) {
    if (error instanceof ShopifyAPIError) {
      // Don't retry auth failures or when out of attempts
      if (error.status === 401 || attempts <= 1) {
        throw error;
      }
      
      // Use rate limit delay if provided, otherwise use exponential backoff
      const retryDelay = error.retryAfter ? error.retryAfter * 1000 : delay;
      
      console.log(`API error (${error.status}), retrying in ${retryDelay}ms... (${attempts - 1} attempts left): ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return retryOperation(operation, attempts - 1, delay * 2);
    }

    // Handle non-Shopify errors
    if (attempts <= 1) {
      throw error instanceof Error ? error : new Error('Operation failed');
    }

    console.log(`Operation failed, retrying in ${delay}ms... (${attempts - 1} attempts left): ${
      error instanceof Error ? error.message : 'Unknown error'
    }`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, attempts - 1, delay * 2);
  }
}

// Function to fetch Shopify products
export async function fetchShopifyProducts(params: {
  limit?: number;
  cursor?: string;
  query?: string;
  ids?: string[];  // Array of product IDs to fetch
}): Promise<{ products: Product[]; pagination: ShopifyPaginationInfo }> {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD || !SHOPIFY_API_KEY) {
    throw new ShopifyAPIError(
      "Missing API credentials",
      401,  // Use 401 Unauthorized for credential issues
    );
  }

  try {
    // Use URL constructor for safe parameter handling
    const apiUrl = new URL(`https://${SHOPIFY_STORE_URL}/admin/api/2023-07/products.json`);
    
    // Add query parameters
    if (params.limit) apiUrl.searchParams.append("limit", params.limit.toString());
    if (params.cursor) apiUrl.searchParams.append("page_info", params.cursor);
    if (params.query) apiUrl.searchParams.append("query", params.query);
    if (params.ids?.length) apiUrl.searchParams.append("ids", params.ids.join(","));
    
    // Add fields parameter
    apiUrl.searchParams.append("fields", [
      'id',
      'admin_graphql_api_id',
      'title',
      'images'
    ].join(','));

    console.log("Fetching Shopify products with URL:", apiUrl.toString());

    const response = await retryOperation(async () => {
      const res = await fetchWithTimeout(apiUrl.toString(), {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const statusText = await res.text().catch(() => 'No error details available');
        
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '5');
          console.log(`Rate limited by Shopify API. Will retry after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          throw new ShopifyAPIError('Rate limited, triggering retry', res.status, retryAfter);
        }

        throw new ShopifyAPIError(
          `API request failed: ${statusText}`,
          res.status
        );
      }

      return res;
    });

    const data = await response.json();
    
    // Log the raw API response for debugging
    console.log('Shopify Products API Response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      products_count: data.products?.length || 0,
      first_product: data.products?.[0] ? {
        id: data.products[0].id,
        title: data.products[0].title,
        has_images: data.products[0].images?.length > 0,
        first_image: data.products[0].images?.[0]?.src || null
      } : 'No products'
    });

    // Extract pagination info from headers
    const linkHeader = response.headers.get("Link");
    const hasNextPage = linkHeader?.includes('rel="next"') || false;
    const nextPageMatch = linkHeader?.match(/page_info=([^>&]+)/);
    const endCursor = nextPageMatch ? nextPageMatch[1] : undefined;

    // Validate that we got an array of products
    if (!Array.isArray(data.products)) {
      console.error('Invalid products response:', data);
      throw new ShopifyAPIError('Products response is not an array', 500);
    }

    return {
      products: data.products,
      pagination: {
        hasNextPage,
        endCursor,
      },
    };
  } catch (error: unknown) {
    // If it's already a ShopifyAPIError, just log and re-throw
    if (error instanceof ShopifyAPIError) {
      console.error("Shopify API error:", error.message, { status: error.status });
      throw error;
    }

    // Convert unknown errors to ShopifyAPIError
    console.error("Error fetching Shopify products:", 
      error instanceof Error ? error.message : 'Unknown error'
    );
    throw new ShopifyAPIError(
      error instanceof Error ? error.message : 'Failed to fetch products',
      500
    );
  }
}

// Cache interface with TTL
interface CacheEntry {
  value: string;
  timestamp: number;
}

// Static cache for product images with 1 hour TTL
const CACHE_TTL = 60 * 60 * 1000; // 1 hour in milliseconds
const productImageCache = new Map<string, CacheEntry>();

// Helper function to get cache with TTL check
function getCacheValue(key: string): string | null {
  const entry = productImageCache.get(key);
  if (!entry) return null;
  
  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    productImageCache.delete(key);
    return null;
  }
  
  return entry.value;
}

// Helper function to set cache with timestamp
function setCacheValue(key: string, value: string): void {
  productImageCache.set(key, {
    value,
    timestamp: Date.now()
  });
  
  // Log cache size every 100 entries
  if (productImageCache.size % 100 === 0) {
    console.log(`Cache size: ${productImageCache.size} entries`);
    const oldestEntry = Array.from(productImageCache.entries())
      .reduce((oldest, current) => 
        current[1].timestamp < oldest[1].timestamp ? current : oldest
      );
    console.log(`Oldest cache entry: ${new Date(oldestEntry[1].timestamp).toISOString()}`);
  }
}

// Helper function to extract numeric ID from various formats
const extractNumericId = (item: OrderItem): string | null => {
  // Try GraphQL ID first
  if (typeof item.admin_graphql_api_id === 'string') {
    const match = item.admin_graphql_api_id.match(/Product\/(\d+)/);
    if (match) return match[1];
  }
  
  // Try REST ID
  if (item.product_id) {
    const restId = item.product_id.toString().match(/\d+/);
    if (restId) return restId[0];
  }
  
  return null;
};

export async function fetchShopifyOrders(): Promise<Order[]> {
  if (!SHOPIFY_STORE_URL || !SHOPIFY_API_PASSWORD || !SHOPIFY_API_KEY) {
    throw new Error("Missing Shopify API credentials for orders");
  }

  // Explicitly request customer and address fields
  const apiUrl = new URL(`https://${SHOPIFY_STORE_URL}/admin/api/2023-07/orders.json`);
  apiUrl.searchParams.append('status', 'any');
  // Explicitly request all fields we need
  apiUrl.searchParams.append('fields', [
    'id',
    'order_number',
    'created_at',
    'source_name',
    'customer',
    'billing_address',
    'line_items',
    'subtotal_price',
    'total_price',
    'current_total_tax',
    'financial_status',
    'shipping_lines'
  ].join(','));

  console.log("Fetching Shopify orders with URL:", apiUrl.toString());

  const response = await retryOperation(async () => {
    try {
      const res = await fetchWithTimeout(apiUrl.toString(), {
        headers: {
          "X-Shopify-Access-Token": SHOPIFY_API_PASSWORD,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        const statusText = await res.text().catch(() => 'No error details available');
        
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '5');
          console.log(`Rate limited by Shopify API. Will retry after ${retryAfter}s`);
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          throw new ShopifyAPIError('Rate limited, triggering retry', res.status, retryAfter);
        }

        throw new ShopifyAPIError(
          `API request failed: ${statusText}`,
          res.status
        );
      }

      return res;
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new ShopifyAPIError(
          `Request timed out after ${REQUEST_TIMEOUT}ms`,
          408 // HTTP 408 Request Timeout
        );
        console.error(timeoutError.message);
        throw timeoutError;
      }
      throw error;
    }
  });

  const data = await response.json();
  
    // Enhanced logging for raw Shopify response
    if (!data.orders || !Array.isArray(data.orders) || data.orders.length === 0) {
      console.error("No orders returned from Shopify API");
      throw new ShopifyAPIError("No orders returned from API", 404);
    }

    console.log(`Received ${data.orders.length} orders from Shopify`);
    
    // Log detailed structure of first order
    const firstOrder = data.orders[0];
    console.log("First order data structure:", {
      id: firstOrder.id,
      order_number: firstOrder.order_number,
      created_at: firstOrder.created_at,
      source_name: firstOrder.source_name,
      customer: {
        exists: !!firstOrder.customer,
        first_name: firstOrder.customer?.first_name,
        last_name: firstOrder.customer?.last_name,
        email: firstOrder.customer?.email,
        raw: firstOrder.customer
      },
      billing_address: {
        exists: !!firstOrder.billing_address,
        city: firstOrder.billing_address?.city,
        zip: firstOrder.billing_address?.zip,
        country: firstOrder.billing_address?.country,
        raw: firstOrder.billing_address
      },
      line_items: {
        count: firstOrder.line_items?.length || 0,
        first_item: firstOrder.line_items?.[0] ? {
          title: firstOrder.line_items[0].title,
          product_id: firstOrder.line_items[0].product_id,
          quantity: firstOrder.line_items[0].quantity,
          raw: firstOrder.line_items[0]
        } : null
      },
      financial_status: firstOrder.financial_status,
      shipping_lines: firstOrder.shipping_lines,
      total_price: firstOrder.total_price,
      subtotal_price: firstOrder.subtotal_price,
      current_total_tax: firstOrder.current_total_tax
    });

  // Collect all unique product IDs from all orders first
  const allProductIds = new Set<string>();
  data.orders.forEach((order: ShopifyRawOrder) => {
    (order.line_items || []).forEach((item: OrderItem) => {
      const productId = extractNumericId(item);
      if (productId) {
        allProductIds.add(productId);
      }
    });
  });

  // Fetch all required product images in one bulk call
  const allProductIdsArray = Array.from(allProductIds);
  let allProducts: Product[] = [];
  if (allProductIdsArray.length > 0) {
    console.log(`Fetching images for ${allProductIdsArray.length} unique products across all orders...`);
    try {
      // Use fetchShopifyProducts which already has retry logic
      const { products: fetchedProducts } = await fetchShopifyProducts({ ids: allProductIdsArray });
      allProducts = fetchedProducts;
      console.log(`Retrieved details for ${allProducts.length} products.`);
    } catch (error) {
      console.error("Failed to fetch bulk product details:", error);
      // Continue without images if bulk fetch fails, maybe log which IDs failed
    }
  }

  // Create a comprehensive image map from the fetched products
  const comprehensiveImageMap = new Map<string, string>();
  allProducts.forEach(product => {
    const normalizedId = product.id.toString().match(/\d+/)?.[0];
    if (normalizedId && product.images && product.images.length > 0) {
      comprehensiveImageMap.set(normalizedId, product.images[0].src);
      // Update cache if needed (optional, could be done here or rely on individual fetch cache)
      if (!getCacheValue(normalizedId)) {
        setCacheValue(normalizedId, product.images[0].src);
      }
    } else if (normalizedId) {
       console.warn(`⚠️ No images found during bulk fetch for product ${normalizedId} (original ID: ${product.id})`);
    }
  });
  console.log(`Created image map with ${comprehensiveImageMap.size} entries.`);

  // Now map the orders using the pre-fetched image map
  const mappedOrdersPromises = data.orders.map(async (rawOrder: ShopifyRawOrder) => {
    // Enhanced logging for customer data validation
    console.log(`\nMapping order ${rawOrder.id}:`);
    
    const lineItems = rawOrder.line_items || [];
    
    // Check and log missing customer fields
    if (!rawOrder.customer?.first_name && !rawOrder.customer?.last_name) {
      console.warn(`⚠️ Order ${rawOrder.id}: Both first_name and last_name are missing`);
    } else {
      if (!rawOrder.customer?.first_name) console.warn(`⚠️ Order ${rawOrder.id}: first_name is missing`);
      if (!rawOrder.customer?.last_name) console.warn(`⚠️ Order ${rawOrder.id}: last_name is missing`);
    }
    
    // Detailed logging of customer data
    console.log('Customer Details:', {
      order_id: rawOrder.id,
      first_name: rawOrder.customer?.first_name || '(empty)',
      last_name: rawOrder.customer?.last_name || '(empty)',
      email: rawOrder.customer?.email || '(empty)',
      raw_customer: rawOrder.customer || null
    });
    
    // Compute total quantity from line items safely
    const totalQty = lineItems.reduce(
      (sum: number, item: OrderItem) => sum + Number(item.quantity || 0),
      0
    );

    // Extract shipping price if available using optional chaining
    const shippingPrice = rawOrder.shipping_lines?.[0]?.price 
      ? parseFloat(rawOrder.shipping_lines[0].price)
      : 0;

    // Map the line items with images from our pre-fetched comprehensiveImageMap
    const productsData = lineItems.map((item: OrderItem) => {
      const productId = extractNumericId(item);
      const productImage = productId ? comprehensiveImageMap.get(productId) : null;
      
      console.log(`Processing line item ${item.title}:`, {
        raw_product_id: item.product_id,
        normalized_id: productId,
        found_image: !!productImage,
        image_url: productImage || 'No image found'
      });
      
      return {
        ...item,
        image_src: productImage || null,
        price: item.price,
        quantity: item.quantity,
        sku: item.sku,
        title: item.title,
        variant_title: item.variant_title,
        product_id: item.product_id,
        variant_id: item.variant_id,
        _debug_image_source: productImage ? 'Found image from comprehensiveImageMap' : 'No image available'
      };
    });

    const productsJson = JSON.stringify(productsData);

    console.log('Order products data:', {
      order_id: rawOrder.id,
      line_items_count: lineItems.length,
      mapped_products_count: productsData.length,
      sample_product: productsData[0] || null
    });

    const mappedOrder = {
      id: parseInt(rawOrder.order_number.toString()),
      created_at: rawOrder.created_at,
      order_ref: rawOrder.order_number.toString(),
      order_date: rawOrder.created_at,
      order_from: rawOrder.source_name || "Shopify",
      block_id: null,
      buyer_id: null,
      buyer: [rawOrder.customer?.first_name, rawOrder.customer?.last_name]
        .filter(Boolean) // Remove empty/null/undefined values
        .join(' ') || "(No Name)", // Join with space, default to "(No Name)" if empty
      // Use billing_address fields for address information with optional chaining
      city: rawOrder.billing_address?.city || "",
      zip_code: rawOrder.billing_address?.zip || "",
      country: rawOrder.billing_address?.country || "",
      zone: "",
      ship_date: null,
      ship_status: "Not Shipped",
      received: "No",
      products: productsJson,
      total_qty: totalQty,
      value: parseFloat(rawOrder.subtotal_price || "0"),
      shipping: shippingPrice,
      total_amt: parseFloat(rawOrder.total_price || "0"),
      vat_amt: parseFloat(rawOrder.current_total_tax || "0"),
      total_topay: parseFloat(rawOrder.total_price || "0"),
      payment_status: rawOrder.financial_status === "paid" ? "Deposit Paid" : "No Payment Received",
      deposit_25: 0,
      payment_1: null,
      date_p1: null,
      payment_2: null,
      date_p2: null,
      payment_3: null,
      date_p3: null,
      payment_4: null,
      date_p4: null,
      shopify_id: rawOrder.id.toString(),
      source: "Shopify",
    };
    
    // Log the mapped order for debugging
    console.log(`Mapped order: ${JSON.stringify(mappedOrder, null, 2)}`);
    
    return mappedOrder;
  });

  return Promise.all(mappedOrdersPromises);
}
