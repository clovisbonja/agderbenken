/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SUPABASE-KLIENT — src/lib/supabase.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Oppretter en delt Supabase-klient basert på miljøvariabler.
 *
 * Brukes kun i Parti.tsx for valgløfte-funksjonalitet.
 * Resten av appen bruker Stortingets åpne API og trenger ikke Supabase.
 *
 * ── OPPSETT FOR UTVIKLERE ─────────────────────────────────────────────────
 *
 * Kopier .env.example til .env.local og fyll inn verdiene:
 *
 *   cp .env.example .env.local
 *
 * Verdiene finner du i Supabase-dashbordet under:
 *   Project Settings → API → Project URL og anon public key
 *
 * ── UTEN SUPABASE ─────────────────────────────────────────────────────────
 *
 * Hvis variablene mangler returneres null i stedet for å krasje.
 * Appen fungerer fullt ut — kun valgløfte-fanen i Parti er utilgjengelig.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL     as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Returner null i stedet for å krasje — komponenter håndterer null selv.
// Dette gjør at gruppemedlemmer uten .env.local kan kjøre appen uten problemer.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

/** True hvis Supabase er konfigurert og tilgjengelig */
export const supabaseKonfigurert = supabase !== null
