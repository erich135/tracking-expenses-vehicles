import { createClient } from '@supabase/supabase-js';

// ✅ Paste your actual values here:
const supabaseUrl = 'https://wvbmdgrsxsqmlvpxzqrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6Ikp...'; // FULL anon key

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
