/*
 * ═══════════════════════════════════════════════════════════════════════════
 * FELLES TYPER FOR STORTINGSSAKER — src/types/sak.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Her samles alle TypeScript-typer som brukes på tvers av komponenter
 * og sider. Har du behov for en ny type? Legg den til her.
 *
 * DATAKILDER:
 *   Stortinget eksporterer XML via: https://data.stortinget.no/eksport/
 *   Relevante endepunkter:
 *     - /saker?sesjonid=2024-2025          ← alle saker i en sesjon
 *     - /saker?saksnummer=12345            ← én bestemt sak
 *     - /voteringer?sesjonid=2024-2025     ← alle voteringer
 *     - /voteringsresultat?voteringid=X    ← hvem stemte hva
 *     - /dagensrepresentanter              ← nåværende representanter
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Tema-nøkler ──────────────────────────────────────────────────────────────

/** Gyldige tema-kategorier. Legg til ny ThemeKey i temaer.ts for å utvide. */
export type TemaKey =
  | "klima"
  | "helse"
  | "utdanning"
  | "økonomi"
  | "samferdsel"
  | "justis"
  | "distrikt"

// ── Stortingssak ─────────────────────────────────────────────────────────────

/** En stortingssak slik den hentes fra Stortingets API og kategoriseres. */
export type Sak = {
  /** Unik ID fra Stortinget, f.eks. "12345" */
  id: string
  /** Fullstendig tittel på saken */
  tittel: string
  /** Kortere visningstittel */
  kortTittel: string
  /** Sakstype, f.eks. "Representantforslag", "Proposisjon" */
  type: string
  /**
   * Saksstatus fra Stortinget.
   * Vanlige verdier: "behandlet", "til_behandling", "mottatt"
   * Se utils/status.ts for normalisering og visning.
   */
  status: string
  /** Dato i ISO-format, f.eks. "2024-11-15" */
  dato: string
  /** Komité som behandler saken, f.eks. "Helse- og omsorgskomiteen" */
  komite: string
  /** Tildelt tema-kategori etter kategorisering */
  tema?: TemaKey
  /** Kategoriseringsscore (0–100) — høyere = bedre treff */
  score?: number
  /** Nøkkelord som trigget kategoriseringen */
  treff?: string[]
  /** Søkerelevans-score — brukes kun under søk */
  søkeScore?: number
}

// ── Votering ─────────────────────────────────────────────────────────────────

/** Resultat av én votering i Stortinget. */
export type Votering = {
  id: string
  sakId: string
  vedtatt: boolean
  /** Resultat-type fra API, f.eks. "enstemmig_vedtatt" */
  resultatType: string
  /** Lesbar resultat-tekst */
  resultatTekst: string
  tema: string
  tid: string
  antallFor: number
  antallMot: number
  antallIkkeTilStede: number
  personligVotering: boolean
}

/** Én representants stemme i en votering. */
export type RepresentantStemme = {
  representantId: string
  navn: string
  parti: string
  stemme: "for" | "mot" | "ikke_tilstede" | "absent"
}

// ── Statusfordeling ───────────────────────────────────────────────────────────

/**
 * Fordeling av saksstatus — brukes i statistikk-dashboardet.
 * Nøklene matcher normaliserte statusverdier fra utils/status.ts.
 */
export type StatusFordeling = {
  behandlet: number
  til_behandling: number
  mottatt: number
  varslet: number
  trukket: number
  bortfalt: number
  ukjent: number
}

// ── Månedlig trend ────────────────────────────────────────────────────────────

/** Én datapunkt i månedlig aktivitetstrend. */
export type MånedsTrend = {
  /** Måned på formen "YYYY-MM", f.eks. "2024-11" */
  måned: string
  /** Antall saker registrert denne måneden */
  antall: number
}

// ── Bakoverkompatibilitet ─────────────────────────────────────────────────────
// Eksporter gamle navn slik at eksisterende kode ikke brytes.

/** @deprecated Bruk Sak i stedet */
export type CaseItem = {
  id: string
  title: string
  shortTitle: string
  type: string
  status: string
  date: string
  committee: string
  category?: TemaKey
  score?: number
  matches?: string[]
  relevanceScore?: number
}

/** @deprecated Bruk TemaKey i stedet */
export type ThemeKey = TemaKey
