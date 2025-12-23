// File: src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
}

// 如果你有生成的 Database Definitions，可以在这里泛型传入，目前先用 any 或默认
export const supabase = createClient(supabaseUrl, supabaseKey);