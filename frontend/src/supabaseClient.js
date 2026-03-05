// supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vlbypddrxgqzwmcdoxvp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYnlwZGRyeGdxendtY2RveHZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNjc0NDQsImV4cCI6MjA4Njg0MzQ0NH0.ilbUty7F8Hpx0b8sbar0SuB8xLOM8wyCKrZu0BCyTME';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);