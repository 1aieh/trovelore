import { createClient } from '@supabase/supabase-js';
import { Order } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string;

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_KEY');
}

if (!supabaseServiceKey) {
  console.error('Missing SUPABASE_SERVICE_KEY for admin operations');
}

// Create a Supabase client with anonymous key for client-side operations
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: fetch.bind(globalThis),
  },
});

// Create a Supabase client with service role key for server-side operations
// This has higher privileges and should only be used in API routes
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl || '', supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
    })
  : null;

// Helper functions for common database operations

/**
 * Fetch orders with pagination and filtering
 */
export async function fetchOrders({
  page = 1,
  pageSize = 10,
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc'
}: {
  page?: number;
  pageSize?: number;
  filters?: Record<string, any>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  try {
    // Calculate pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Start building the query
    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' });

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else if (typeof value === 'object' && value.operator) {
          // Handle custom operators like gt, lt, etc.
          switch (value.operator) {
            case 'gt':
              query = query.gt(key, value.value);
              break;
            case 'lt':
              query = query.lt(key, value.value);
              break;
            case 'gte':
              query = query.gte(key, value.value);
              break;
            case 'lte':
              query = query.lte(key, value.value);
              break;
            case 'like':
              query = query.like(key, `%${value.value}%`);
              break;
            default:
              query = query.eq(key, value.value);
          }
        } else {
          query = query.eq(key, value);
        }
      }
    });

    // Apply sorting and pagination
    const { data, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(from, to);

    if (error) throw error;

    return {
      data: data || [],
      pagination: {
        page,
        pageSize,
        totalCount: count || 0,
        totalPages: count ? Math.ceil(count / pageSize) : 0,
      },
    };
  } catch (error) {
    console.error('Error fetching orders:', error);
    throw error;
  }
}

/**
 * Fetch a single order by ID
 */
export async function fetchOrderById(id: string | number) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error fetching order ${id}:`, error);
    throw error;
  }
}

/**
 * Fetch orders by block ID
 */
export async function fetchOrdersByBlockId(blockId: string | number) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('block_id', blockId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error(`Error fetching orders for block ${blockId}:`, error);
    throw error;
  }
}

/**
 * Fetch all blocks
 */
export async function fetchBlocks() {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('*')
      .order('ship_month', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching blocks:', error);
    throw error;
  }
}

/**
 * Fetch all buyers
 */
export async function fetchBuyers() {
  try {
    const { data, error } = await supabase
      .from('buyers')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching buyers:', error);
    throw error;
  }
}

/**
 * Create or update an order
 */
export async function upsertOrder(order: Partial<Order>) {
  try {
    if (order.id) {
      // Update existing order
      const { data, error } = await supabase
        .from('orders')
        .update(order)
        .eq('id', order.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Create new order
      const { data, error } = await supabase
        .from('orders')
        .insert(order)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Error upserting order:', error);
    throw error;
  }
}

/**
 * Update order payment information
 */
export async function updateOrderPayment(
  orderId: string | number,
  paymentData: {
    payment_status?: string;
    deposit_25?: number;
    payment_1?: number;
    date_p1?: string | Date;
    payment_2?: number;
    date_p2?: string | Date;
    payment_3?: number;
    date_p3?: string | Date;
    payment_4?: number;
    date_p4?: string | Date;
  }
) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(paymentData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating payment for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Update order shipping status
 */
export async function updateOrderShipping(
  orderId: string | number,
  shippingData: {
    ship_status?: string;
    ship_date?: string | Date;
    received?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update(shippingData)
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating shipping for order ${orderId}:`, error);
    throw error;
  }
}

/**
 * Assign order to a block
 */
export async function assignOrderToBlock(orderId: string | number, blockId: string | number | null) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ block_id: blockId })
      .eq('id', orderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error assigning order ${orderId} to block ${blockId}:`, error);
    throw error;
  }
}

/**
 * Create a new block
 */
export async function createBlock(blockData: { name: string; ship_month: string | Date; ship_status?: string }) {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .insert(blockData)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating block:', error);
    throw error;
  }
}

/**
 * Update block information
 */
export async function updateBlock(
  blockId: string | number,
  blockData: { name?: string; ship_month?: string | Date; ship_status?: string }
) {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .update(blockData)
      .eq('id', blockId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error(`Error updating block ${blockId}:`, error);
    throw error;
  }
}
