import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

const isSecretKeyMisused = supabasePublishableKey.startsWith('sb_secret_');

export const isSupabaseEnabled = Boolean(
  supabaseUrl && supabasePublishableKey && !isSecretKeyMisused,
);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(supabaseUrl, supabasePublishableKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;
