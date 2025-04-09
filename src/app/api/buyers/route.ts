// src/app/api/buyers/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseClient";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const search = searchParams.get("search") || "";
    const withOrders = searchParams.get("withOrders") === "true";

    // Calculate offset
    const offset = (page - 1) * pageSize;

    // Start building the query
    // If withOrders is true, also get a count of orders for each buyer
    let query = supabaseAdmin
      .from('buyers')
      .select(
        withOrders 
          ? `*, orders:orders(count)`
          : '*',
        { count: 'exact' }
      );

    // Add search filter if provided - search across multiple fields
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,` +
        `buyer_no.ilike.%${search}%,` +
        `delivery_contact_person.ilike.%${search}%,` +
        `delivery_contact_email.ilike.%${search}%`
      );
    }

    // Add ordering and pagination
    query = query
      .order('name', { ascending: true })
      .range(offset, offset + pageSize - 1);

    // Execute the query
    const { data: buyers, error, count } = await query;

    if (error) {
      console.error('Error fetching buyers:', error);
      return NextResponse.json(
        { error: 'Failed to fetch buyers' },
        { status: 500 }
      );
    }

    // Calculate total pages
    const totalPages = count ? Math.ceil(count / pageSize) : 0;

    return NextResponse.json({
      data: buyers,
      pagination: {
        page,
        pageSize,
        totalCount: count,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error in buyers API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create a new buyer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Buyer name is required' },
        { status: 400 }
      );
    }

    // Check for duplicate buyer number if provided
    if (body.buyer_no) {
      const { data: existing } = await supabaseAdmin
        .from('buyers')
        .select('id')
        .eq('buyer_no', body.buyer_no)
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'Buyer number already exists' },
          { status: 400 }
        );
      }
    }
    
    const { data, error } = await supabaseAdmin
      .from('buyers')
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
    console.error('Error creating buyer:', error);
    return NextResponse.json(
      { error: 'Failed to create buyer' },
      { status: 500 }
    );
  }
}

// Update an existing buyer
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, buyer_no, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Buyer ID is required' },
        { status: 400 }
      );
    }

    // If buyer_no is being updated, check for duplicates
    if (buyer_no) {
      const { data: existing } = await supabaseAdmin
        .from('buyers')
        .select('id')
        .eq('buyer_no', buyer_no)
        .neq('id', id) // Exclude current buyer
        .limit(1);

      if (existing && existing.length > 0) {
        return NextResponse.json(
          { error: 'Buyer number already exists' },
          { status: 400 }
        );
      }
      updates.buyer_no = buyer_no;
    }

    const { data, error } = await supabaseAdmin
      .from('buyers')
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
    console.error('Error updating buyer:', error);
    return NextResponse.json(
      { error: 'Failed to update buyer' },
      { status: 500 }
    );
  }
}

// Delete a buyer
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Buyer ID is required' },
        { status: 400 }
      );
    }

    // Check if there are any orders linked to this buyer
    const { data: linkedOrders, error: checkError } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('buyer_id', id)
      .limit(1);

    if (checkError) {
      return NextResponse.json(
        { error: 'Failed to check for linked orders' },
        { status: 500 }
      );
    }

    if (linkedOrders && linkedOrders.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete buyer with linked orders' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('buyers')
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
    console.error('Error deleting buyer:', error);
    return NextResponse.json(
      { error: 'Failed to delete buyer' },
      { status: 500 }
    );
  }
}
