import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = 'https://wwbmgdrsxqsmlvpxzqrx.supabase.co';
const supabaseKey = 'eyJh...your_full_anon_key_here...';
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
