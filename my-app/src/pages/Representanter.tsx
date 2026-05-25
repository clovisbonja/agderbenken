/*
 * ═══════════════════════════════════════════════════════════════════════════
 * REPRESENTANTER — src/pages/Representanter.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Viser Agderbenkens stortingsrepresentanter.
 * Henter live data fra Stortingets åpne XML-API.
 *
 * Funksjoner:
 *   - Liste over alle nåværende Agder-representanter
 *   - Filtrering etter parti
 *   - Representantkort med bilde, alder, parti og komitétilhørighet
 *   - Klikk åpner Stortingets offisielle representantside
 *
 * API-endepunkter som brukes:
 *   - /dagensrepresentanter  ← Alle nåværende stortingsrepresentanter
 *   - /kodetbiografi         ← Komiteer og verv per representant
 *   - /personbilde           ← Profilbilde (hentes dynamisk)
 *
 * Støtter norsk (no) og engelsk (en) via lang-prop.
 * CSS finnes i src/styles/representanter.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useRef, useState } from "react"
import repStatsRaw from "../data/representative_stats.json"
import { useDocumentSEO } from "../hooks/useDocumentSEO"
import dagensrepresentanterFallback from "../data/dagensrepresentanter_fallback.xml?raw"

// Live-endepunkt for "dagens representanter" fra Stortinget.
const API_URL = "https://data.stortinget.no/eksport/dagensrepresentanter"
const BIOGRAPHY_API_URL = "https://data.stortinget.no/eksport/kodetbiografi"

// Fast label for "vis alle partier" i filteret.
const ALL_PARTIES_OPTION = "Alle"

type Representative = {
  id: string
  fornavn: string
  etternavn: string
  alder: number | null
  parti: string
  kommune: string
  fylke: string
  erVara: boolean
  varaForNavn: string | null   // navn på den de vikarierer for
  varaForId: string | null
  permisjon?: boolean
  erstattetAvNavn?: string | null
  erstattetAvId?: string | null
}

type BiographyItem = {
  id: string
  title: string
  subtitle: string
  period: string
}

const PERSON_IMAGE_BASE_URL = "https://data.stortinget.no/eksport/personbilde"

type Lang = "no" | "en"

// Lager en komplett bilde-lenke til Stortinget for én person.
// Hvis person-id mangler bruker vi "X", slik at API-et kan returnere erstatningsbilde.
function getRepresentativeImageUrl(personId: string, size: "stort" | "middels" | "lite" = "middels"): string {
  const params = new URLSearchParams({
    personid: personId || "X",
    storrelse: size,
    erstatningsbilde: "true",
  })
  return `${PERSON_IMAGE_BASE_URL}?${params.toString()}`
}

// Krav fra deg: vis både Aust-Agder og Vest-Agder som "Agder".
function normalizeAgder(value: string): string {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === "aust-agder" ||
    normalized === "vest-agder" ||
    normalized === "agder"
  ) {
    return "Agder"
  }
  return value.trim()
}

// Hent første treff på navn (localName) et sted inne i en node.
function getTextByLocalName(node: Element, name: string): string {
  if (node.localName === name) return (node.textContent ?? "").trim()

  const descendants = node.getElementsByTagName("*")
  for (let i = 0; i < descendants.length; i += 1) {
    const el = descendants[i]
    if (el.localName === name) return (el.textContent ?? "").trim()
  }

  return ""
}

// Finn første ikke-tomme feltverdi fra en liste av feltnavn.
function pickFirstNonEmpty(node: Element, names: string[]): string {
  for (const name of names) {
    const value = getTextByLocalName(node, name)
    if (value) return value
  }
  return ""
}

// Finn en "nested" node (f.eks. parti/fylke) via flere mulige navn.
function findNestedByNames(node: Element, names: string[]): Element | null {
  return (
    Array.from(node.getElementsByTagName("*")).find((el) =>
      names.includes(el.localName)
    ) ?? null
  )
}

// Beregn alder ut fra fødselsdato (ISO-format i API).
function parseAge(isoDateTime: string): number | null {
  if (!isoDateTime) return null

  const birth = new Date(isoDateTime)
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const hasNotHadBirthdayThisYear =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())

  if (hasNotHadBirthdayThisYear) age -= 1
  return age
}

// Parse XML fra Stortinget til en enkel, stabil frontend-modell.
function parseRepresentatives(xmlText: string): Representative[] {
  const documentXml = new DOMParser().parseFromString(xmlText, "text/xml")

  // API kan variere mellom "representant" og "dagensrepresentant".
  const representatives = Array.from(documentXml.getElementsByTagName("*")).filter(
    (el) => el.localName === "dagensrepresentant" || el.localName === "representant"
  )

  const list: Representative[] = []
  const seenIds = new Set<string>()

  representatives.forEach((rep) => {
    const fylkeNode = findNestedByNames(rep, ["fylke", "hjemfylke", "valgdistrikt"])
    const partiNode = findNestedByNames(rep, ["parti"])
    const kommuneNode = findNestedByNames(rep, ["kommune", "hjemkommune", "hjemsted"])

    const fylkeRaw = fylkeNode ? pickFirstNonEmpty(fylkeNode, ["navn", "id"]) : ""
    const partiRaw = partiNode ? pickFirstNonEmpty(partiNode, ["navn", "id"]) : ""
    const kommuneRaw = kommuneNode ? pickFirstNonEmpty(kommuneNode, ["navn", "id"]) : ""

    const parti =
      partiRaw ||
      pickFirstNonEmpty(rep, ["partinavn", "parti_navn"]) ||
      "Ukjent parti"

    const fylke = normalizeAgder(fylkeRaw || "Ukjent fylke")
    const kommune = normalizeAgder(
      kommuneRaw || pickFirstNonEmpty(rep, ["hjemkommune", "kommune"]) || fylke
    )

    const fornavn = pickFirstNonEmpty(rep, ["fornavn"])
    const etternavn = pickFirstNonEmpty(rep, ["etternavn"])
    if (!fornavn || !etternavn) return

    const id = pickFirstNonEmpty(rep, ["id"])
    const age = parseAge(pickFirstNonEmpty(rep, ["foedselsdato"]))

    // Vikariat — vara_representant + fast_vara_for
    const erVara = getTextByLocalName(rep, "vara_representant") === "true"
    const varaForNode = Array.from(rep.getElementsByTagName("*")).find(
      (el) => el.localName === "fast_vara_for"
    ) ?? null
    const varaForFornavn = varaForNode ? getTextByLocalName(varaForNode, "fornavn") : ""
    const varaForEtternavn = varaForNode ? getTextByLocalName(varaForNode, "etternavn") : ""
    const varaForId = varaForNode ? getTextByLocalName(varaForNode, "id") : null
    const varaForBirth = varaForNode ? getTextByLocalName(varaForNode, "foedselsdato") : ""
    const varaForNavn = varaForFornavn && varaForEtternavn
      ? `${varaForFornavn} ${varaForEtternavn}`
      : null

    const currentRep: Representative = {
      id,
      fornavn,
      etternavn,
      alder: age,
      parti,
      kommune,
      fylke,
      erVara,
      varaForNavn,
      varaForId: varaForId || null,
    }

    if (!seenIds.has(id)) {
      list.push(currentRep)
      seenIds.add(id)
    }

    // Hvis denne er en aktiv vikar, oppretter vi også den faste representanten som er i permisjon
    if (erVara && varaForId && varaForFornavn && varaForEtternavn) {
      const mainRepId = varaForId
      if (!seenIds.has(mainRepId)) {
        const mainRep: Representative = {
          id: mainRepId,
          fornavn: varaForFornavn,
          etternavn: varaForEtternavn,
          alder: parseAge(varaForBirth),
          parti, // De representerer samme parti og distrikt
          kommune,
          fylke,
          erVara: false,
          varaForNavn: null,
          varaForId: null,
          permisjon: true,
          erstattetAvNavn: `${fornavn} ${etternavn}`,
          erstattetAvId: id,
        }
        list.push(mainRep)
        seenIds.add(mainRepId)
      }
    }
  })

  return list
}

function getDirectFields(node: Element): Record<string, string> {
  const fields: Record<string, string> = {}
  Array.from(node.children).forEach((child) => {
    const value = (child.textContent ?? "").trim()
    if (!value) return
    fields[child.localName] = value
  })
  return fields
}

function buildPeriod(fields: Record<string, string>): string {
  const from = fields.fra || fields.fra_aar || fields.fom || ""
  const to = fields.til || fields.til_aar || fields.tom || ""
  if (from && to) return `${from} - ${to}`
  if (from) return `Fra ${from}`
  if (to) return `Til ${to}`
  return ""
}

function parseBiography(xmlText: string): BiographyItem[] {
  const documentXml = new DOMParser().parseFromString(xmlText, "text/xml")
  const nodes = Array.from(documentXml.getElementsByTagName("*")).filter(
    (el) => el.localName === "person_biografi_utdanning_yrke_kodet"
  )

  return nodes
    .map((node, index): BiographyItem => {
      const fields = getDirectFields(node)
      const typeCode = fields.type || ""

      const ignored = new Set([
        "id",
        "type",
        "fra",
        "til",
        "fra_aar",
        "til_aar",
        "fom",
        "tom",
        "hovedaktivitet",
        "hovedaktivitet_bool",
      ])

      const contentEntries = Object.entries(fields).filter(([key, value]) => {
        if (ignored.has(key)) return false
        const normalized = value.trim().toLowerCase()
        if (!normalized) return false
        if (normalized === "false" || normalized === "true") return false
        return true
      })
      const title = contentEntries[0]?.[1] ?? "Detaljer ikke oppgitt"
      const subtitle = contentEntries[1]?.[1] ?? ""

      return {
        id: fields.id || `${typeCode}-${index}`,
        title,
        subtitle,
        period: buildPeriod(fields),
      }
    })
    .filter((item) => item.title)
}

const PARTY_COLORS_RP: Record<string, string> = {
  "Arbeiderpartiet": "#EF3340",
  "Høyre": "#0066CC",
  "Fremskrittspartiet": "#003087",
  "Senterpartiet": "#009B3A",
  "Sosialistisk Venstreparti": "#EF3C96",
  "Venstre": "#00843D",
  "Kristelig Folkeparti": "#d97706",
  "Miljøpartiet De Grønne": "#5E9732",
  "Rødt": "#E30613",
}
function getPartyColor(parti: string): string {
  return PARTY_COLORS_RP[parti] || "#6b7280"
}

type StatItem = {
  id: string
  title: string
  status: string
  statusType: "success" | "danger" | "warning"
}

type VoteItem = {
  title: string
  vote: string
  outcome: string
  outcomeType: "success" | "danger" | "warning"
}

type StatementItem = {
  topic: string
  quote: string
  context: string
  date: string
}

type RepresentativeStats = {
  attendance: number
  possibleVotes: number
  attendedVotes: number
  proposals: StatItem[]
  votes: VoteItem[]
  submitted: StatItem[]
  statements: StatementItem[]
}

function generateRepresentativeStats(
  id: string,
  lang: Lang
): RepresentativeStats {
  const realStats = (repStatsRaw as Record<string, any>)[id]
  if (realStats) {
    return {
      attendance: realStats.attendance,
      possibleVotes: realStats.possibleVotes,
      attendedVotes: realStats.attendedVotes,
      proposals: (realStats.proposals || []).map((prop: any) => ({
        id: prop.id,
        title: prop.title,
        status: lang === "no" ? prop.statusNo : prop.statusEn,
        statusType: prop.statusType
      })),
      votes: (realStats.votes || []).map((vote: any) => ({
        title: vote.title,
        vote: lang === "no" ? vote.voteNo : vote.voteEn,
        outcome: lang === "no" ? vote.outcomeNo : vote.outcomeEn,
        outcomeType: vote.outcomeType
      })),
      submitted: (realStats.submitted || []).map((sub: any) => ({
        id: sub.id,
        title: sub.title,
        status: lang === "no" ? sub.statusNo : sub.statusEn,
        statusType: sub.statusType
      })),
      statements: (realStats.statements || []).map((stmt: any) => ({
        topic: stmt.topic,
        quote: stmt.quote,
        context: lang === "no" ? stmt.contextNo : stmt.contextEn,
        date: stmt.date
      }))
    }
  }

  return {
    attendance: 0,
    possibleVotes: 0,
    attendedVotes: 0,
    proposals: [],
    votes: [],
    submitted: [],
    statements: []
  }
}

type RepresentanterProps = { lang: Lang }

export default function Representanter({ lang }: RepresentanterProps) {
  const no = lang === "no"

  useDocumentSEO(
    no ? "Stortingsrepresentanter fra Agder | Sørblikket" : "Storting Representatives from Agder | Sørblikket",
    no
      ? "Oversikt over Agderbenkens representanter. Se biografier, voteringsoppmøte, representantforslag og stemmehistorikk."
      : "Overview of Agder's representatives. See biographies, voting attendance, proposals, and voting history."
  )

  const t =
    lang === "no"
      ? {
          title: "Representanter",
          intro: "Live data fra Stortinget API (dagens representanter). Hentes direkte ved hver sidevisning.",
          updated: "Sist oppdatert",
          loading: "Laster representanter...",
          fetchError: "Klarte ikke hente data",
          unknownFetchError: "Ukjent feil ved henting av data",
          agder: "Agder",
          representatives: "representanter",
          tapHint: "Trykk på en representant for å se detaljer.",
          filterParty: "Filtrer parti",
          ageUnknown: "Alder ukjent",
          biography: "Personlig biografi",
          loadingBio: "Laster biografi...",
          noBio: "Fant ingen biografi for denne representanten.",
          hideDetails: "Skjul detaljer",
          showBio: "Vis biografi",
          bioError: "Ukjent feil ved henting av biografi",
          noForParty: "Ingen representanter funnet for valgt parti.",
          years: "år",
          bioFetchError: "Klarte ikke hente biografi",
        }
      : {
          title: "Representatives",
          intro: "Live data from the Storting API (current representatives). Fetched directly on each page view.",
          updated: "Last updated",
          loading: "Loading representatives...",
          fetchError: "Could not fetch data",
          unknownFetchError: "Unknown error while fetching data",
          agder: "Agder",
          representatives: "representatives",
          tapHint: "Click a representative to view details.",
          filterParty: "Filter party",
          ageUnknown: "Age unknown",
          biography: "Personal biography",
          loadingBio: "Loading biography...",
          noBio: "No biography found for this representative.",
          hideDetails: "Hide details",
          showBio: "Show biography",
          bioError: "Unknown error while fetching biography",
          noForParty: "No representatives found for selected party.",
          years: "years",
          bioFetchError: "Could not fetch biography",
        }

  // Grunndata + tilstand som styrer hva brukeren ser.
  const [data, setData] = useState<Representative[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [biography, setBiography] = useState<BiographyItem[]>([])
  const [biographyLoading, setBiographyLoading] = useState(false)
  const [biographyError, setBiographyError] = useState<string | null>(null)
  const [showBiography, setShowBiography] = useState(false)
  const [activeStatCard, setActiveStatCard] = useState<"attendance" | "proposals" | "votes" | null>(null)
  // Valgt parti i filteret.
  const [selectedParty, setSelectedParty] = useState<string>(ALL_PARTIES_OPTION)
  // Hvilken representant som er "aktiv" (for stort profilbilde og markering i kort).
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState<string | null>(
    null
  )
  // Ref til detaljpanelet — brukes for å scrolle opp dit når et kort klikkes.
  const detailRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // AbortController gjør at vi kan avbryte hentingen hvis brukeren forlater siden.
    const controller = new AbortController()

    async function loadRepresentatives() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(API_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`${t.fetchError} (${response.status})`)
        }

        const xmlText = await response.text()
        const parsed = parseRepresentatives(xmlText)

        // Lagre i localStorage
        try {
          localStorage.setItem("stortinget-representanter-cache", xmlText)
        } catch (err) {
          console.warn("[Representanter] Klarte ikke skrive til cache:", err)
        }

        setData(parsed)
        setLastUpdated(Date.now())
      } catch (e) {
        if (controller.signal.aborted) return
        console.warn("[Representanter] Feil ved live henting, prøver cache-fallback...", e)

        // 1. Forsøk localStorage-cache
        try {
          const cachedXml = localStorage.getItem("stortinget-representanter-cache")
          if (cachedXml) {
            console.log("[Representanter] Bruker cached data fra localStorage")
            const parsed = parseRepresentatives(cachedXml)
            setData(parsed)
            setLastUpdated(Date.now())
            return
          }
        } catch (cacheErr) {
          console.error("[Representanter] Feil ved lesing av localStorage cache:", cacheErr)
        }

        // 2. Forsøk hardkodet fallback-fil
        try {
          console.log("[Representanter] Bruker hardkodet XML fallback-fil")
          const parsed = parseRepresentatives(dagensrepresentanterFallback)
          setData(parsed)
          setLastUpdated(Date.now())
        } catch (fallbackErr) {
          console.error("[Representanter] Feil ved parsing av hardkodet fallback:", fallbackErr)
          setError(e instanceof Error ? e.message : t.unknownFetchError)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadRepresentatives()
    return () => controller.abort()
  }, [])

  // Vis bare representanter fra Agder (inkludert normaliserte varianter).
  const agderRepresentanter = useMemo(
    () => data.filter((rep) => rep.fylke === "Agder" || rep.kommune === "Agder"),
    [data]
  )

  // Stabil sortering for forutsigbar visning, der vikariater grupperes sammen.
  const sortedRepresentanter = useMemo(() => {
    const sorted = [...agderRepresentanter].sort((a, b) =>
      `${a.etternavn} ${a.fornavn}`.localeCompare(
        `${b.etternavn} ${b.fornavn}`,
        "nb-NO"
      )
    )

    const grouped: Representative[] = []
    const visited = new Set<string>()

    for (const rep of sorted) {
      if (visited.has(rep.id)) continue

      if (rep.permisjon && rep.erstattetAvId) {
        grouped.push(rep)
        visited.add(rep.id)
        
        const sub = sorted.find(r => r.id === rep.erstattetAvId)
        if (sub && !visited.has(sub.id)) {
          grouped.push(sub)
          visited.add(sub.id)
        }
      } else if (rep.erVara && rep.varaForId) {
        const main = sorted.find(r => r.id === rep.varaForId)
        if (main && !visited.has(main.id)) {
          grouped.push(main)
          visited.add(main.id)
        }
        grouped.push(rep)
        visited.add(rep.id)
      } else {
        grouped.push(rep)
        visited.add(rep.id)
      }
    }

    return grouped
  }, [agderRepresentanter])

  // Partiliste bygges dynamisk fra data (ingen hardkoding av partier).
  const partyFilters = useMemo(
    () => [
      ALL_PARTIES_OPTION,
      ...Array.from(new Set(sortedRepresentanter.map((rep) => rep.parti))).sort((a, b) =>
        a.localeCompare(b, "nb-NO")
      ),
    ],
    [sortedRepresentanter]
  )

  // Endelig datasett etter valgt filter i dropdown.
  const visibleRepresentanter = useMemo(
    () =>
      selectedParty === ALL_PARTIES_OPTION
        ? sortedRepresentanter
        : sortedRepresentanter.filter((rep) => rep.parti === selectedParty),
    [selectedParty, sortedRepresentanter]
  )

  const selectedRepresentative = useMemo(
    () => visibleRepresentanter.find((rep) => rep.id === selectedRepresentativeId) ?? null,
    [selectedRepresentativeId, visibleRepresentanter]
  )

  const representativeStats = useMemo(() => {
    if (!selectedRepresentative) return null
    return generateRepresentativeStats(
      selectedRepresentative.id,
      lang
    )
  }, [selectedRepresentative, lang])

  const statsSummary = useMemo(() => {
    if (!representativeStats) return null

    const proposals = representativeStats.proposals || []
    const submitted = representativeStats.submitted || []
    const votes = representativeStats.votes || []

    const allProposals = [...proposals, ...submitted]
    const totalProposals = allProposals.length
    const passedProposals = allProposals.filter(p => p.statusType === "success").length
    const failedProposals = allProposals.filter(p => p.statusType === "danger").length
    const pendingProposals = allProposals.filter(p => p.statusType === "warning").length

    const votedFor = votes.filter(v => v.vote === "Stemt for" || v.vote === "Voted for").length
    const votedAgainst = votes.filter(v => v.vote === "Stemt mot" || v.vote === "Voted against").length
    const absent = votes.filter(v => v.vote === "Ikke til stede" || v.vote === "Absent").length
    const totalVotes = votes.length

    return {
      totalProposals,
      passedProposals,
      failedProposals,
      pendingProposals,
      votedFor,
      votedAgainst,
      absent,
      totalVotes
    }
  }, [representativeStats])

  useEffect(() => {
    setActiveStatCard(null)
    const selectedPersonId = selectedRepresentative?.id
    if (!selectedPersonId) {
      setBiography([])
      setBiographyError(null)
      setBiographyLoading(false)
      setShowBiography(false)
      return
    }
    const personId = selectedPersonId

    const controller = new AbortController()

    async function loadBiography() {
      setBiographyLoading(true)
      setBiographyError(null)

      try {
        const params = new URLSearchParams({ personid: personId })
        const response = await fetch(`${BIOGRAPHY_API_URL}?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`${t.bioFetchError} (${response.status})`)
        }

        const xmlText = await response.text()
        setBiography(parseBiography(xmlText))
        setShowBiography(false)
      } catch (e) {
        if (controller.signal.aborted) return
        setBiography([])
        setBiographyError(e instanceof Error ? e.message : t.bioError)
        setShowBiography(false)
      } finally {
        if (!controller.signal.aborted) setBiographyLoading(false)
      }
    }

    loadBiography()
    return () => controller.abort()
  }, [selectedRepresentative])

  const partyCount = useMemo(() => {
    const map: Record<string, number> = {}
    sortedRepresentanter.forEach((r) => { map[r.parti] = (map[r.parti] ?? 0) + 1 })
    return map
  }, [sortedRepresentanter])

  useEffect(() => {
    // Sørger for at vi alltid har en gyldig valgt representant i gjeldende filter.
    // Hvis filteret endres og den gamle ikke finnes, velges første i lista.
    if (visibleRepresentanter.length === 0) {
      setSelectedRepresentativeId(null)
      return
    }

    if (
      selectedRepresentativeId &&
      visibleRepresentanter.some((rep) => rep.id === selectedRepresentativeId)
    ) {
      return
    }

    setSelectedRepresentativeId(visibleRepresentanter[0]?.id ?? null)
  }, [selectedRepresentativeId, visibleRepresentanter])

  return (
    <div className="rp-page">

      {/* ── HERO ── */}
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">Stortinget · Agder</p>
          <h1 className="ed-page-hero-heading">{lang === "no" ? "Representanter" : "Representatives"}</h1>
          <p className="ed-page-hero-lead">
            {lang === "no"
              ? "Agderbenkens representanter på Stortinget, hvem de er og hva de gjør."
              : "Agder's representatives in the Storting, who they are and what they do."}
          </p>
          {!loading && !error && (
            <p className="ed-page-hero-meta">
              {sortedRepresentanter.length} {lang === "no" ? "representanter fra Agder" : "representatives from Agder"} · {lang === "no" ? "Hentet live fra Stortingets API" : "Fetched live from the Storting API"}
              {lastUpdated && ` · ${t.updated}: ${new Date(lastUpdated).toLocaleTimeString()}`}
            </p>
          )}
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>
      {/* ── BODY ── */}
      <div className="rp-body">
        {loading && (
          <div className="rp-status">
            <span className="vsl-spinner" aria-hidden />
            <span>{t.loading}</span>
          </div>
        )}
        {error && <div className="rp-status rp-status-error">{error}</div>}

        {!loading && !error && (
          <>
            {/* Party filter chips */}
            <div className="rp-filters">
              {partyFilters.map((party) => {
                const isActive = selectedParty === party
                const color = getPartyColor(party)
                const count = party === ALL_PARTIES_OPTION
                  ? sortedRepresentanter.length
                  : (partyCount[party] ?? 0)
                return (
                  <button
                    key={party}
                    className={`rp-chip${isActive ? " rp-chip-active" : ""}`}
                    style={party !== ALL_PARTIES_OPTION ? { "--rp-party-color": color } as React.CSSProperties : {}}
                    onClick={() => { setSelectedParty(party); setSelectedRepresentativeId(null) }}
                  >
                    {party !== ALL_PARTIES_OPTION && (
                      <span className="rp-chip-dot" style={{ background: color }} />
                    )}
                    <span className="rp-chip-label">{party}</span>
                    <span className="rp-chip-count">{count}</span>
                  </button>
                )
              })}
            </div>

            {/* Detail panel — above the grid so it's visible immediately */}
            {selectedRepresentative && (
              <div ref={detailRef} className="rp-detail" aria-live="polite">
                <div className="rp-detail-inner">
                  <div className="rp-detail-photo-col">
                    <img
                      className="rp-detail-photo"
                      src={getRepresentativeImageUrl(selectedRepresentative.id, "stort")}
                      alt={`${selectedRepresentative.fornavn} ${selectedRepresentative.etternavn}`}
                      loading="lazy"
                    />
                  </div>
                  <div className="rp-detail-info-col">
                    <div className="rp-detail-meta">
                      <span
                        className="rp-detail-party"
                        style={{
                          background: getPartyColor(selectedRepresentative.parti) + "1a",
                          color: getPartyColor(selectedRepresentative.parti),
                          borderColor: getPartyColor(selectedRepresentative.parti) + "55",
                        }}
                      >
                        {selectedRepresentative.parti}
                      </span>
                      <span className="rp-detail-fylke">{selectedRepresentative.fylke}</span>
                    </div>
                    <h2 className="rp-detail-name">
                      {selectedRepresentative.fornavn} {selectedRepresentative.etternavn}
                      {selectedRepresentative.erVara && (
                        <span className="rp-detail-vara-badge">
                          {lang === "no" ? "Vikar" : "Substitute"}
                        </span>
                      )}
                      {selectedRepresentative.permisjon && (
                        <span className="rp-detail-permisjon-badge">
                          {lang === "no" ? "I permisjon" : "On leave"}
                        </span>
                      )}
                    </h2>
                    {selectedRepresentative.erVara && selectedRepresentative.varaForNavn && (
                      <p className="rp-detail-vara-for">
                        {lang === "no"
                          ? `Vikarierer for ${selectedRepresentative.varaForNavn}`
                          : `Substituting for ${selectedRepresentative.varaForNavn}`}
                      </p>
                    )}
                    {selectedRepresentative.permisjon && selectedRepresentative.erstattetAvNavn && (
                      <p className="rp-detail-permisjon-for">
                        {lang === "no"
                          ? `Erstattes av ${selectedRepresentative.erstattetAvNavn}`
                          : `Replaced by ${selectedRepresentative.erstattetAvNavn}`}
                      </p>
                    )}
                    <p className="rp-detail-age">
                      {selectedRepresentative.alder !== null
                        ? `${selectedRepresentative.alder} ${t.years}`
                        : t.ageUnknown}
                    </p>
                    {representativeStats && statsSummary && (
                      <div className="rp-stats-dashboard">
                        <h3 className="rp-stats-heading">
                          {lang === "no" ? "Aktivitet og resultater" : "Activity and Results"}
                        </h3>

                        {/* Klikbare statistikkort */}
                        <div className="rp-stats-grid-summary">

                          {/* Card 1: Oppmøte */}
                          <div
                            className="rp-stat-card"
                            style={{ cursor: "pointer", userSelect: "none", outline: activeStatCard === "attendance" ? "2px solid var(--accent)" : "none" }}
                            onClick={() => setActiveStatCard(c => c === "attendance" ? null : "attendance")}
                          >
                            <span className="rp-stat-card-label">{lang === "no" ? "Voteringsoppmøte" : "Voting attendance"}</span>
                            <div className="rp-stat-card-value-row">
                              <span className="rp-stat-card-value">{representativeStats.attendance}%</span>
                              <span className="rp-stat-card-sub">{lang === "no" ? `${representativeStats.attendedVotes} av ${representativeStats.possibleVotes}` : `${representativeStats.attendedVotes} of ${representativeStats.possibleVotes}`}</span>
                            </div>
                            <div className="rp-stat-progress-bg">
                              <div className="rp-stat-progress-fill" style={{ width: `${representativeStats.attendance}%` }} />
                            </div>
                            <div className="rp-stat-legend">
                              <div className="rp-legend-item"><span className="rp-legend-dot success" /><span className="rp-legend-text">{lang === "no" ? "Til stede" : "Present"}: <strong>{representativeStats.attendedVotes}</strong></span></div>
                              <div className="rp-legend-item"><span className="rp-legend-dot absent" /><span className="rp-legend-text">{lang === "no" ? "Fraværende" : "Absent"}: <strong>{representativeStats.possibleVotes - representativeStats.attendedVotes}</strong></span></div>
                            </div>
                            <span className="rp-stat-card-cta">{lang === "no" ? "Trykk for detaljer →" : "Tap for details →"}</span>
                          </div>

                          {/* Card 2: Forslag fremmet */}
                          <div
                            className="rp-stat-card"
                            style={{ cursor: "pointer", userSelect: "none", outline: activeStatCard === "proposals" ? "2px solid var(--accent)" : "none" }}
                            onClick={() => setActiveStatCard(c => c === "proposals" ? null : "proposals")}
                          >
                            <span className="rp-stat-card-label">{lang === "no" ? "Forslag fremmet" : "Proposals submitted"}</span>
                            <div className="rp-stat-card-value-row">
                              <span className="rp-stat-card-value">{statsSummary.totalProposals}</span>
                              <span className="rp-stat-card-sub">{lang === "no" ? "saker" : "cases"}</span>
                            </div>
                            <div className="rp-proportion-bar">
                              {statsSummary.totalProposals > 0 ? (
                                <>{statsSummary.passedProposals > 0 && <div className="rp-prop-fill success" style={{ width: `${(statsSummary.passedProposals / statsSummary.totalProposals) * 100}%` }} />}
                                {statsSummary.failedProposals > 0 && <div className="rp-prop-fill danger" style={{ width: `${(statsSummary.failedProposals / statsSummary.totalProposals) * 100}%` }} />}
                                {statsSummary.pendingProposals > 0 && <div className="rp-prop-fill warning" style={{ width: `${(statsSummary.pendingProposals / statsSummary.totalProposals) * 100}%` }} />}</>
                              ) : <div className="rp-prop-fill empty" style={{ width: "100%" }} />}
                            </div>
                            <div className="rp-stat-legend">
                              <div className="rp-legend-item"><span className="rp-legend-dot success" /><span className="rp-legend-text">{lang === "no" ? "Gått gjennom" : "Passed"}: <strong>{statsSummary.passedProposals}</strong></span></div>
                              <div className="rp-legend-item"><span className="rp-legend-dot danger" /><span className="rp-legend-text">{lang === "no" ? "Ikke gått gjennom" : "Not passed"}: <strong>{statsSummary.failedProposals}</strong></span></div>
                              <div className="rp-legend-item"><span className="rp-legend-dot warning" /><span className="rp-legend-text">{lang === "no" ? "Under behandling" : "In progress"}: <strong>{statsSummary.pendingProposals}</strong></span></div>
                            </div>
                            <span className="rp-stat-card-cta">{lang === "no" ? "Trykk for detaljer →" : "Tap for details →"}</span>
                          </div>

                          {/* Card 3: Voteringer */}
                          <div
                            className="rp-stat-card"
                            style={{ cursor: "pointer", userSelect: "none", outline: activeStatCard === "votes" ? "2px solid var(--accent)" : "none" }}
                            onClick={() => setActiveStatCard(c => c === "votes" ? null : "votes")}
                          >
                            <span className="rp-stat-card-label">{lang === "no" ? "Registrerte voteringer" : "Registered votes"}</span>
                            <div className="rp-stat-card-value-row">
                              <span className="rp-stat-card-value">{statsSummary.totalVotes}</span>
                              <span className="rp-stat-card-sub">{lang === "no" ? "stemmer" : "votes"}</span>
                            </div>
                            <div className="rp-proportion-bar">
                              {statsSummary.totalVotes > 0 ? (
                                <>{statsSummary.votedFor > 0 && <div className="rp-prop-fill success" style={{ width: `${(statsSummary.votedFor / statsSummary.totalVotes) * 100}%` }} />}
                                {statsSummary.votedAgainst > 0 && <div className="rp-prop-fill danger" style={{ width: `${(statsSummary.votedAgainst / statsSummary.totalVotes) * 100}%` }} />}
                                {statsSummary.absent > 0 && <div className="rp-prop-fill absent" style={{ width: `${(statsSummary.absent / statsSummary.totalVotes) * 100}%` }} />}</>
                              ) : <div className="rp-prop-fill empty" style={{ width: "100%" }} />}
                            </div>
                            <div className="rp-stat-legend">
                              <div className="rp-legend-item"><span className="rp-legend-dot success" /><span className="rp-legend-text">{lang === "no" ? "Stemt for" : "Voted for"}: <strong>{statsSummary.votedFor}</strong></span></div>
                              <div className="rp-legend-item"><span className="rp-legend-dot danger" /><span className="rp-legend-text">{lang === "no" ? "Stemt mot" : "Voted against"}: <strong>{statsSummary.votedAgainst}</strong></span></div>
                              {statsSummary.absent > 0 && <div className="rp-legend-item"><span className="rp-legend-dot absent" /><span className="rp-legend-text">{lang === "no" ? "Ikke til stede" : "Absent"}: <strong>{statsSummary.absent}</strong></span></div>}
                            </div>
                            <span className="rp-stat-card-cta">{lang === "no" ? "Trykk for detaljer →" : "Tap for details →"}</span>
                          </div>

                        </div>

                        {/* Data-kilde note */}
                        <p className="rp-stats-source-note">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                          {lang === "no"
                            ? "Statistikken er hentet fra Stortingets åpne API og oppdateres jevnlig. Dataene dekker inneværende sesjon (2025–2026)."
                            : "Statistics are fetched from the Storting's open API and updated regularly. Data covers the current session (2025–2026)."}
                        </p>
                      </div>
                    )}

                    <div className="rp-bio">
                      <p className="rp-bio-heading">{t.biography}</p>
                      {biographyLoading && <p className="rp-bio-status">{t.loadingBio}</p>}
                      {biographyError && (
                        <p className="rp-bio-status rp-bio-status-error">{biographyError}</p>
                      )}
                      {!biographyLoading && !biographyError && biography.length === 0 && (
                        <p className="rp-bio-status">{t.noBio}</p>
                      )}
                      {!biographyLoading && !biographyError && biography.length > 0 && (
                        <>
                          <button
                            type="button"
                            className="rp-bio-toggle"
                            aria-expanded={showBiography}
                            onClick={() => setShowBiography((c) => !c)}
                          >
                            {showBiography ? t.hideDetails : t.showBio}
                          </button>
                          {showBiography && (
                            <ul className="rp-bio-list">
                              {biography.map((item) => (
                                <li key={item.id} className="rp-bio-row">
                                  <p className="rp-bio-title">{item.title}</p>
                                  {item.subtitle && <p className="rp-bio-subtitle">{item.subtitle}</p>}
                                  {item.period && <p className="rp-bio-period">{item.period}</p>}
                                </li>
                              ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rep grid */}
            {visibleRepresentanter.length === 0 ? (
              <p className="rp-empty">{t.noForParty}</p>
            ) : (
              <div className="rp-grid">
                {visibleRepresentanter.map((rep) => {
                  const isSelected = selectedRepresentativeId === rep.id
                  const partyColor = getPartyColor(rep.parti)
                  return (
                    <article
                      key={`${rep.id}-${rep.fornavn}`}
                      className={`rp-card${isSelected ? " rp-card-active" : ""}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const next = isSelected ? null : rep.id
                        setSelectedRepresentativeId(next)
                        if (next) {
                          setTimeout(() => {
                            detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                          }, 50)
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          const next = isSelected ? null : rep.id
                          setSelectedRepresentativeId(next)
                          if (next) {
                            setTimeout(() => {
                              detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                            }, 50)
                          }
                        }
                      }}
                    >
                      {rep.erVara && (
                        <div className="rp-card-vara-badge">
                          {lang === "no" ? "VIKAR" : "SUBSTITUTE"}
                        </div>
                      )}
                      {rep.permisjon && (
                        <div className="rp-card-permisjon-badge">
                          {lang === "no" ? "I PERMISJON" : "ON LEAVE"}
                        </div>
                      )}
                      <div className="rp-card-img-wrap" style={{ "--party-color": partyColor } as React.CSSProperties}>
                        <img
                          className="rp-card-img"
                          src={getRepresentativeImageUrl(rep.id, "stort")}
                          alt={`${rep.fornavn} ${rep.etternavn}`}
                          loading="lazy"
                        />
                      </div>
                      <div className="rp-card-info">
                        <h3 className="rp-card-name">{rep.fornavn} {rep.etternavn}</h3>
                        {rep.erVara && rep.varaForNavn && (
                          <p className="rp-card-vara-for">
                            {lang === "no" ? `Vikarierer for ${rep.varaForNavn}` : `Substituting for ${rep.varaForNavn}`}
                          </p>
                        )}
                        {rep.permisjon && rep.erstattetAvNavn && (
                          <p className="rp-card-permisjon-for">
                            {lang === "no" ? `Erstattes av ${rep.erstattetAvNavn}` : `Replaced by ${rep.erstattetAvNavn}`}
                          </p>
                        )}
                        <p className="rp-card-age">
                          {rep.alder !== null ? `${rep.alder} ${t.years}` : t.ageUnknown}
                        </p>
                        <span
                          className="rp-card-party"
                          style={{ background: partyColor + "1a", color: partyColor, borderColor: partyColor + "44" }}
                        >
                          {rep.parti}
                        </span>
                      </div>
                      {isSelected && <span className="rp-card-tick" aria-hidden />}
                    </article>
                  )
                })}
              </div>
            )}

          </>
        )}
      </div>

      {/* ── STATS MODAL — position:fixed, eget scroll, utenfor all layout ── */}
      {activeStatCard && representativeStats && (
        <>
          {/* Backdrop */}
          <div
            className="rp-modal-backdrop"
            onClick={() => setActiveStatCard(null)}
            aria-hidden
          />
          {/* Modal */}
          <div className="rp-modal" role="dialog" aria-modal>
            {/* Header */}
            <div className="rp-modal-header">
              <div className="rp-modal-title-row">
                <div>
                  <p className="rp-modal-rep-name">
                    {selectedRepresentative?.fornavn} {selectedRepresentative?.etternavn}
                  </p>
                  <h2 className="rp-modal-title">
                    {activeStatCard === "attendance" && (lang === "no" ? "Voteringsoppmøte" : "Voting attendance")}
                    {activeStatCard === "proposals" && (lang === "no" ? "Forslag fremmet" : "Proposals submitted")}
                    {activeStatCard === "votes"     && (lang === "no" ? "Stemmehistorikk" : "Voting history")}
                  </h2>
                </div>
                <button
                  type="button"
                  className="rp-modal-close"
                  onClick={() => setActiveStatCard(null)}
                  aria-label={lang === "no" ? "Lukk" : "Close"}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              {/* Sammendrag-chips */}
              <div className="rp-modal-chips">
                {activeStatCard === "attendance" && (
                  <>
                    <span className="rp-modal-chip rp-modal-chip--success">{lang === "no" ? "Til stede" : "Present"}: {representativeStats.attendedVotes}</span>
                    <span className="rp-modal-chip rp-modal-chip--absent">{lang === "no" ? "Fraværende" : "Absent"}: {representativeStats.possibleVotes - representativeStats.attendedVotes}</span>
                    <span className="rp-modal-chip rp-modal-chip--neutral">{representativeStats.attendance}%</span>
                  </>
                )}
                {activeStatCard === "proposals" && statsSummary && (
                  <>
                    <span className="rp-modal-chip rp-modal-chip--success">{lang === "no" ? "Vedtatt" : "Passed"}: {statsSummary.passedProposals}</span>
                    <span className="rp-modal-chip rp-modal-chip--danger">{lang === "no" ? "Forkastet" : "Rejected"}: {statsSummary.failedProposals}</span>
                    <span className="rp-modal-chip rp-modal-chip--warning">{lang === "no" ? "Under behandling" : "Pending"}: {statsSummary.pendingProposals}</span>
                  </>
                )}
                {activeStatCard === "votes" && statsSummary && (
                  <>
                    <span className="rp-modal-chip rp-modal-chip--success">{lang === "no" ? "For" : "For"}: {statsSummary.votedFor}</span>
                    <span className="rp-modal-chip rp-modal-chip--danger">{lang === "no" ? "Mot" : "Against"}: {statsSummary.votedAgainst}</span>
                    <span className="rp-modal-chip rp-modal-chip--absent">{lang === "no" ? "Fraværende" : "Absent"}: {statsSummary.absent}</span>
                  </>
                )}
              </div>
            </div>

            {/* Scrollbar innhold */}
            <div className="rp-modal-body">

              {/* OPPMØTE */}
              {activeStatCard === "attendance" && (() => {
                const absentVotes = representativeStats.votes.filter(v =>
                  v.vote === "Ikke til stede" || v.vote === "Absent"
                )
                const presentVotes = representativeStats.votes.filter(v =>
                  v.vote !== "Ikke til stede" && v.vote !== "Absent"
                )
                return (
                  <>
                    {absentVotes.length > 0 && (
                      <p className="rp-modal-section-label">{lang === "no" ? `Fraværende voteringer (${absentVotes.length})` : `Absent votes (${absentVotes.length})`}</p>
                    )}
                    {absentVotes.map((v, i) => (
                      <div key={i} className="rp-modal-row rp-modal-row--absent">
                        <span className="rp-modal-badge rp-badge--absent">{v.vote}</span>
                        <span className="rp-modal-text">{v.title}</span>
                        <span className={`rp-modal-outcome rp-outcome--${v.outcomeType}`}>{v.outcome}</span>
                      </div>
                    ))}
                    {presentVotes.length > 0 && (
                      <p className="rp-modal-section-label" style={{ marginTop: absentVotes.length ? 16 : 0 }}>{lang === "no" ? `Til stede (utvalg, ${presentVotes.length})` : `Present (sample, ${presentVotes.length})`}</p>
                    )}
                    {presentVotes.map((v, i) => {
                      const isFor = v.vote === "Stemt for" || v.vote === "Voted for"
                      return (
                        <div key={i} className={`rp-modal-row rp-modal-row--${isFor ? "for" : "mot"}`}>
                          <span className={`rp-modal-badge rp-badge--${isFor ? "success" : "danger"}`}>{v.vote}</span>
                          <span className="rp-modal-text">{v.title}</span>
                          <span className={`rp-modal-outcome rp-outcome--${v.outcomeType}`}>{v.outcome}</span>
                        </div>
                      )
                    })}
                  </>
                )
              })()}

              {/* FORSLAG */}
              {activeStatCard === "proposals" && (() => {
                const allProps = [
                  ...representativeStats.proposals.map(p => ({ ...p, group: lang === "no" ? "Representantforslag (Dok. 8)" : "Representative proposals" })),
                  ...representativeStats.submitted.map(p => ({ ...p, group: lang === "no" ? "Fremmede forslag" : "Submitted proposals" })),
                ]
                return allProps.length === 0
                  ? <p className="rp-modal-empty">{lang === "no" ? "Ingen forslag funnet." : "No proposals found."}</p>
                  : allProps.map((p, i) => (
                    <div key={i} className="rp-modal-row">
                      <div className="rp-modal-row-top">
                        <span className="rp-modal-id">{p.id}</span>
                        <span className={`rp-modal-badge rp-badge--${p.statusType}`}>{p.status}</span>
                      </div>
                      <span className="rp-modal-text">{p.title}</span>
                    </div>
                  ))
              })()}

              {/* VOTERINGER */}
              {activeStatCard === "votes" && (
                representativeStats.votes.length === 0
                  ? <p className="rp-modal-empty">{lang === "no" ? "Ingen stemmer funnet." : "No votes found."}</p>
                  : representativeStats.votes.map((v, i) => {
                    const isFor = v.vote === "Stemt for" || v.vote === "Voted for"
                    const isMot = v.vote === "Stemt mot" || v.vote === "Voted against"
                    return (
                      <div key={i} className={`rp-modal-row rp-modal-row--${isFor ? "for" : isMot ? "mot" : "absent"}`}>
                        <span className={`rp-modal-badge rp-badge--${isFor ? "success" : isMot ? "danger" : "absent"}`}>{v.vote}</span>
                        <span className="rp-modal-text">{v.title}</span>
                        <span className={`rp-modal-outcome rp-outcome--${v.outcomeType}`}>{v.outcome}</span>
                      </div>
                    )
                  })
              )}

            </div>
          </div>
        </>
      )}

    </div>
  )
}
