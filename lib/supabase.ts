import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
export interface Event {
  id: string;
  slug: string;
  host_name: string;
  guest_name: string;
  reveal_unlocked: boolean;
  created_at: string;
}

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  joined_at: string;
}

export interface Memory {
  id: string;
  event_id: string;
  participant_id: string;
  participant_name: string;
  type: 'photo' | 'video';
  storage_url: string;
  whisper_message: string | null;
  created_at: string;
}
