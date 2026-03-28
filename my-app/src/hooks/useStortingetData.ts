/*
 * ═══════════════════════════════════════════════════════════════════════════
 * DATA-HOOK FOR STORTINGET — src/hooks/useStortingetData.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Custom React hook som henter og cacher data fra Stortingets åpne API.
 * Brukes i statistikk- og forsidestatskomponenter.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * STORTINGETS API — VIKTIG INFO FOR AI OG UTVIKLERE
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Base-URL: https://data.stortinget.no/eksport/
 *
 * FORMAT: Alle svar er XML (ikke JSON).
 * Bruk parseXml() og hentElementer() fra src/utils/xml.ts til å lese dem.
 *
 * VIKTIGE ENDEPUNKTER:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ /saker?sesjonid=2024-2025         ← Alle saker i en sesjon         │
 * │ /saker?saksnummer=12345           ← Én bestemt sak                 │
 * │ /voteringer?sesjonid=2024-2025    ← Alle voteringer i sesjon       │
 * │ /voteringsresultat?voteringid=X   ← Hvem stemte hva i votering X  │
 * │ /dagensrepresentanter             ← Nåværende stortingsrepresentanter│
 * │ /representant?personid=P123456    ← Info om én representant        │
 * │ /personbilde?personid=P123456     ← Bilde av representant          │
 * │ /partier                          ← Liste over alle partier        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * SESJON-ID FORMAT: "ÅÅÅÅ-ÅÅÅÅ", f.eks. "2024-2025"
 * Stortingets sesjon starter i oktober og slutter i september.
 *
 * BEGRENSNINGER:
 *   - Ingen API-nøkkel kreves — åpen tilgang
 *   - Kan returnere mye data (500+ saker per sesjon) — cache resultatene
 *   - XML-namespace kan variere — bruk getElementsByTagNameNS("*", navn)
 *
 * ──────────────────────────────────────────────────────────────────────────
 * SLIK BRUKER DU HOOKEN:
 * ──────────────────────────────────────────────────────────────────────────
 *
 *   import { useStortingetData } from "../hooks/useStortingetData"
 *
 *   function MinKomponent() {
 *     const { saker, sesjonId, laster, feil, sisteOppdatering } =
 *       useStortingetData()
 *
 *     if (laster) return <p>Laster...</p>
 *     if (feil)   return <p>Feil: {feil}</p>
 *     return <p>{saker.length} saker hentet</p>
 *   }
 *
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState } from "react"
import { beregnetAktivSesjon, sakerApiUrl } from "../config/sesjon"
import { parseXml, hentElementer, hentBarn, hentTekst } from "../utils/xml"
import { datoSorteringsverdi, beregnMånedsTrend } from "../utils/dato"
import { erBehandlet, erAktiv, erMottatt } from "../utils/status"
import { categorizeCases } from "../lib/categorizationEngine"
import type { CaseItem } from "../types/sak"
import type { TemaKey } from "../types/sak"
import type { MånedsTrend } from "../types/sak"

// ── Typer for hook-utdata ─────────────────────────────────────────────────────

export type StortingetDataResultat = {
  /** Alle hentede saker, sortert nyeste først */
  saker: CaseItem[]
  /** Saker kategorisert per tema */
  sakerPerTema: Record<TemaKey, CaseItem[]>
  /** Aktiv sesjon-ID, f.eks. "2024-2025" */
  sesjonId: string
  /** Totalt antall saker */
  totaltAntall: number
  /** Antall behandlede saker */
  antallBehandlet: number
  /** Antall saker til behandling */
  antallAktive: number
  /** Antall mottatte (ikke startet) saker */
  antallMottatt: number
  /** Månedlig aktivitetstrend (siste 8 måneder) */
  månedsTrend: MånedsTrend[]
  /** Tidspunkt for siste vellykket henting */
  sisteOppdatering: Date | null
  /** True mens data hentes */
  laster: boolean
  /** Feilmelding, eller null hvis ingen feil */
  feil: string | null
}

// ── Selve hooken ──────────────────────────────────────────────────────────────

/**
 * Henter saker fra Stortingets API for gjeldende sesjon.
 * Oppdaterer automatisk hvert 5. minutt.
 *
 * Returnerer alle beregnede verdier klar til bruk i komponenter.
 */
export function useStortingetData(): StortingetDataResultat {
  const sesjonId = beregnetAktivSesjon()

  const [saker, setSaker] = useState<CaseItem[]>([])
  const [sisteOppdatering, setOppdatering] = useState<Date | null>(null)
  const [laster, setLaster] = useState(true)
  const [feil, setFeil] = useState<string | null>(null)

  // ── Data-henting ────────────────────────────────────────────────────────────

  useEffect(() => {
    async function hentSaker() {
      try {
        setFeil(null)
        const url = sakerApiUrl(sesjonId)
        const respons = await fetch(url)

        if (!respons.ok) {
          throw new Error(`HTTP ${respons.status}: ${respons.statusText}`)
        }

        const xmlTekst = await respons.text()
        const doc = parseXml(xmlTekst)
        const sakElementer = hentElementer(doc, "sak")

        // Konverter XML-elementer til CaseItem-objekter
        const unikeSaker = new Map<string, CaseItem>()
        sakElementer.forEach((element) => {
          const id = hentTekst(element, "id")
          const tittel = hentTekst(element, "tittel")
          if (!id || !tittel) return // Hopp over ufullstendige saker

          const komiteElement = hentBarn(element, "komite")
          unikeSaker.set(id, {
            id,
            title: tittel,
            shortTitle: hentTekst(element, "korttittel") || tittel,
            type: hentTekst(element, "type") || "ukjent",
            status: hentTekst(element, "status") || "ukjent",
            date: hentTekst(element, "dato") || hentTekst(element, "sist_oppdatert_dato"),
            committee: hentTekst(komiteElement, "navn") || "Mangler komiténavn",
          })
        })

        // Sorter nyeste saker først
        const sortert = Array.from(unikeSaker.values()).sort(
          (a, b) => datoSorteringsverdi(b.date) - datoSorteringsverdi(a.date)
        )

        // Kjør AI-kategorisering
        const kategorisert = categorizeCases(sortert)
        const alleSaker = Object.values(kategorisert)
          .flat()
          .sort((a, b) => datoSorteringsverdi(b.date) - datoSorteringsverdi(a.date))

        setSaker(alleSaker)
        setOppdatering(new Date())
      } catch (error) {
        const melding = error instanceof Error ? error.message : "Ukjent feil"
        console.error("[useStortingetData] Feil ved henting:", melding)
        setFeil(melding)
      } finally {
        setLaster(false)
      }
    }

    hentSaker()

    // Oppdater automatisk hvert 5. minutt
    const intervall = setInterval(hentSaker, 5 * 60 * 1000)
    return () => clearInterval(intervall)
  }, [sesjonId])

  // ── Beregnede verdier ───────────────────────────────────────────────────────

  const sakerPerTema = useMemo(
    () => categorizeCases(saker),
    [saker]
  )

  const antallBehandlet = useMemo(
    () => saker.filter((s) => erBehandlet(s.status)).length,
    [saker]
  )

  const antallAktive = useMemo(
    () => saker.filter((s) => erAktiv(s.status)).length,
    [saker]
  )

  const antallMottatt = useMemo(
    () => saker.filter((s) => erMottatt(s.status)).length,
    [saker]
  )

  const månedsTrend = useMemo(
    () => beregnMånedsTrend(saker.map((s) => ({ dato: s.date }))),
    [saker]
  )

  return {
    saker,
    sakerPerTema,
    sesjonId,
    totaltAntall: saker.length,
    antallBehandlet,
    antallAktive,
    antallMottatt,
    månedsTrend,
    sisteOppdatering,
    laster,
    feil,
  }
}
