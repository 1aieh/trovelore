// src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";
import { Order } from "@/types";

export async function GET(request: NextRequest) {

  try {
    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const orderBy = searchParams.get("orderBy") || "order_date";
    const order = searchParams.get("order") || "desc";
    const search = searchParams.get("search") || "";

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Start building the query
    let query = supabaseAdmin
      .from('orders')
      .select('*', { count: 'exact' });

    // Build filter conditions
    let filterConditions = [];
    
    if (search) {
      filterConditions.push(`order_ref.ilike.%${search}%,buyer.ilike.%${search}%`);
    }

    const shipStatus = searchParams.get("ship_status");
    if (shipStatus) {
      filterConditions.push(`ship_status.eq.${shipStatus}`);
    }

    const paymentStatus = searchParams.get("payment_status");
    if (paymentStatus) {
      filterConditions.push(`payment_status.eq.${paymentStatus}`);
    }

    // Apply filters if any exist
    if (filterConditions.length > 0) {
      query = query.or(filterConditions.join(','));
    }

    // Validate orderBy field to prevent SQL injection
    const validColumns = ['order_ref', 'order_date', 'buyer', 'total_topay', 'payment_status', 'ship_status'];
    if (!validColumns.includes(orderBy)) {
      throw new Error('Invalid sort column');
    }

    // Add sorting - support multiple columns
    const orderByFields = orderBy.split(',');
    const sortOrders = order.split(',');

    // Apply sorting for each field
    orderByFields.forEach((field, index) => {
      const sortOrder = sortOrders[index] || order;
      query = query.order(field as any, { ascending: sortOrder === 'asc' });
    });

    // Add pagination
    query = query.range(offset, offset + pageSize - 1);

    // Log the query for debugging
    console.log('Query params:', {
      search,
      shipStatus,
      paymentStatus,
      orderBy: orderByFields,
      sortOrders,
      page,
      pageSize
    });

    // Execute the query
    const { data: orderData, error, count } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      );
    }

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      data: orderData,
      pagination: {
        page,
        pageSize,
        totalCount: count,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error in orders API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabaseAdmin
      .from('orders')
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
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

// Update an existing order
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
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
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

// Delete an order
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('orders')
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
    console.error('Error deleting order:', error);
    return NextResponse.json(
      { error: 'Failed to delete order' },
      { status: 500 }
    );
  }
}
