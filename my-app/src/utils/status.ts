/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STATUSHJELPERE — src/utils/status.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Stortingets API returnerer saksstatus som fritekst med varierende format.
 * Eksempler: "til behandling", "Til Behandling", "til-behandling"
 *
 * Denne filen normaliserer alle statuser til konsistente nøkler,
 * og oversetter dem til visningsvennlige norske og engelske tekster.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Normalisering ─────────────────────────────────────────────────────────────

/**
 * Normaliserer en statusstreng til en konsistent nøkkel (lavcase med underscore).
 * Eksempel: "Til Behandling" → "til_behandling"
 */
export function normaliserStatus(status: string): string {
  return String(status ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_")
}

// ── Visningsnavn ──────────────────────────────────────────────────────────────

/** Oversettelser fra normalisert status til visningsnavn. */
const STATUS_TEKST: Record<string, { no: string; en: string }> = {
  behandlet:       { no: "Ferdig behandlet",         en: "Processed" },
  til_behandling:  { no: "Til behandling",            en: "In progress" },
  mottatt:         { no: "Mottatt — ikke startet",    en: "Received" },
  varslet:         { no: "Varslet",                   en: "Announced" },
  trukket:         { no: "Trukket tilbake",           en: "Withdrawn" },
  bortfalt:        { no: "Bortfalt",                  en: "Lapsed" },
  ukjent:          { no: "Ukjent status",             en: "Unknown" },
}

/**
 * Returnerer et lesbart visningsnavn for en status.
 * Eksempel: "til behandling" + "no" → "Til behandling"
 */
export function statusVisningsnavn(
  status: string,
  språk: "no" | "en"
): string {
  const nøkkel = normaliserStatus(status)
  const tekst = STATUS_TEKST[nøkkel]
  if (!tekst) return status // Vis original hvis ukjent
  return tekst[språk]
}

// ── Statusklassifisering ──────────────────────────────────────────────────────

/** Returnerer true hvis saken er ferdig behandlet. */
export function erBehandlet(status: string): boolean {
  return normaliserStatus(status) === "behandlet"
}

/** Returnerer true hvis saken er aktiv (til behandling). */
export function erAktiv(status: string): boolean {
  return normaliserStatus(status) === "til_behandling"
}

/** Returnerer true hvis saken er mottatt men ikke startet. */
export function erMottatt(status: string): boolean {
  return normaliserStatus(status) === "mottatt"
}

// ── Statusfordeling ───────────────────────────────────────────────────────────

/**
 * Teller opp statuser i en liste med saker.
 * Returnerer en fordeling med antall per status.
 *
 * Nyttig for statistikk-dashboardet.
 */
export function telStatusFordeling(
  saker: Array<{ status: string }>
): Record<string, number> {
  const fordeling: Record<string, number> = {
    behandlet: 0,
    til_behandling: 0,
    mottatt: 0,
    varslet: 0,
    trukket: 0,
    bortfalt: 0,
    ukjent: 0,
  }

  saker.forEach((sak) => {
    const nøkkel = normaliserStatus(sak.status)
    if (nøkkel in fordeling) {
      fordeling[nøkkel]++
    } else {
      fordeling.ukjent++
    }
  })

  return fordeling
}
