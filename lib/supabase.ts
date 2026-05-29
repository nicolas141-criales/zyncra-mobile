import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = "https://bwmwuzwhinnzkjicdzot.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rFXMDRiyZSGrL6oaH2uH5g_-n2y-CqI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
