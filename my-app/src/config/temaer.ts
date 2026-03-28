/*
 * ═══════════════════════════════════════════════════════════════════════════
 * TEMAKONFIGURASJON — src/config/temaer.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her defineres alle tematiske kategorier appen bruker for å sortere
 * stortingssaker. Denne filen er "sannheten" om hvilke temaer som finnes.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK LEGGER DU TIL ET NYTT TEMA:
 * ──────────────────────────────────────────────────────────────────────────
 *   1. Legg til nøkkelordet i TemaKey-typen i src/types/sak.ts
 *      Eksempel: | "forsvar"
 *
 *   2. Legg til en ny blokk i TEMA_KONFIG her nedenfor.
 *      Kopier f.eks. "distrikt"-blokken og tilpass.
 *
 *   3. AI-kategoriseringen (categorizationEngine.ts) plukker opp
 *      nøkkelordene automatisk — ingen endringer nødvendig der.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK FJERNER DU ET TEMA:
 * ──────────────────────────────────────────────────────────────────────────
 *   1. Fjern blokken fra TEMA_KONFIG her
 *   2. Fjern nøkkelen fra TemaKey i src/types/sak.ts
 *   3. Søk etter bruk av tema-nøkkelen i resten av appen og rydd opp
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK ENDRER DU NØKKELORD FOR KATEGORISERING:
 * ──────────────────────────────────────────────────────────────────────────
 *   Legg til/fjern ord i `nøkkelord`-listen for det aktuelle temaet.
 *   Bruk norske ord i lavcase. Fuzzy matching håndterer bøyningsformer.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { TemaKey } from "../types/sak"

// ── Temadefinisjon-type ───────────────────────────────────────────────────────

export type TemaDef = {
  /** Ikon som vises i UI (emoji eller SVG-streng) */
  ikon: string
  /** Visningsnavn på norsk */
  navn: string
  /** Visningsnavn på engelsk */
  navnEn: string
  /** CSS-gradientstreng for bakgrunn i mosaikk/fliselayout */
  farge: string
  /** Ren aksent-farge (hex) for streker og tall */
  aksentFarge: string
  /**
   * Nøkkelord brukt til AI-kategorisering.
   * Skriv norske ord i lavcase — fuzzy matching tar seg av bøyning.
   * Fler nøkkelord = bedre treff, men pass på overlapp med andre temaer.
   */
  nøkkelord: string[]
}

// ── Alle temaer ───────────────────────────────────────────────────────────────

export const TEMA_KONFIG: Record<TemaKey, TemaDef> = {

  // ── Klima og miljø ──────────────────────────────────────────────────────────
  klima: {
    ikon: "🌿",
    navn: "Klima og miljø",
    navnEn: "Climate & environment",
    farge: "linear-gradient(135deg, #16a34a, #14532d)",
    aksentFarge: "#16a34a",
    nøkkelord: [
      "klima", "miljø", "utslipp", "co2", "natur", "skog",
      "forurensing", "bærekraft", "grønn", "fossil", "fornybar",
      "biodiversitet", "naturvern", "energiomstilling", "klimamål",
    ],
  },

  // ── Helse og omsorg ─────────────────────────────────────────────────────────
  helse: {
    ikon: "❤️",
    navn: "Helse og omsorg",
    navnEn: "Health & care",
    farge: "linear-gradient(135deg, #e11d48, #881337)",
    aksentFarge: "#e11d48",
    nøkkelord: [
      "helse", "sykehus", "legemiddel", "fastlege", "psykisk",
      "omsorg", "medisin", "helsetjeneste", "sykdom", "behandling",
      "lege", "sykepleier", "pasient", "eldrehelse", "rus",
    ],
  },

  // ── Utdanning ───────────────────────────────────────────────────────────────
  utdanning: {
    ikon: "📚",
    navn: "Utdanning",
    navnEn: "Education",
    farge: "linear-gradient(135deg, #2563eb, #1e3a8a)",
    aksentFarge: "#2563eb",
    nøkkelord: [
      "utdanning", "skole", "barnehage", "universitet", "høyskole",
      "forskning", "studenter", "lærer", "elev", "opplæring",
      "fagskole", "lærested", "pensum", "eksamensordning",
    ],
  },

  // ── Økonomi og arbeid ───────────────────────────────────────────────────────
  økonomi: {
    ikon: "💼",
    navn: "Økonomi og arbeid",
    navnEn: "Economy & labour",
    farge: "linear-gradient(135deg, #d97706, #78350f)",
    aksentFarge: "#d97706",
    nøkkelord: [
      "økonomi", "skatt", "avgift", "budsjett", "arbeid", "næring",
      "trygd", "pensjon", "nav", "sysselsetting", "rente", "inflasjon",
      "lønn", "bevilgning", "statsbudsjett", "finanspolitikk",
    ],
  },

  // ── Samferdsel ──────────────────────────────────────────────────────────────
  samferdsel: {
    ikon: "🚌",
    navn: "Samferdsel",
    navnEn: "Transport",
    farge: "linear-gradient(135deg, #7c3aed, #4c1d95)",
    aksentFarge: "#7c3aed",
    nøkkelord: [
      "samferdsel", "vei", "jernbane", "tog", "buss", "kollektiv",
      "ferje", "bro", "tunnel", "transport", "trafikk", "infrastruktur",
      "sykkel", "luftfart", "havn",
    ],
  },

  // ── Justis og rettsvesen ────────────────────────────────────────────────────
  justis: {
    ikon: "⚖️",
    navn: "Justis og rettsvesen",
    navnEn: "Justice & law",
    farge: "linear-gradient(135deg, #0891b2, #164e63)",
    aksentFarge: "#0891b2",
    nøkkelord: [
      "justis", "politi", "domstol", "kriminalitet", "rettsvesen",
      "fengsel", "lovgivning", "straff", "lov", "rett",
      "påtalemyndighet", "juridisk", "rettsstat", "sivil",
    ],
  },

  // ── Distrikt og landbruk ────────────────────────────────────────────────────
  distrikt: {
    ikon: "🏔️",
    navn: "Distrikt og landbruk",
    navnEn: "Rural & agriculture",
    farge: "linear-gradient(135deg, #65a30d, #3f6212)",
    aksentFarge: "#65a30d",
    nøkkelord: [
      "distrikt", "landbruk", "fiskeri", "bygd", "kommune",
      "regional", "rural", "jordbruk", "havbruk", "matproduksjon",
      "kystsamfunn", "spredt bosetting",
    ],
  },

  /*
   * ── Mal for nytt tema ─────────────────────────────────────────────────────
   * Lim inn og fyll ut for å legge til et nytt tema:
   *
   * forsvar: {
   *   ikon: "🛡️",
   *   navn: "Forsvar og beredskap",
   *   navnEn: "Defence & preparedness",
   *   farge: "linear-gradient(135deg, #374151, #111827)",
   *   aksentFarge: "#374151",
   *   nøkkelord: [
   *     "forsvar", "nato", "militær", "beredskap", "sikkerhet",
   *     "heimevern", "forsvarets", "forsvarsbudsjett",
   *   ],
   * },
   * ─────────────────────────────────────────────────────────────────────────
   */
}

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

/** Henter alle gyldige tema-nøkler som liste. */
export function alleTemaer(): TemaKey[] {
  return Object.keys(TEMA_KONFIG) as TemaKey[]
}

/** Henter konfigurasjon for ett bestemt tema. */
export function hentTema(nøkkel: TemaKey): TemaDef {
  return TEMA_KONFIG[nøkkel]
}
