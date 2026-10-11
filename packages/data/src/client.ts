import { createClient } from "@supabase/supabase-js";

/**
 * One Supabase client per app. The URL and publishable key are public by design;
 * what protects the data is Row Level Security in Postgres (see supabase/migrations).
 * Fallbacks keep a fresh clone working; Cloudflare's variables override them.
 */
const url = import.meta.env.VITE_SUPABASE_URL ?? "https://yccrnabjqjwyqwiwklup.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_tO4aaZ9oh97xcxIpB84msw_7pu30h89";

export const supabase = createClient(url, key, {
  auth: {
    // Only the vault signs in; on the public sites these settings are simply unused.
    persistSession: true,
    autoRefreshToken: true,
  },
});
