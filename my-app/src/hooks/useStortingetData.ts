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

// ── Cache-konfigurasjon ───────────────────────────────────────────────────────
/** Maks alder på localStorage-cache før den regnes som utdatert (24 timer) */
const CACHE_MAKS_ALDER_MS = 24 * 60 * 60 * 1000

/** Henter cache fra localStorage og returnerer xml + alder i ms, eller null */
function hentCache(nøkkel: string): { xml: string; alderMs: number } | null {
  try {
    const xml = localStorage.getItem(nøkkel)
    const tidsstempel = localStorage.getItem(`${nøkkel}-tidsstempel`)
    if (!xml || !tidsstempel) return null
    return { xml, alderMs: Date.now() - parseInt(tidsstempel, 10) }
  } catch {
    return null
  }
}

/** Lagrer xml og tidsstempel i localStorage */
function lagreCache(nøkkel: string, xml: string): void {
  try {
    localStorage.setItem(nøkkel, xml)
    localStorage.setItem(`${nøkkel}-tidsstempel`, Date.now().toString())
  } catch (e) {
    console.warn("[useStortingetData] Klarte ikke skrive til cache:", e)
  }
}

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
  /** True mens data hentes første gang (ikke ved bakgrunnsoppdatering) */
  laster: boolean
  /** Feilmelding, eller null hvis ingen feil */
  feil: string | null
  /** Kilde for dataene som vises */
  dataKilde: "api" | "cache" | "fallback"
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
  const [dataKilde, setDataKilde] = useState<"api" | "cache" | "fallback">("api")

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
      const cacheNøkkel = `stortinget-saker-cache-${sesjonId}`
      const cache = hentCache(cacheNøkkel)

      // ── Stale-while-revalidate ───────────────────────────────────────────
      // Vis cache umiddelbart (uansett alder) — brukeren ser data med én gang.
      // Så henter vi oppdatert data i bakgrunnen hvis cachen er utdatert.
      if (cache) {
        const alleSaker = parseXmlCases(cache.xml)
        setSaker(alleSaker)
        setDataKilde("cache")
        setOppdatering(new Date(Date.now() - cache.alderMs))
        setLaster(false)

        const timerGammel = Math.round(cache.alderMs / 3600000)
        if (cache.alderMs < CACHE_MAKS_ALDER_MS) {
          console.log(`[useStortingetData] Cache fersk (${timerGammel}t) — hopper over API-kall`)
          return  // Cache er fersk nok, ikke hent på nytt
        }
        console.log(`[useStortingetData] Cache er ${timerGammel}t gammel — henter oppdatering i bakgrunnen`)
      }

      // ── Hent fra API ─────────────────────────────────────────────────────
      try {
        setFeil(null)
        const url = sakerApiUrl(sesjonId)
        const respons = await fetch(url)
        if (!respons.ok) throw new Error(`HTTP ${respons.status}: ${respons.statusText}`)

        const xmlTekst = await respons.text()
        const alleSaker = parseXmlCases(xmlTekst)

        lagreCache(cacheNøkkel, xmlTekst)
        setSaker(alleSaker)
        setDataKilde("api")
        setOppdatering(new Date())
      } catch (error) {
        const melding = error instanceof Error ? error.message : "Ukjent feil"
        console.error("[useStortingetData] Feil ved henting:", melding)

        if (cache) {
          // Viser allerede cache — si ingenting til brukeren, data er der
          console.warn("[useStortingetData] API-feil, fortsetter med cache-data")
        } else {
          // Ingen cache — prøv hardkodet fallback-fil som siste utvei
          try {
            console.log("[useStortingetData] Bruker hardkodet XML fallback-fil")
            const alleSaker = parseXmlCases(sakerFallback)
            setSaker(alleSaker)
            setDataKilde("fallback")
            setOppdatering(new Date())
          } catch (fallbackErr) {
            console.error("[useStortingetData] Feil ved parsing av hardkodet fallback:", fallbackErr)
            setFeil(melding)
          }
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
    dataKilde,
  }
}
