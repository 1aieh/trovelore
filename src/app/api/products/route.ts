// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { fetchShopifyProducts } from "@/lib/shopify-api";

// Increase memory limit if needed due to image data
export const config = {
  api: {
    responseLimit: '8mb',
  },
};

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const cursor = searchParams.get("cursor") || undefined;
    const query = searchParams.get("query") || undefined;
    const ids = searchParams.get("ids")?.split(","); // Comma-separated product IDs

    // Fetch products from Shopify
    const result = await fetchShopifyProducts({
      limit,
      cursor,
      query,
      ids,
    });

    // Cache the response for 5 minutes (300 seconds)
    // Products don't change very often, and this helps with rate limits
    const headers = {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    };

    return NextResponse.json(result, { headers });
  } catch (error) {
    console.error('Error in products API:', error);
    
    // Check if it's a rate limit error from Shopify
    if (error instanceof Error && error.message.includes('429')) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// Search products with typeahead/autocomplete support
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { search, limit = 10 } = body;

    if (!search) {
      return NextResponse.json(
        { error: 'Search term is required' },
        { status: 400 }
      );
    }

    // Use Shopify's search functionality
    const result = await fetchShopifyProducts({
      limit,
      query: search,
    });

    // Transform the response for autocomplete
    const suggestions = result.products.map(product => ({
      id: product.id,
      title: product.title,
      price: product.variants?.[0]?.price || "0.00",
      image: product.images?.[0]?.src,
      type: product.product_type,
    }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error in products search API:', error);
    return NextResponse.json(
      { error: 'Failed to search products' },
      { status: 500 }
    );
  }
}

// Get detailed information for specific products
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Product IDs array is required' },
        { status: 400 }
      );
    }

    // Fetch specific products by IDs
    const result = await fetchShopifyProducts({
      ids,
      limit: ids.length,
    });

    return NextResponse.json({
      products: result.products,
    });
  } catch (error) {
    console.error('Error fetching product details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product details' },
      { status: 500 }
    );
  }
}
