// supabaseClient.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_KEY as string;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY as string; // Add this line to

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Validate environment variables
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// Create a Supabase client with service role key for server-side operations
// This has higher privileges and should only be used in API routes
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl || '', supabaseServiceKey)
  : supabase; // Fallback to regular client if service key not available