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
import sakerFallback from "../data/saker_fallback.xml?raw"

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

  // Hjelpefunksjon for å parse XML til CaseItem-array med sortering
  const parseXmlCases = (xmlTekst: string): CaseItem[] => {
    const doc = parseXml(xmlTekst)
    const sakElementer = hentElementer(doc, "sak")
    const unikeSaker = new Map<string, CaseItem>()
    sakElementer.forEach((element) => {
      const id = hentTekst(element, "id")
      const tittel = hentTekst(element, "tittel")
      if (!id || !tittel) return

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

    const sortert = Array.from(unikeSaker.values()).sort(
      (a, b) => datoSorteringsverdi(b.date) - datoSorteringsverdi(a.date)
    )

    const kategorisert = categorizeCases(sortert)
    return Object.values(kategorisert)
      .flat()
      .sort((a, b) => datoSorteringsverdi(b.date) - datoSorteringsverdi(a.date))
  }

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
        const alleSaker = parseXmlCases(xmlTekst)

        // Lagre i localStorage
        try {
          localStorage.setItem(`stortinget-saker-cache-${sesjonId}`, xmlTekst)
        } catch (e) {
          console.warn("[useStortingetData] Klarte ikke skrive til cache:", e)
        }

        setSaker(alleSaker)
        setOppdatering(new Date())
      } catch (error) {
        const melding = error instanceof Error ? error.message : "Ukjent feil"
        console.error("[useStortingetData] Feil ved henting, prøver cache-fallback...", melding)

        // 1. Forsøk localStorage-cache
        try {
          const cachedXml = localStorage.getItem(`stortinget-saker-cache-${sesjonId}`)
          if (cachedXml) {
            console.log("[useStortingetData] Bruker cached data fra localStorage")
            const alleSaker = parseXmlCases(cachedXml)
            setSaker(alleSaker)
            setOppdatering(new Date())
            return
          }
        } catch (cacheErr) {
          console.error("[useStortingetData] Feil ved lesing av localStorage cache:", cacheErr)
        }

        // 2. Forsøk hardkodet fallback-fil
        try {
          console.log("[useStortingetData] Bruker hardkodet XML fallback-fil")
          const alleSaker = parseXmlCases(sakerFallback)
          setSaker(alleSaker)
          setOppdatering(new Date())
        } catch (fallbackErr) {
          console.error("[useStortingetData] Feil ved parsing av hardkodet fallback:", fallbackErr)
          setFeil(melding)
        }
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
