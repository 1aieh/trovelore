// src/lib/db-migrations.ts
import { supabaseAdmin } from './supabaseClient';

/**
 * This file contains functions to apply database schema improvements
 * without requiring a full migration system yet.
 * 
 * These functions add missing columns, indexes, and constraints to the
 * existing Supabase tables to match the Prisma schema design.
 */

export async function applyDatabaseImprovements() {
  console.log('Starting database schema improvements...');
  
  try {
    // Add missing columns to orders table
    await addMissingColumnsToOrders();
    
    // Add missing columns to buyers table
    await addMissingColumnsToBuyers();
    
    // Add missing columns to blocks table
    await addMissingColumnsToBlocks();
    
    // Create email_notifications table if it doesn't exist
    await createEmailNotificationsTable();
    
    // Create users table if it doesn't exist
    await createUsersTable();
    
    console.log('Database schema improvements completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error applying database improvements:', error);
    return { success: false, error: (error as Error).message };
  }
}

async function addMissingColumnsToOrders() {
  const { error: checkError } = await supabaseAdmin!.rpc('check_column_exists', {
    table_name: 'orders',
    column_name: 'last_updated'
  });
  
  // If the column doesn't exist (error), add it
  if (checkError) {
    console.log('Adding missing columns to orders table...');
    
    // Add last_updated column with default now()
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'last_updated',
      column_type: 'timestamp with time zone',
      column_default: 'now()'
    });
    
    // Add notes column
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'notes',
      column_type: 'text',
      column_default: 'NULL'
    });
    
    // Add email notification tracking columns
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'deposit_reminder_sent',
      column_type: 'timestamp with time zone',
      column_default: 'NULL'
    });
    
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'payment_confirmation_sent',
      column_type: 'timestamp with time zone',
      column_default: 'NULL'
    });
    
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'shipping_notification_sent',
      column_type: 'timestamp with time zone',
      column_default: 'NULL'
    });
    
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'orders',
      column_name: 'email',
      column_type: 'text',
      column_default: 'NULL'
    });
    
    // Add missing indexes
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'orders',
      index_name: 'orders_shopify_id_idx',
      column_name: 'shopify_id'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'orders',
      index_name: 'orders_payment_status_idx',
      column_name: 'payment_status'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'orders',
      index_name: 'orders_ship_status_idx',
      column_name: 'ship_status'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'orders',
      index_name: 'orders_order_date_idx',
      column_name: 'order_date'
    });
  } else {
    console.log('Orders table already has the required columns');
  }
}

async function addMissingColumnsToBuyers() {
  const { error: checkError } = await supabaseAdmin!.rpc('check_column_exists', {
    table_name: 'buyers',
    column_name: 'last_updated'
  });
  
  // If the column doesn't exist (error), add it
  if (checkError) {
    console.log('Adding missing columns to buyers table...');
    
    // Add last_updated column with default now()
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'buyers',
      column_name: 'last_updated',
      column_type: 'timestamp with time zone',
      column_default: 'now()'
    });
    
    // Add notes column
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'buyers',
      column_name: 'notes',
      column_type: 'text',
      column_default: 'NULL'
    });
    
    // Add missing indexes
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'buyers',
      index_name: 'buyers_name_idx',
      column_name: 'name'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'buyers',
      index_name: 'buyers_buyer_no_idx',
      column_name: 'buyer_no'
    });
  } else {
    console.log('Buyers table already has the required columns');
  }
}

async function addMissingColumnsToBlocks() {
  const { error: checkError } = await supabaseAdmin!.rpc('check_column_exists', {
    table_name: 'blocks',
    column_name: 'last_updated'
  });
  
  // If the column doesn't exist (error), add it
  if (checkError) {
    console.log('Adding missing columns to blocks table...');
    
    // Add last_updated column with default now()
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'blocks',
      column_name: 'last_updated',
      column_type: 'timestamp with time zone',
      column_default: 'now()'
    });
    
    // Add notes column
    await supabaseAdmin!.rpc('add_column_if_not_exists', {
      table_name: 'blocks',
      column_name: 'notes',
      column_type: 'text',
      column_default: 'NULL'
    });
    
    // Add missing indexes
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'blocks',
      index_name: 'blocks_ship_month_idx',
      column_name: 'ship_month'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'blocks',
      index_name: 'blocks_ship_status_idx',
      column_name: 'ship_status'
    });
  } else {
    console.log('Blocks table already has the required columns');
  }
}

async function createEmailNotificationsTable() {
  // Check if table exists
  const { data, error } = await supabaseAdmin!.from('email_notifications').select('id').limit(1);
  
  if (error && error.code === '42P01') { // Table doesn't exist
    console.log('Creating email_notifications table...');
    
    // Create the table
    await supabaseAdmin!.rpc('create_table_if_not_exists', {
      table_name: 'email_notifications',
      table_definition: `
        id bigint generated by default as identity primary key,
        created_at timestamp with time zone not null default now(),
        order_ref text,
        order_id bigint,
        email_type text not null,
        recipient text not null,
        subject text not null,
        body text not null,
        status text not null,
        sent_at timestamp with time zone,
        error text
      `
    });
    
    // Create indexes
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'email_notifications',
      index_name: 'email_notifications_order_ref_idx',
      column_name: 'order_ref'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'email_notifications',
      index_name: 'email_notifications_order_id_idx',
      column_name: 'order_id'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'email_notifications',
      index_name: 'email_notifications_email_type_idx',
      column_name: 'email_type'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'email_notifications',
      index_name: 'email_notifications_status_idx',
      column_name: 'status'
    });
  } else {
    console.log('Email notifications table already exists');
  }
}

async function createUsersTable() {
  // Check if table exists
  const { data, error } = await supabaseAdmin!.from('users').select('id').limit(1);
  
  if (error && error.code === '42P01') { // Table doesn't exist
    console.log('Creating users table...');
    
    // Create the table
    await supabaseAdmin!.rpc('create_table_if_not_exists', {
      table_name: 'users',
      table_definition: `
        id bigint generated by default as identity primary key,
        created_at timestamp with time zone not null default now(),
        email text not null unique,
        name text,
        role text not null,
        last_login timestamp with time zone
      `
    });
    
    // Create indexes
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'users',
      index_name: 'users_email_idx',
      column_name: 'email'
    });
    
    await supabaseAdmin!.rpc('create_index_if_not_exists', {
      table_name: 'users',
      index_name: 'users_role_idx',
      column_name: 'role'
    });
  } else {
    console.log('Users table already exists');
  }
}
