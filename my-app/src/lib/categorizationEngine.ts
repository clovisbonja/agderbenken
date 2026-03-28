/*
 * ═══════════════════════════════════════════════════════════════════════════
 * KATEGORISERINGSMOTOR — src/lib/categorizationEngine.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * AI-basert (fuzzy) tekstklassifisering av stortingssaker til temaer.
 * Bruker nøkkelord fra src/config/temaer.ts til å finne riktig tema.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK FUNGERER KATEGORISERINGEN:
 * ──────────────────────────────────────────────────────────────────────────
 *   1. For hver sak slår vi sammen tittel + kortittel + komité til én tekst
 *   2. Hvert tema i TEMA_KONFIG har en liste med nøkkelord
 *   3. Vi beregner en fuzzy-match-score for hvert nøkkelord mot teksten
 *   4. Temaet med høyest total score vinner og saken plasseres der
 *
 * ──────────────────────────────────────────────────────────────────────────
 * FOR Å ENDRE TEMAER ELLER NØKKELORD:
 * ──────────────────────────────────────────────────────────────────────────
 *   → Rediger src/config/temaer.ts
 *   Denne filen trenger ikke endres.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TemaKey, CaseItem } from "../types/sak"
import { TEMA_KONFIG } from "../config/temaer"

// ── Intern hjelpefunksjon ─────────────────────────────────────────────────────

/** Gjør om streng til lavcase og sikrer at den aldri er null/undefined. */
function sikkerTekst(input: string | undefined | null): string {
  return String(input ?? "").toLowerCase()
}

// ── Fuzzy-matching ────────────────────────────────────────────────────────────

/**
 * Beregner likhet mellom to strenger med Levenshtein-distanse.
 * Returnerer en verdi mellom 0 (ingen likhet) og 1 (identiske).
 */
export function levenshteinDistance(str1: string, str2: string): number {
  if (!str1 && !str2) return 1
  if (!str1 || !str2) return 0

  const matrise: number[][] = []
  for (let i = 0; i <= str2.length; i += 1) matrise[i] = [i]
  for (let j = 0; j <= str1.length; j += 1) matrise[0][j] = j

  for (let i = 1; i <= str2.length; i += 1) {
    for (let j = 1; j <= str1.length; j += 1) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrise[i][j] = matrise[i - 1][j - 1]
      } else {
        matrise[i][j] = Math.min(
          matrise[i - 1][j - 1] + 1,
          matrise[i][j - 1] + 1,
          matrise[i - 1][j] + 1
        )
      }
    }
  }

  const maksLengde = Math.max(str1.length, str2.length)
  if (maksLengde === 0) return 1
  return 1 - matrise[str2.length][str1.length] / maksLengde
}

/**
 * Gir en match-score (0–100) for et nøkkelord mot en tekst.
 *   100 = direkte treff (nøkkelordet finnes i teksten)
 *    80 = nær fuzzy-match (>70 % Levenshtein-likhet)
 *    60 = treff på første 4 tegn
 *     0 = ingen match
 */
export function fuzzyMatch(tekst: string, nøkkelord: string): number {
  const t = sikkerTekst(tekst)
  const k = sikkerTekst(nøkkelord)
  if (!t || !k) return 0

  if (t.includes(k)) return 100
  if (levenshteinDistance(t, k) > 0.7) return 80
  if (k.length >= 4 && t.includes(k.slice(0, 4))) return 60
  return 0
}

// ── Kategorisering av saker ───────────────────────────────────────────────────

/**
 * Kategoriserer én stortingssak til det best-matchende temaet.
 * Returnerer temaet, score og hvilke nøkkelord som utløste treffet.
 */
export function categorizeSak(sak: CaseItem): {
  primary: TemaKey
  score: number
  matches: string[]
} {
  const fullTekst = `${sak.title} ${sak.shortTitle} ${sak.committee || ""}`

  // Initialiser score-register for alle temaer
  const poengsummer: Record<TemaKey, { score: number; matches: string[] }> = {
    klima:      { score: 0, matches: [] },
    helse:      { score: 0, matches: [] },
    utdanning:  { score: 0, matches: [] },
    økonomi:    { score: 0, matches: [] },
    samferdsel: { score: 0, matches: [] },
    justis:     { score: 0, matches: [] },
    distrikt:   { score: 0, matches: [] },
  }

  // Beregn score for hvert tema basert på nøkkelord fra TEMA_KONFIG
  ;(Object.entries(TEMA_KONFIG) as [TemaKey, typeof TEMA_KONFIG[TemaKey]][]).forEach(
    ([temaKey, temaDef]) => {
      temaDef.nøkkelord.forEach((nøkkelord) => {
        const treff = fuzzyMatch(fullTekst, nøkkelord)
        if (treff > 0) {
          poengsummer[temaKey].score += treff / temaDef.nøkkelord.length
          if (poengsummer[temaKey].matches.length < 3) {
            poengsummer[temaKey].matches.push(nøkkelord)
          }
        }
      })
      poengsummer[temaKey].score = Math.min(100, poengsummer[temaKey].score)
    }
  )

  // Finn temaet med høyest total score
  const sortert = (
    Object.entries(poengsummer) as [TemaKey, { score: number; matches: string[] }][]
  ).sort((a, b) => b[1].score - a[1].score)

  return {
    primary: sortert[0][0],
    score:   sortert[0][1].score,
    matches: sortert[0][1].matches,
  }
}

/**
 * Kategoriserer en liste saker og grupperer dem per tema.
 * Returnerer et objekt med tema-nøkkel → liste av saker.
 */
export function categorizeCases(saker: CaseItem[]): Record<TemaKey, CaseItem[]> {
  const kategorisert: Record<TemaKey, CaseItem[]> = {
    klima: [], helse: [], utdanning: [], økonomi: [],
    samferdsel: [], justis: [], distrikt: [],
  }

  saker.forEach((sak) => {
    const resultat = categorizeSak(sak)
    kategorisert[resultat.primary].push({
      ...sak,
      category: resultat.primary,
      score:    resultat.score,
      matches:  resultat.matches,
    })
  })

  // Sorter saker innen hvert tema etter score — høyest relevans øverst
  ;(Object.keys(kategorisert) as TemaKey[]).forEach((nøkkel) => {
    kategorisert[nøkkel].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  })

  return kategorisert
}

/**
 * Fritekst-søk i en liste med saker.
 * Bruker fuzzy-matching og returnerer treff sortert etter relevans.
 */
export function searchCases(saker: CaseItem[], søkeord: string): CaseItem[] {
  if (!søkeord || søkeord.trim().length === 0) return saker

  const term = søkeord.toLowerCase()
  const termDeler = term.split(/\s+/).filter(Boolean)

  return saker
    .map((sak) => {
      let relevans = 0
      const samlet = `${sak.shortTitle} ${sak.title} ${sak.committee} ${sak.status} ${sak.type} ${sak.id}`.toLowerCase()

      // Kortittel veier tyngst (× 3), fulltittel noe mindre (× 2)
      const kortTittelTreff = fuzzyMatch(sak.shortTitle, term)
      if (kortTittelTreff > 0) relevans += kortTittelTreff * 3

      const fullTittelTreff = fuzzyMatch(sak.title, term)
      if (fullTittelTreff > 0) relevans += fullTittelTreff * 2

      if (sak.committee?.toLowerCase().includes(term)) relevans += 50
      if (sak.id?.toLowerCase().includes(term))        relevans += 120
      if (sak.type?.toLowerCase().includes(term))      relevans += 40
      if (sak.status?.toLowerCase().includes(term))    relevans += 35
      if (termDeler.every((t) => samlet.includes(t)))  relevans += 70

      return { ...sak, relevanceScore: relevans }
    })
    .filter((resultat) => (resultat.relevanceScore ?? 0) > 0)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
}

// ── Tema-statistikk ───────────────────────────────────────────────────────────

/**
 * Beregner statusfordeling for saker innenfor ett bestemt tema.
 * Returnerer totalt antall og antall per status-nøkkel.
 */
export function getThemeStats(
  saker: CaseItem[],
  tema: TemaKey
): { total: number; statusCounts: Record<string, number> } {
  const temaSaker = saker.filter((s) => s.category === tema)

  const statusFordeling: Record<string, number> = {
    varslet: 0, behandlet: 0, til_behandling: 0,
    mottatt: 0, trukket:  0, bortfalt:       0, ukjent: 0,
  }

  temaSaker.forEach((s) => {
    const nøkkel = String(s.status || "ukjent")
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_")

    if (Object.prototype.hasOwnProperty.call(statusFordeling, nøkkel)) {
      statusFordeling[nøkkel] += 1
    } else {
      statusFordeling.ukjent += 1
    }
  })

  return { total: temaSaker.length, statusCounts: statusFordeling }
}

// ── Bakoverkompatible eksporter ───────────────────────────────────────────────
// Eldre kode som importerer ThemeKey/CaseItem herfra vil fortsette å fungere.

/** @deprecated Bruk TemaKey fra src/types/sak.ts direkte. */
export type { TemaKey as ThemeKey }

/** @deprecated Bruk CaseItem fra src/types/sak.ts direkte. */
export type { CaseItem }

/**
 * @deprecated Bruk TEMA_KONFIG fra src/config/temaer.ts direkte.
 * Returnerer tema-konfig i gammelt format for bakoverkompatibilitet.
 */
export function getAllThemes(): Record<
  TemaKey,
  { icon: string; name: string; color: string; accentColor: string; keywords: string[] }
> {
  return Object.fromEntries(
    Object.entries(TEMA_KONFIG).map(([key, def]) => [
      key,
      {
        icon:        def.ikon,
        name:        def.navn,
        color:       def.farge,
        accentColor: def.aksentFarge,
        keywords:    def.nøkkelord,
      },
    ])
  ) as Record<TemaKey, { icon: string; name: string; color: string; accentColor: string; keywords: string[] }>
}

/**
 * @deprecated Bruk hentTema() fra src/config/temaer.ts direkte.
 * Returnerer ett tema i gammelt format for bakoverkompatibilitet.
 */
export function getTheme(tema: TemaKey): {
  icon: string; name: string; color: string; accentColor: string; keywords: string[]
} {
  const def = TEMA_KONFIG[tema]
  return {
    icon:        def.ikon,
    name:        def.navn,
    color:       def.farge,
    accentColor: def.aksentFarge,
    keywords:    def.nøkkelord,
  }
}
