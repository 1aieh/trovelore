// testSupabaseFetch.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { supabase } from './supabaseClient';

async function fetchOrders() {
  try {
    // Fetch all records from the orders table
    const { data, error } = await supabase
      .from('orders')
      .select('*');
    
    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    
    console.log('Successfully fetched orders:');
    console.log(data);
    console.log(`Total orders: ${data?.length || 0}`);
    
    return data;
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Execute the function
fetchOrders();

// You can also export the function to use it elsewhere
export { fetchOrders };