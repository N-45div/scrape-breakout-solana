import { createClient } from "@supabase/supabase-js";

// Replace with your Supabase URL and Anon Key
const SUPABASE_URL = "https://ceeitbbaooocsrhtmcsk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlZWl0YmJhb29vY3NyaHRtY3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2ODEwOTYsImV4cCI6MjA2MjI1NzA5Nn0.8qOj5QLLGu46Tz3qurSjMBTyUmkH5V8YzvQZtM01bMc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true, // Persist session in Chrome extension
  },
});