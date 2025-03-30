// supabaseClient.ts
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL as string;
const supabaseAnonKey = process.env.SUPABASE_KEY as string;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase ANON Key:', supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);