import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? '';
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ?? '';

const isSecretKeyMisused = supabasePublishableKey.startsWith('sb_secret_');
const hasValidUrl = /^https?:\/\/.+/.test(supabaseUrl);

if (isSecretKeyMisused) {
  console.error(
    '[Supabase] Clé secrète (sb_secret_*) détectée côté navigateur et bloquée pour des raisons de sécurité. Utilisez uniquement VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_*).',
  );
} else if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Supabase] Variables VITE_SUPABASE_URL ou VITE_SUPABASE_PUBLISHABLE_KEY absentes au moment du build. Mode serveur local (/api) utilisé.',
  );
} else if (!hasValidUrl) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL invalide (doit commencer par https://).',
  );
}

export const isSupabaseEnabled = Boolean(
  hasValidUrl && supabasePublishableKey && !isSecretKeyMisused,
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
