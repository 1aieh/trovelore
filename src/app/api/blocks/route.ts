// src/app/api/blocks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { Block } from "@/types";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "100"); // Default to larger page size for blocks
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status"); // Filter by ship_status

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Start building the query
    let query = supabaseAdmin
      .from('blocks')
      .select('*', { count: 'exact' });

    // Add search filter if provided
    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Add status filter if provided
    if (status) {
      query = query.eq('ship_status', status);
    }

    // Add ordering and pagination
    query = query
      .order('ship_month', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Execute the query
    const { data: blocks, error, count } = await query;

    if (error) {
      console.error('Error fetching blocks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      );
    }

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      data: blocks,
      pagination: {
        page,
        pageSize,
        totalCount: count,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error in blocks API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new block
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('blocks')
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating block:', error);
    return NextResponse.json(
      { error: 'Failed to create block' },
      { status: 500 }
    );
  }
}

// Update an existing block
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating block:', error);
    return NextResponse.json(
      { error: 'Failed to update block' },
      { status: 500 }
    );
  }
}

// Delete a block
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Block ID is required' },
        { status: 400 }
      );
    }

    // Check if there are any orders linked to this block
    const { data: linkedOrders, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('block_id', id)
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: 'Failed to check for linked orders' },
        { status: 500 }
      );
    }

    if (linkedOrders && linkedOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete block with linked orders' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('blocks')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting block:', error);
    return NextResponse.json(
      { error: 'Failed to delete block' },
      { status: 500 }
    );
  }
}
