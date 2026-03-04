import { createClient } from "@supabase/supabase-js"

// Leser Supabase-konfig fra Vite-miljøvariabler.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Feiler tidlig hvis miljøvariabler mangler, så det er lett å feilsøke.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Mangler Supabase config. Sett VITE_SUPABASE_URL og VITE_SUPABASE_ANON_KEY i .env.local"
  )
}

// Gjenbrukbar klient for alle Supabase-kall i appen.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
