/*
 * ═══════════════════════════════════════════════════════════════════════════
 * SESJONSKONFIGURASJON — src/config/sesjon.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Stortinget opererer med sesjoner som løper fra høst til høst.
 * En sesjon starter i oktober og slutter i september neste år.
 * Eksempel: Sesjon 2024-2025 starter oktober 2024, slutter september 2025.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK ENDRER DU AKTIV SESJON MANUELT:
 * ──────────────────────────────────────────────────────────────────────────
 *   Sett TVUNGEN_SESJON til ønsket sesjon-ID, f.eks. "2023-2024".
 *   Sett tilbake til null for å bruke automatisk beregning.
 *
 * ══════════════════════════════════════════════════════════════════════════
 */

// ── Konfigurasjon ─────────────────────────────────────────────────────────────

/**
 * Sett denne til en sesjon-ID for å overstyre automatisk beregning.
 * Eksempel: "2023-2024"
 * Sett til null for å bruke beregnet aktiv sesjon.
 */
const TVUNGEN_SESJON: string | null = null

/**
 * Måneden (0-indeksert) sesjonen starter.
 * September = 8 (indeks 8 = måned nr. 9).
 * Stortingets sesjon starter i oktober, men ny sesjon-ID regnes fra september.
 */
const SESJON_STARTMÅNED = 9 // Oktober (0-indeksert)

// ── Funksjoner ────────────────────────────────────────────────────────────────

/**
 * Beregner nåværende aktiv sesjon-ID basert på dagens dato.
 *
 * Logikk:
 *   - Er vi i oktober (mnd ≥ 9) eller senere? Da er startåret dette året.
 *   - Er vi i januar–september? Da er startåret forrige år.
 * Returnerer f.eks. "2024-2025".
 */
export function beregnetAktivSesjon(): string {
  if (TVUNGEN_SESJON) return TVUNGEN_SESJON

  const nå = new Date()
  const startÅr =
    nå.getMonth() >= SESJON_STARTMÅNED
      ? nå.getFullYear()
      : nå.getFullYear() - 1

  return `${startÅr}-${startÅr + 1}`
}

/**
 * Konverterer en sesjon-ID til et lesbart visningsnavn.
 * Eksempel: "2024-2025" → "2024/25"
 */
export function sesjonVisningsnavn(sesjonId: string): string {
  const [start, slutt] = sesjonId.split("-")
  if (!start || !slutt) return sesjonId
  return `${start}/${slutt.slice(2)}`
}

/**
 * Lager URL til Stortingets API for saker i en bestemt sesjon.
 * Eksempel: beregnetAktivSesjon() → "https://data.stortinget.no/eksport/saker?sesjonid=2024-2025"
 */
export function sakerApiUrl(sesjonId: string): string {
  return `https://data.stortinget.no/eksport/saker?sesjonid=${sesjonId}`
}

/**
 * Lager URL til Stortingets API for voteringer i en bestemt sesjon.
 */
export function voteringerApiUrl(sesjonId: string): string {
  return `https://data.stortinget.no/eksport/voteringer?sesjonid=${sesjonId}`
}
