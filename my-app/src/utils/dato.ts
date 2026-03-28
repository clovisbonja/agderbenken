/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DATOHJELPERE — src/utils/dato.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hjelpefunksjoner for datoformatering og -konvertering.
 * Alle funksjoner støtter både norsk ("no-NO") og engelsk ("en-GB") lokale.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { MånedsTrend } from "../types/sak"

// ── Formatering ───────────────────────────────────────────────────────────────

/**
 * Konverterer en ISO-datostreng til lokalisert visningsdato.
 * Returnerer originalverdien hvis datoen er ugyldig.
 *
 * Eksempel: formaterDato("2024-11-15", "no") → "15.11.2024"
 */
export function formaterDato(verdi: string, språk: "no" | "en"): string {
  if (!verdi) return "—"
  const dato = new Date(verdi)
  if (Number.isNaN(dato.getTime())) return verdi
  return dato.toLocaleDateString(
    språk === "no" ? "no-NO" : "en-GB"
  )
}

/**
 * Konverterer "YYYY-MM" til kortform for et månedsnavn.
 * Eksempel: "2024-11" + "no" → "nov."
 */
export function månedKortform(månedStreng: string, språk: "no" | "en"): string {
  const [år, måned] = månedStreng.split("-")
  if (!år || !måned) return månedStreng
  const dato = new Date(`${år}-${måned}-01T00:00:00`)
  if (Number.isNaN(dato.getTime())) return månedStreng
  return dato.toLocaleDateString(
    språk === "no" ? "nb-NO" : "en-GB",
    { month: "short" }
  )
}

/**
 * Formaterer et klokkeslett (Date-objekt) til HH:MM.
 * Eksempel: formaterKlokkeslett(new Date(), "no") → "14:32"
 */
export function formaterKlokkeslett(dato: Date | null, språk: "no" | "en"): string {
  if (!dato) return "—"
  return dato.toLocaleTimeString(
    språk === "no" ? "no-NO" : "en-GB",
    { hour: "2-digit", minute: "2-digit" }
  )
}

// ── Sortering og gruppering ───────────────────────────────────────────────────

/**
 * Konverterer en datostreng til en sorterbar tallverdi.
 * Brukes til å sortere lister av saker etter dato (nyeste først).
 * Returnerer 0 for ugyldige datoer.
 */
export function datoSorteringsverdi(datoStreng: string): number {
  if (!datoStreng) return 0
  const tid = new Date(datoStreng).getTime()
  return Number.isNaN(tid) ? 0 : tid
}

/**
 * Grupperer saker etter måned og returnerer en aktivitetstrend.
 * Brukes i det månedlige bar-chartetet i statistikk-dashboardet.
 *
 * Input: Liste med saker som har en `dato`-egenskap (ISO-format)
 * Output: Sortert liste med {måned, antall} — maks 8 siste måneder
 */
export function beregnMånedsTrend(
  saker: Array<{ dato: string }>,
  maksAntallMåneder = 8
): MånedsTrend[] {
  const månedMap = new Map<string, number>()

  saker.forEach((sak) => {
    if (!sak.dato) return
    // Ta kun "YYYY-MM"-delen av ISO-datostrengen
    const månedNøkkel = sak.dato.slice(0, 7)
    månedMap.set(månedNøkkel, (månedMap.get(månedNøkkel) ?? 0) + 1)
  })

  return Array.from(månedMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-maksAntallMåneder)
    .map(([måned, antall]) => ({ måned, antall }))
}
