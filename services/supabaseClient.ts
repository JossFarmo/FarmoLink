import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fsagvxkwihqiscvjtjvz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzYWd2eGt3aWhxaXNjdmp0anZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NDE0ODQsImV4cCI6MjA4MTAxNzQ4NH0.ei8J3QJtZ1N2blgqAFM3U9_O3YjCalQV4YGu5hssk4A';

export const supabase = createClient(supabaseUrl, supabaseKey);