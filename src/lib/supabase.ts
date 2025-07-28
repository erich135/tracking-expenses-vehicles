import { createClient } from '@supabase/supabase-js';


// Initialize Supabase client
// Using direct values from project configuration
const supabaseUrl = 'https://wvbmgdrsxqsmlvpzxqrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2Ym1nZHJzeHFzbWx2cHp4cXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NjI3NzYsImV4cCI6MjA2ODEzODc3Nn0.hrSGvFWAcr6SUWmZzW7TjW9nqif90SORx3t2a8udgqg';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };