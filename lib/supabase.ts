import { createClient } from "@supabase/supabase-js";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mxlqovhgqaemythgodbz.supabase.co";

const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_swp5i-6iKaWAXG-sSZNjSg_gFmfjC1x";

export const supabase = createClient(url, key);