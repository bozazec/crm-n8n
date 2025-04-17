// src/types/index.ts

// Define Contact type based on Supabase table
export interface Contact {
    id: string;
    user_id: string; // Added user_id as it's likely needed elsewhere
    name: string;
    email: string;
    company?: string | null;
    status?: string | null;
    source?: string | null;
    tags?: string[] | null;
    notes?: string | null;
    created_at: string;
    updated_at: string; // Added updated_at
  }

// Define Webhook type based on Supabase table
export interface Webhook {
  id: string;
  user_id: string;
  event_trigger: string;
  url: string;
  description?: string | null;
  created_at: string;
}

// Define ActivityLog type based on Supabase table
export interface ActivityLog {
  id: string;
  user_id: string;
  contact_id: string;
  action: string;
  description?: string | null;
  created_at: string;
  reminder_at?: string | null; // Add optional reminder timestamp
}

// Add other shared types here as needed 