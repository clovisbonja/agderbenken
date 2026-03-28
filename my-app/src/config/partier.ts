/*
 * ═══════════════════════════════════════════════════════════════════════════
 * PARTIDATA — src/config/partier.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Denne filen inneholder all konfigurasjon for partiene som er representert
 * i Agderbenken på Stortinget. Endre kun denne filen for å oppdatere
 * parti-informasjon i hele appen.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK LEGGER DU TIL ET NYTT PARTI:
 * ──────────────────────────────────────────────────────────────────────────
 *   1. Legg partiets logo i /public/logo-images/<filnavn>.png eller .svg
 *   2. Kopier mal-blokken nederst i denne filen
 *   3. Fyll inn riktig informasjon i alle felt
 *   4. Lagre — partiet vises automatisk i Parti-siden og andre steder
 *
 * SLIK FJERNER DU ET PARTI:
 *   1. Slett partiobjektet fra AGDER_PARTIER-listen nedenfor
 *   2. Eventuelt slett logofilen fra /public/logo-images/
 *
 * SLIK OPPDATERER DU PARTIPROGRAM:
 *   1. Finn partiet i listen
 *   2. Oppdater `partiprogram`-feltet med ny URL
 *   3. Oppdater `programPeriode` hvis perioden har endret seg
 *   Sett `partiprogram: null` hvis programmet ikke er tilgjengelig ennå.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Parti-type ────────────────────────────────────────────────────────────────

export type Parti = {
  /** Fullt offisielt partinavn */
  navn: string
  /** Offisiell forkortelse, f.eks. "Ap", "H", "FrP" */
  forkortelse: string
  /** Partiets primærfarge i hex — brukes til UI-farging */
  farge: string
  /** Sti til logofil fra /public, f.eks. "/logo-images/aplogo.png" */
  logo: string
  /** URL til partiets offisielle nettside */
  nettside: string
  /**
   * URL til gjeldende partiprogram (PDF-lenke eller nettside).
   * Sett til null hvis programmet ikke er offentlig tilgjengelig.
   */
  partiprogram: string | null
  /**
   * Hvilken periode programmet gjelder for, f.eks. "2025–2029".
   * Sett til null hvis perioden er ukjent.
   */
  programPeriode: string | null
  /**
   * Stortingets interne parti-ID.
   * Brukes til å hente API-data for partiets representanter og stemmer.
   * Finn IDs på: https://data.stortinget.no/eksport/partier
   */
  stortingetId?: string
}

// ── Agderbenkens partier ──────────────────────────────────────────────────────

/**
 * Alle partier med representanter fra Agder på Stortinget.
 * Rekkefølgen her bestemmer visningsrekkefølgen i appen.
 */
export const AGDER_PARTIER: Parti[] = [

  // ── Arbeiderpartiet ─────────────────────────────────────────────────────────
  {
    navn: "Arbeiderpartiet",
    forkortelse: "Ap",
    farge: "#E30613",
    logo: "/logo-images/aplogo.png",
    nettside: "https://www.arbeiderpartiet.no",
    partiprogram: "https://www.arbeiderpartiet.no/politikken/partiprogram/",
    programPeriode: "2025–2029",
    stortingetId: "A",
  },

  // ── Høyre ───────────────────────────────────────────────────────────────────
  {
    navn: "Høyre",
    forkortelse: "H",
    farge: "#2A6ABC",
    logo: "/logo-images/Hlogo.png",
    nettside: "https://hoyre.no",
    partiprogram: "https://hoyre.no/politikk/partiprogram/",
    programPeriode: "2025–2029",
    stortingetId: "H",
  },

  // ── Fremskrittspartiet ──────────────────────────────────────────────────────
  {
    navn: "Fremskrittspartiet",
    forkortelse: "FrP",
    farge: "#003F7F",
    logo: "/logo-images/frplogo.png",
    nettside: "https://www.frp.no",
    partiprogram: "https://www.frp.no/files/Program/2025/Program-2025-2029.pdf",
    programPeriode: "2025–2029",
    stortingetId: "FrP",
  },

  // ── Senterpartiet ───────────────────────────────────────────────────────────
  {
    navn: "Senterpartiet",
    forkortelse: "Sp",
    farge: "#00693E",
    logo: "/logo-images/splogo.png",
    nettside: "https://www.senterpartiet.no",
    partiprogram: "https://www.senterpartiet.no/politikk/program-uttaler/",
    programPeriode: "2025–2029",
    stortingetId: "Sp",
  },

  // ── Sosialistisk Venstreparti ───────────────────────────────────────────────
  {
    navn: "Sosialistisk Venstreparti",
    forkortelse: "SV",
    farge: "#CC0000",
    logo: "/logo-images/svlogo.png",
    nettside: "https://www.sv.no",
    partiprogram: "https://www.sv.no/partiet/program/",
    programPeriode: "2025–2029",
    stortingetId: "SV",
  },

  // ── Venstre ─────────────────────────────────────────────────────────────────
  {
    navn: "Venstre",
    forkortelse: "V",
    farge: "#00857B",
    logo: "/logo-images/venstre.png",
    nettside: "https://www.venstre.no",
    partiprogram: "https://www.venstre.no/politikk/partiprogram/",
    programPeriode: "2025–2029",
    stortingetId: "V",
  },

  // ── Kristelig Folkeparti ────────────────────────────────────────────────────
  {
    navn: "Kristelig Folkeparti",
    forkortelse: "KrF",
    farge: "#FEEF32",
    logo: "/logo-images/krflogobildet.png",
    nettside: "https://krf.no",
    partiprogram: "https://krf.no/politikk/politisk-program/",
    programPeriode: "2025–2029",
    stortingetId: "KrF",
  },

  // ── Rødt ────────────────────────────────────────────────────────────────────
  {
    navn: "Rødt",
    forkortelse: "R",
    farge: "#CC0000",
    logo: "/logo-images/roedt.svg",
    nettside: "https://roedt.no",
    partiprogram: "https://roedt.no/arbeidsprogram",
    programPeriode: "2025–2029",
    stortingetId: "R",
  },

  // ── Miljøpartiet De Grønne ──────────────────────────────────────────────────
  {
    navn: "Miljøpartiet De Grønne",
    forkortelse: "MDG",
    farge: "#377E00",
    logo: "/logo-images/mdglogo.png",
    nettside: "https://mdg.no",
    partiprogram: "https://mdg.no/politikk/",
    programPeriode: "2025–2029",
    stortingetId: "MDG",
  },

  /*
   * ── Mal: Slik legger du til nytt parti ───────────────────────────────────
   * Kopier blokken under, fjern kommentar-tegnene og fyll inn:
   *
   * {
   *   navn: "Partiets fulle navn",
   *   forkortelse: "XX",
   *   farge: "#HEXFARGE",
   *   logo: "/logo-images/filnavn.png",
   *   nettside: "https://partiet.no",
   *   partiprogram: "https://partiet.no/program",   // eller null
   *   programPeriode: "2025–2029",                  // eller null
   *   stortingetId: "XX",                           // fra Stortingets API
   * },
   * ─────────────────────────────────────────────────────────────────────────
   */
]

// ── Hjelpefunksjoner ─────────────────────────────────────────────────────────

/** Henter et parti basert på forkortelse, f.eks. "Ap". Returnerer undefined hvis ikke funnet. */
export function hentParti(forkortelse: string): Parti | undefined {
  return AGDER_PARTIER.find(
    (p) => p.forkortelse.toLowerCase() === forkortelse.toLowerCase()
  )
}

/** Returnerer true hvis et parti har partiprogram tilgjengelig. */
export function harPartiprogram(parti: Parti): boolean {
  return parti.partiprogram !== null
}
