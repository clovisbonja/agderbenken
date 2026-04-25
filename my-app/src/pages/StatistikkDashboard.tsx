/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STATISTIKK DASHBOARD — src/pages/StatistikkDashboard.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Fullt statistikk-dashboard for Agderbenkens saker på Stortinget.
 * Henter og kategoriserer data fra Stortingets åpne XML-API.
 *
 * Inneholder:
 *   - Oversiktskort (KPI-er): totalt antall saker, behandlede, aktive
 *   - Temafordeling med søkefunksjon
 *   - Saksliste per tema med sortering og filtrering
 *   - Aktivitetsgraf (månedstrend)
 *
 * Kategorisering skjer via src/lib/categorizationEngine.ts.
 * CSS finnes i src/styles/statistikk.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useMemo, useRef, useState } from "react"
import {
  categorizeCases,
  getAllThemes,
  searchCases,
  type CaseItem,
  type ThemeKey,
} from "../lib/categorizationEngine"

type Lang = "no" | "en"
type Props = { lang: Lang }
type CaseDetail = {
  title: string
  shortTitle: string
  reference: string
  recommendation: string
  decision: string
  shortDecision: string
}

const TEXT: Record<Lang, Record<string, string>> = {
  no: {
    statsLead: "Denne siden samler alle saker fra Stortingets API i én oversikt. Du kan søke, velge tema, åpne enkeltsaker og få rask innsikt i status og utvikling.",
    howToUse: "Slik bruker du siden",
    introStep1Title: "Finn saker raskt",
    introStep1Text: "Bruk søkefeltet for å finne saker på tittel, komité, type, status eller saksnummer.",
    introStep2Title: "Velg tema og sammenlign",
    introStep2Text: "Bytt mellom temaene for å se hva som dominerer og hvilke saker som hører sammen.",
    introStep3Title: "Forstå helheten",
    introStep3Text: "Nederst ser du nøkkeltall, statusfordeling og komitéaktivitet.",
    cases: "saker",
    session: "Sesjon",
    updated: "Sist oppdatert",
    searchPlaceholder: "Søk i alle saker (tittel, komité, type, status eller saksnummer)...",
    loading: "Laster saker...",
    noCases: "Ingen saker funnet",
    selectCase: "Velg en sak",
    status: "Status",
    type: "Type",
    date: "Dato",
    selectedCaseHelp: "Her ser du detaljer for saken du har valgt, med lenke til originalkilden.",
    openCase: "Åpne saken hos Stortinget",
    caseId: "Saksnummer",
    caseInfoTitle: "Sammendrag av saken",
    caseInfoLoading: "Laster mer info om saken...",
    caseInfoMissing: "Fant ikke mer info om denne saken.",
    quickRead: "Kort fortalt",
    reference: "Hentet fra",
    decisionText: "Dette ble bestemt",
    shortDecision: "Kort forklart",
    latestCase: "Nyeste sak",
    latestCaseDesc: "Siste registrerte sak fra Stortingets API",
    footer: "Data hentet fra Stortinget",
  },
  en: {
    statsLead: "This page gathers all cases from the Storting API in one overview. You can search, select a theme, open individual cases and quickly understand status and trends.",
    howToUse: "How to use this page",
    introStep1Title: "Find cases quickly",
    introStep1Text: "Use the search field to find cases by title, committee, type, status or case number.",
    introStep2Title: "Select a theme and compare",
    introStep2Text: "Switch between themes to see what dominates and which cases belong together.",
    introStep3Title: "Understand the full picture",
    introStep3Text: "Further down you get key numbers, status distribution and committee activity.",
    cases: "cases",
    session: "Session",
    updated: "Last updated",
    searchPlaceholder: "Search all cases (title, committee, type, status or case ID)...",
    loading: "Loading cases...",
    noCases: "No cases found",
    selectCase: "Select a case",
    status: "Status",
    type: "Type",
    date: "Date",
    selectedCaseHelp: "Details for the selected case, including a direct link to the source.",
    openCase: "Open case at Stortinget",
    caseId: "Case number",
    caseInfoTitle: "Case summary",
    caseInfoLoading: "Loading more case info...",
    caseInfoMissing: "Could not find more info for this case.",
    quickRead: "In short",
    reference: "Fetched from",
    decisionText: "This was decided",
    shortDecision: "In short",
    latestCase: "Latest case",
    latestCaseDesc: "Most recently registered case from the Storting API",
    footer: "Data from Stortinget",
  },
}

const THEME_LABELS: Record<Lang, Record<ThemeKey, string>> = {
  no: { klima: "Klima", helse: "Helse", utdanning: "Utdanning", økonomi: "Økonomi", samferdsel: "Samferdsel", justis: "Justis", distrikt: "Distrikt" },
  en: { klima: "Climate", helse: "Health", utdanning: "Education", økonomi: "Economy", samferdsel: "Transport", justis: "Justice", distrikt: "Districts" },
}

const THEME_BLURBS: Record<Lang, Record<ThemeKey, string>> = {
  no: {
    klima: "Klima, miljø og naturmangfold",
    helse: "Helse, sykehus og omsorg",
    utdanning: "Skole, forskning og kompetanse",
    økonomi: "Budsjett, skatt og arbeidsliv",
    samferdsel: "Vei, tog og kollektiv",
    justis: "Politi, rett og lovgivning",
    distrikt: "Landbruk, fiskeri og bygd",
  },
  en: {
    klima: "Climate, environment and nature",
    helse: "Health, hospitals and care",
    utdanning: "Schools, research and skills",
    økonomi: "Budget, tax and working life",
    samferdsel: "Roads, rail and transit",
    justis: "Police, courts and legislation",
    distrikt: "Agriculture, fisheries and rural",
  },
}

const THEME_POPUP_INFO: Record<ThemeKey, { no: string; en: string }> = {
  klima: {
    no: "Saker som handler om klimaendringer, miljøvern, naturmangfold og det grønne skiftet. Her finner du stortingssaker om utslipp, fornybar energi og bærekraftig utvikling.",
    en: "Cases about climate change, environmental protection, biodiversity and the green transition.",
  },
  helse: {
    no: "Saker om helsetjenester, sykehus, legemidler, psykisk helse og omsorgstjenester. Inkluderer alt fra fastlegeordningen til spesialisthelsetjenesten.",
    en: "Cases about health services, hospitals, medications, mental health and care services.",
  },
  utdanning: {
    no: "Saker om barnehage, grunnskole, videregående, universiteter og forskning. Her samles alt som handler om opplæring og kompetansebygging.",
    en: "Cases about kindergartens, schools, universities and research.",
  },
  økonomi: {
    no: "Saker om statsbudsjettet, skatter, avgifter, arbeidsliv og næringspolitikk. Inkluderer trygd, pensjon og NAV.",
    en: "Cases about the state budget, taxes, labor and business policy.",
  },
  samferdsel: {
    no: "Saker om vei, jernbane, kollektivtransport, ferjer og digital infrastruktur. Alt som handler om å komme seg rundt i landet.",
    en: "Cases about roads, railways, public transport and ferries.",
  },
  justis: {
    no: "Saker om politi, domstolene, kriminalitetsbekjempelse og lovgivning. Her finner du saker om rettssikkerhet og rettsvesenet.",
    en: "Cases about police, courts, crime prevention and legislation.",
  },
  distrikt: {
    no: "Saker om landbruk, fiskeri, distriktspolitikk og kommuneøkonomi. Relevant for Agder og Sørlandsregionens særegne utfordringer og muligheter.",
    en: "Cases about agriculture, fisheries, regional policy and local government.",
  },
}

function parseXml(xml: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, "text/xml")
  if (doc.documentElement.tagName === "parsererror") throw new Error("Failed to parse XML")
  return doc
}

function nodesByName(parent: ParentNode, name: string): Element[] {
  return Array.from((parent as Document).getElementsByTagNameNS?.("*", name) || [])
}

function childByName(parent: Element | null | undefined, name: string): Element | null {
  if (!parent) return null
  return Array.from(parent.children).find((node) => node.localName === name) ?? null
}

function childText(parent: Element | null | undefined, name: string): string {
  return childByName(parent, name)?.textContent?.trim() || ""
}

function sessionIdNow(): string {
  const now = new Date()
  const start = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${start + 1}`
}

function fmtDate(value: string, lang: Lang): string {
  if (!value) return "-"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(lang === "no" ? "no-NO" : "en-GB")
}

function dateSortValue(value: string): number {
  if (!value) return 0
  const t = new Date(value).getTime()
  return Number.isNaN(t) ? 0 : t
}

function normalizeStatus(value: string): string {
  return String(value || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
}

function friendlyStatus(status: string, lang: Lang): string {
  const key = normalizeStatus(status)
  const mapNo: Record<string, string> = {
    behandlet: "Ferdig behandlet",
    til_behandling: "Behandles nå",
    mottatt: "Nettopp mottatt",
    varslet: "Varslet sak",
    trukket: "Trukket tilbake",
    bortfalt: "Ikke lenger aktuell",
  }
  const mapEn: Record<string, string> = {
    behandlet: "Finished",
    til_behandling: "Being processed now",
    mottatt: "Just received",
    varslet: "Announced case",
    trukket: "Withdrawn",
    bortfalt: "No longer active",
  }
  return (lang === "no" ? mapNo[key] : mapEn[key]) || status
}

function ThemeSymbol({ theme }: { theme: ThemeKey }) {
  if (theme === "klima") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    )
  }
  if (theme === "helse") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    )
  }
  if (theme === "utdanning") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    )
  }
  if (theme === "økonomi") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    )
  }
  if (theme === "samferdsel") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <rect x="3" y="7" width="18" height="9" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="8" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="16" cy="18" r="1.8" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (theme === "justis") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22V2M2 12h20M5 7l7-5 7 5M5 17l7 5 7-5"/>
      </svg>
    )
  }
  if (theme === "distrikt") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function caseTypeIcon(type: string): { cls: string; svg: React.ReactNode } {
  const t = type.toLowerCase()
  if (t.includes("representantforslag") || t.includes("dok 8")) {
    return {
      cls: "icon-blue",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>
        </svg>
      ),
    }
  }
  if (t.includes("prop") || t.includes("lovforslag") || t.includes("lovproposisjon")) {
    return {
      cls: "icon-blue",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 7h6M9 12h6M9 17h3"/><path d="M15 12l2-2-2-2"/>
        </svg>
      ),
    }
  }
  if (t.includes("budsjett") || t.includes("bevilgning") || t.includes("skattevedtak")) {
    return {
      cls: "icon-green",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9"/><path d="M12 7v2M12 15v2M9.5 10a2.5 2.5 0 0 1 5 0c0 3-5 3-5 5h5"/>
        </svg>
      ),
    }
  }
  if (t.includes("melding") || t.includes("stortingsmelding")) {
    return {
      cls: "icon-green",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2 3h20v14H2zM2 3l10 9L22 3"/>
        </svg>
      ),
    }
  }
  if (t.includes("interpellasjon") || t.includes("spørsmål") || t.includes("spørretime")) {
    return {
      cls: "icon-purple",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    }
  }
  if (t.includes("innstilling") || t.includes("samferdsel") || t.includes("transport")) {
    return {
      cls: "icon-amber",
      svg: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="1" y="8" width="18" height="9" rx="2"/><path d="M1 12h18M5 17v2M14 17v2"/><path d="M19 9l3 3-3 3"/>
        </svg>
      ),
    }
  }
  // fallback
  return {
    cls: "icon-blue",
    svg: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 7h8M8 11h8M8 15h4"/>
      </svg>
    ),
  }
}

export default function StatistikkDashboard({ lang }: Props) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey | null>(null)
  const [stripTheme, setStripTheme] = useState<ThemeKey>("klima")
  const [searchTerm, setSearchTerm] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const [allCases, setAllCases] = useState<CaseItem[]>([])
  const [categorizedCases, setCategorizedCases] = useState<Record<ThemeKey, CaseItem[]>>({
    klima: [], helse: [], utdanning: [], økonomi: [], samferdsel: [], justis: [], distrikt: [],
  })
  const [themePanel, setThemePanel] = useState<ThemeKey | null>(null)
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null)
  const detailRef = useRef<HTMLElement>(null)
  const [loadingCaseDetail, setLoadingCaseDetail] = useState(false)

  const [showHowTo, setShowHowTo] = useState<boolean>(() => {
    try { return localStorage.getItem("sorblikket-howto-seen") !== "true" } catch { return true }
  })
  function dismissHowTo() {
    setShowHowTo(false)
    try { localStorage.setItem("sorblikket-howto-seen", "true") } catch {}
  }
  function openHowTo() { setShowHowTo(true) }

  useEffect(() => {
    const handler = () => setShowHowTo(true)
    window.addEventListener("open-howto", handler)
    return () => window.removeEventListener("open-howto", handler)
  }, [])

  const [cookieAccepted, setCookieAccepted] = useState<boolean>(() => {
    try { return localStorage.getItem("agder-cookies-ok") === "true" } catch { return false }
  })
  function acceptCookies() {
    setCookieAccepted(true)
    try { localStorage.setItem("agder-cookies-ok", "true") } catch {}
  }

  const t = (key: string) => TEXT[lang][key] || key
  const themes = getAllThemes()

  useEffect(() => {
    async function fetchCases() {
      setLoading(true)
      try {
        const sid = sessionIdNow()
        setSessionId(sid)

        const res = await fetch(`https://data.stortinget.no/eksport/saker?sesjonid=${sid}`)
        const doc = parseXml(await res.text())
        const sakNodes = nodesByName(doc, "sak")

        const map = new Map<string, CaseItem>()
        sakNodes.forEach((node) => {
          const id = childText(node, "id")
          const title = childText(node, "tittel")
          const shortTitle = childText(node, "korttittel") || title
          if (!id || !title) return

          const komite = childByName(node, "komite")
          map.set(id, {
            id,
            title,
            shortTitle,
            type: childText(node, "type") || "ukjent",
            status: childText(node, "status") || "ukjent",
            date: childText(node, "dato") || childText(node, "sist_oppdatert_dato"),
            committee: childText(komite, "navn") || "Mangler komiténavn",
          })
        })

        const cases = Array.from(map.values())
        const categorized = categorizeCases(cases)
        const allCategorized = Object.values(categorized)
          .flat()
          .sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))

        setAllCases(allCategorized)
        setCategorizedCases(categorized)
        setUpdatedAt(new Date())

        const first = allCategorized[0] || null
        setSelectedCase(first)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchCases()
    const interval = setInterval(fetchCases, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (allCases.length === 0) return
    if (!selectedCase || !allCases.some((c) => c.id === selectedCase.id)) {
      setSelectedCase(allCases[0])
    }
  }, [allCases, selectedCase])

  const totalCases = allCases.length

  // Global counts across ALL cases (not theme-filtered)
  const globalBehandlet = allCases.filter(c => String(c.status || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_") === "behandlet").length
  const globalAktive = allCases.filter(c => String(c.status || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_") === "til_behandling").length
  const globalMottatt = allCases.filter(c => String(c.status || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_") === "mottatt").length

  const themeCards = useMemo(() => {
    const safeTotal = Math.max(1, totalCases)
    return (Object.keys(themes) as ThemeKey[]).map((key) => ({
      key,
      name: THEME_LABELS[lang][key],
      count: categorizedCases[key].length,
      pct: Math.round((categorizedCases[key].length / safeTotal) * 100),
      color: themes[key].color,
      accentColor: themes[key].accentColor,
    }))
  }, [categorizedCases, lang, themes, totalCases])

  const monthTrend = useMemo(() => {
    const map = new Map<string, number>()
    allCases.forEach((c) => {
      if (!c.date) return
      const key = c.date.slice(0, 7)
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-8)
      .map(([label, value]) => ({ label, value }))
  }, [allCases])

  const topCommittees = useMemo(() => {
    const map = new Map<string, number>()
    allCases.forEach((c) => {
      const key = c.committee || "Mangler komiténavn"
      map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  }, [allCases])

  const caseTypes = useMemo(() => {
    const map = new Map<string, number>()
    allCases.forEach((c) => {
      const t = (c.type || "Ukjent").trim()
      map.set(t, (map.get(t) || 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [allCases])

  const missingCommittee = useMemo(
    () => allCases.filter(c => !c.committee || c.committee === "Mangler komiténavn").length,
    [allCases]
  )

  const uniqueCommittees = useMemo(
    () => new Set(allCases.filter(c => c.committee && c.committee !== "Mangler komiténavn").map(c => c.committee)).size,
    [allCases]
  )

  const avgPerMonth = monthTrend.length > 0
    ? Math.round(monthTrend.reduce((s, m) => s + m.value, 0) / monthTrend.length)
    : 0

  const peakMonth = monthTrend.length > 0
    ? monthTrend.reduce((best, m) => m.value > best.value ? m : best)
    : null


  const combinedCases = useMemo(() => {
    let items = searchTerm.trim() ? searchCases(allCases, searchTerm) : allCases
    if (selectedTheme) items = items.filter((c) => (categorizedCases[selectedTheme] || []).some((x) => x.id === c.id))
    return [...items].sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))
  }, [allCases, searchTerm, selectedTheme, categorizedCases])

  const latestCase = useMemo(
    () => [...allCases].sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))[0] || null,
    [allCases]
  )

  useEffect(() => {
    if (!selectedCase?.id) {
      setSelectedCaseDetail(null)
      return
    }

    async function fetchCaseDetail(caseId: string) {
      setLoadingCaseDetail(true)
      try {
        const res = await fetch(`https://data.stortinget.no/eksport/sak?sakid=${caseId}`)
        const doc = parseXml(await res.text())
        const root = doc.documentElement

        setSelectedCaseDetail({
          title: childText(root, "tittel"),
          shortTitle: childText(root, "korttittel"),
          reference: childText(root, "henvisning"),
          recommendation: childText(root, "innstillingstekst"),
          decision: childText(root, "vedtakstekst"),
          shortDecision: childText(root, "kortvedtak"),
        })
      } catch (err) {
        console.error(err)
        setSelectedCaseDetail(null)
      } finally {
        setLoadingCaseDetail(false)
      }
    }

    fetchCaseDetail(selectedCase.id)
  }, [selectedCase?.id])

  return (
    <main className="home-page">
      <section className="home-theme-strip">
        {themeCards.map((card) => (
          <article
            key={`strip-${card.key}`}
            className={`home-theme-strip-card ${stripTheme === card.key ? "active" : ""}`}
            onClick={() => { setStripTheme(card.key); setThemePanel(card.key); }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") { setStripTheme(card.key); setThemePanel(card.key); }
            }}
          >
            <span className={`home-theme-symbol theme-${card.key}`}>
              <ThemeSymbol theme={card.key} />
            </span>
            <p>{card.name}</p>
            <small className="home-theme-strip-note">{THEME_BLURBS[lang][card.key]}</small>
          </article>
        ))}
      </section>

      {/* Side panel — erstatter popup */}
      <div
        className={`theme-panel-backdrop${themePanel ? " theme-panel-backdrop--open" : ""}`}
        onClick={() => setThemePanel(null)}
        aria-hidden={!themePanel}
      />
      <aside
        className={`theme-side-panel${themePanel ? " theme-side-panel--open" : ""}`}
        role="dialog"
        aria-modal
        aria-label={themePanel ? themes[themePanel]?.name : undefined}
      >
        {themePanel && (
          <>
            <div className="theme-side-panel-header">
              <div className={`theme-side-panel-icon theme-${themePanel}`}>
                <ThemeSymbol theme={themePanel} />
              </div>
              <div>
                <p className="theme-side-panel-kicker">{lang === "no" ? "Temaforklaring" : "Theme info"}</p>
                <h2 className="theme-side-panel-title">{themes[themePanel]?.name}</h2>
              </div>
              <button
                className="theme-side-panel-close"
                onClick={() => setThemePanel(null)}
                aria-label="Lukk"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="theme-side-panel-body">
              <p className="theme-side-panel-desc">
                {lang === "no" ? THEME_POPUP_INFO[themePanel].no : THEME_POPUP_INFO[themePanel].en}
              </p>
              <div className="theme-side-panel-stats">
                <div className="theme-side-panel-stat">
                  <strong>{categorizedCases[themePanel]?.length ?? 0}</strong>
                  <span>{lang === "no" ? "saker i dette temaet" : "cases in this theme"}</span>
                </div>
                <div className="theme-side-panel-stat">
                  <strong>{totalCases > 0 ? Math.round((categorizedCases[themePanel]?.length ?? 0) / totalCases * 100) : 0}%</strong>
                  <span>{lang === "no" ? "andel av alle saker" : "share of all cases"}</span>
                </div>
              </div>
              <div className="theme-side-panel-how">
                <h3>{lang === "no" ? "Slik brukes temaet" : "How this theme is used"}</h3>
                <p>{lang === "no"
                  ? "Saker kategoriseres automatisk basert på nøkkelord i tittel, type og komiténavn fra Stortingets åpne API. Kategoriseringen oppdateres ved hvert sidebesøk."
                  : "Cases are categorized automatically based on keywords in the title, type and committee name from the Storting open API. The categorization updates on each page visit."}
                </p>
              </div>
              <button
                className="theme-side-panel-filter-btn"
                onClick={() => {
                setSelectedTheme(themePanel)
                setThemePanel(null)
                setTimeout(() => {
                  const el = document.querySelector('.home-unified-explorer')
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80
                    window.scrollTo({ top: y, behavior: 'smooth' })
                  }
                }, 80)
              }}
              >
                {lang === "no" ? `Vis alle saker i ${themes[themePanel]?.name}` : `Show all ${themes[themePanel]?.name} cases`}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14M13 6l6 6-6 6"/>
                </svg>
              </button>
            </div>
          </>
        )}
      </aside>

      {latestCase && (
        <section className="home-latest-case">
          <small>
            <span className="home-pill-new">{t("latestCase")}</span> {t("latestCaseDesc")}
          </small>
          <h3>{latestCase.shortTitle}</h3>
          <p>{latestCase.committee}</p>
          <div>
            <span>{fmtDate(latestCase.date, lang)}</span>
          </div>
        </section>
      )}

      <div className="page-section-divider">
        <h2 className="page-section-heading">{lang === "no" ? "Saker" : "Cases"}</h2>
        <span className="page-section-count">{combinedCases.length} {lang === "no" ? "saker" : "cases"}</span>
      </div>

      <section className="home-unified-explorer home-dashboard-block">
        <div className="home-unified-search">
          <svg className="home-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            className="home-unified-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t("searchPlaceholder")}
          />
          {searchTerm && (
            <button type="button" className="home-unified-clear" onClick={() => setSearchTerm("")} aria-label="Nullstill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <div className="home-unified-filters">
          <button
            type="button"
            className={`home-unified-filter-btn ${selectedTheme === null ? "active" : ""}`}
            onClick={() => setSelectedTheme(null)}
            style={selectedTheme === null ? { borderBottom: "2px solid currentColor", color: "var(--text)", background: "var(--surface)" } : {}}
          >
            {lang === "no" ? "Alle" : "All"}
          </button>
          {(Object.keys(themes) as ThemeKey[]).map((key) => (
            <button
              type="button"
              key={key}
              className={`home-unified-filter-btn ${selectedTheme === key ? "active" : ""}`}
              onClick={() => setSelectedTheme(key)}
              style={selectedTheme === key ? { borderBottom: "2px solid currentColor", color: "var(--text)", background: "var(--surface)" } : {}}
            >
              <span className={`home-theme-symbol theme-${key}`}><ThemeSymbol theme={key} /></span>
              {THEME_LABELS[lang][key]}
              <span className="home-filter-count">{categorizedCases[key].length}</span>
            </button>
          ))}
        </div>
        <div className="home-unified-results">
          <span className="home-unified-count">{combinedCases.length} {t("cases")}</span>
        </div>
        <div className="home-unified-list">
          {loading ? (
            <p className="home-unified-status">{t("loading")}</p>
          ) : combinedCases.length === 0 ? (
            <p className="home-unified-status">{t("noCases")}</p>
          ) : (
            combinedCases.map((item) => {
              const icon = caseTypeIcon(item.type)
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`home-case-btn ${selectedCase?.id === item.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedCase(item)
                    setTimeout(() => {
                      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                    }, 50)
                  }}
                >
                  <div className={`home-case-btn-icon ${icon.cls}`}>
                    {icon.svg}
                  </div>
                  <div className="home-case-btn-body">
                    <div className="home-case-btn-main">
                      <span className="home-case-btn-title">{item.shortTitle}</span>
                      <span className="home-case-btn-type">{item.type}</span>
                    </div>
                    <div className="home-case-btn-meta">
                      <span className="home-case-btn-committee">{item.committee}</span>
                      <div className="home-case-btn-meta-right">
                        <span className={`home-case-status-badge home-case-status--${normalizeStatus(item.status)}`}>
                          {friendlyStatus(item.status, lang)}
                        </span>
                        <span className="home-case-btn-date">{fmtDate(item.date, lang)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </section>

      <p className="home-section-note">{t("selectedCaseHelp")}</p>
      <section className="home-grid detail-only home-dashboard-block" ref={detailRef}>
        <article className="home-detail">
          {selectedCase ? (
            <>
              <header className="home-detail-header-neutral">
                <div className="home-detail-topline">
                  <small>{t("caseId")}: {selectedCase.id}</small>
                  <a
                    className="home-case-link"
                    href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${selectedCase.id}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("openCase")}
                  </a>
                </div>
                <h2>{selectedCase.shortTitle}</h2>
                <p>{selectedCase.committee}</p>
                <div className="home-detail-meta-cards">
                  <article>
                    <span>{t("status")}</span>
                    <strong>{friendlyStatus(selectedCase.status, lang)}</strong>
                  </article>
                  <article>
                    <span>{t("type")}</span>
                    <strong>{selectedCase.type}</strong>
                  </article>
                  <article>
                    <span>{t("date")}</span>
                    <strong>{fmtDate(selectedCase.date, lang)}</strong>
                  </article>
                </div>
              </header>

              <section>
                <h3>{t("caseInfoTitle")}</h3>
                {loadingCaseDetail ? (
                  <p>{t("caseInfoLoading")}</p>
                ) : selectedCaseDetail ? (
                  <div className="home-case-info">
                    {(selectedCaseDetail.shortDecision || selectedCaseDetail.decision || selectedCaseDetail.recommendation) && (
                      <article className="home-case-summary">
                        <strong>{t("quickRead")}:</strong>{" "}
                        {selectedCaseDetail.shortDecision || selectedCaseDetail.decision || selectedCaseDetail.recommendation}
                      </article>
                    )}
                    {selectedCaseDetail.reference && (
                      <p>
                        <strong>{t("reference")}:</strong> {selectedCaseDetail.reference}
                      </p>
                    )}
                    {selectedCaseDetail.decision && (
                      <p>
                        <strong>{t("decisionText")}:</strong> {selectedCaseDetail.decision}
                      </p>
                    )}
                    {selectedCaseDetail.shortDecision && (
                      <p>
                        <strong>{t("shortDecision")}:</strong> {selectedCaseDetail.shortDecision}
                      </p>
                    )}
                    {!selectedCaseDetail.reference &&
                      !selectedCaseDetail.decision &&
                      !selectedCaseDetail.shortDecision && <p>{t("caseInfoMissing")}</p>}
                  </div>
                ) : (
                  <p>{t("caseInfoMissing")}</p>
                )}
              </section>
            </>
          ) : (
            <p>{t("selectCase")}</p>
          )}
        </article>
      </section>

      {/* ═══ SIGNAL DASHBOARD ═══ */}
      <div className="page-section-divider">
        <h2 className="page-section-heading">{lang === "no" ? "Statistikk" : "Statistics"}</h2>
        <span className="page-section-count">{lang === "no" ? `Sesjon ${sessionId}` : `Session ${sessionId}`}</span>
      </div>

      <div className="sig-dashboard">

        {/* KPI row */}
        <div className="sig-kpi-row">
          <div className="sig-kpi sig-kpi--hero">
            <span className="sig-kpi-label">{lang === "no" ? "Saker totalt" : "Total cases"}</span>
            <span className="sig-kpi-value">{totalCases || "—"}</span>
            <span className="sig-kpi-sub">{lang === "no" ? "Registrert denne sesjonen" : "Registered this session"}</span>
          </div>
          <div className="sig-kpi sig-kpi--green">
            <span className="sig-kpi-label">{lang === "no" ? "Behandlet" : "Processed"}</span>
            <span className="sig-kpi-value">{globalBehandlet}</span>
            <span className="sig-kpi-sub">{totalCases > 0 ? `${Math.round(globalBehandlet / totalCases * 100)}% fullført` : "—"}</span>
            <div className="sig-kpi-bar">
              <div className="sig-kpi-bar-fill sig-kpi-bar-fill--green" style={{ width: `${totalCases > 0 ? Math.round(globalBehandlet / totalCases * 100) : 0}%` }} />
            </div>
          </div>
          <div className="sig-kpi sig-kpi--blue">
            <span className="sig-kpi-label">{lang === "no" ? "Til behandling" : "In progress"}</span>
            <span className="sig-kpi-value">{globalAktive}</span>
            <span className="sig-kpi-sub">{totalCases > 0 ? `${Math.round(globalAktive / totalCases * 100)}% pågående` : "—"}</span>
            <div className="sig-kpi-bar">
              <div className="sig-kpi-bar-fill sig-kpi-bar-fill--blue" style={{ width: `${totalCases > 0 ? Math.round(globalAktive / totalCases * 100) : 0}%` }} />
            </div>
          </div>
          <div className="sig-kpi sig-kpi--amber">
            <span className="sig-kpi-label">{lang === "no" ? "I kø" : "In queue"}</span>
            <span className="sig-kpi-value">{globalMottatt}</span>
            <span className="sig-kpi-sub">{totalCases > 0 ? `${Math.round(globalMottatt / totalCases * 100)}% i kø` : "—"}</span>
            <div className="sig-kpi-bar">
              <div className="sig-kpi-bar-fill sig-kpi-bar-fill--amber" style={{ width: `${totalCases > 0 ? Math.round(globalMottatt / totalCases * 100) : 0}%` }} />
            </div>
          </div>
        </div>

        {/* Progress track */}
        {totalCases > 0 && (
          <div className="sig-track-section">
            <div className="sig-track-header">
              <span className="sig-track-title">
                {lang === "no" ? `Sesjonsfremdrift · ${sessionId}` : `Session progress · ${sessionId}`}
              </span>
              <span className="sig-track-pct">
                {Math.round(globalBehandlet / totalCases * 100)}% {lang === "no" ? "behandlet" : "processed"}
              </span>
            </div>
            <div className="sig-track">
              <div className="sig-track-fill sig-track-fill--green" style={{ flex: Math.max(1, globalBehandlet) }} />
              <div className="sig-track-fill sig-track-fill--blue" style={{ flex: Math.max(1, globalAktive) }} />
              <div className="sig-track-fill sig-track-fill--gray" style={{ flex: Math.max(1, totalCases - globalBehandlet - globalAktive) }} />
            </div>
            <div className="sig-track-legend">
              <div className="sig-track-legend-item">
                <span className="sig-track-dot" style={{ background: "#16a34a" }} />
                {globalBehandlet} {lang === "no" ? "Behandlet" : "Processed"}
              </div>
              <div className="sig-track-legend-item">
                <span className="sig-track-dot" style={{ background: "#3b82f6" }} />
                {globalAktive} {lang === "no" ? "Til behandling" : "In progress"}
              </div>
              <div className="sig-track-legend-item">
                <span className="sig-track-dot sig-track-dot--gray" />
                {Math.max(0, totalCases - globalBehandlet - globalAktive)} {lang === "no" ? "Mottatt / i kø" : "Received / queued"}
              </div>
            </div>
          </div>
        )}

        {/* Bottom: theme bars + monthly chart */}
        <div className="sig-bottom-row">

          {/* Theme horizontal bars */}
          <div className="sig-theme-section">
            <p className="sig-section-title">{lang === "no" ? "Saker per tema" : "Cases by theme"}</p>
            {(() => {
              const maxCount = Math.max(...themeCards.map(c => c.count), 1)
              return themeCards
                .slice()
                .sort((a, b) => b.count - a.count)
                .map(card => (
                  <button
                    key={card.key}
                    className="sig-theme-bar-row"
                    type="button"
                    onClick={() => { setStripTheme(card.key); setThemePanel(card.key); }}
                  >
                    <span className="sig-theme-bar-label">{card.name}</span>
                    <div className="sig-theme-bar-track">
                      <div
                        className="sig-theme-bar-fill"
                        style={{ width: `${Math.round(card.count / maxCount * 100)}%`, background: card.accentColor }}
                      />
                    </div>
                    <span className="sig-theme-bar-count">{card.count}</span>
                  </button>
                ))
            })()}
          </div>

          {/* Monthly sparkline */}
          {monthTrend.length > 0 && (() => {
            const maxVal = Math.max(...monthTrend.map(m => m.value), 1)
            return (
              <div className="sig-monthly-section">
                <p className="sig-section-title">{lang === "no" ? "Aktivitet per måned" : "Activity per month"}</p>
                <div className="sig-monthly-grid">
                  {monthTrend.map(m => {
                    const pct = Math.round(m.value / maxVal * 100)
                    const isPeak = m.value === maxVal
                    const lbl = new Date(m.label + "-01T12:00:00").toLocaleDateString(
                      lang === "no" ? "nb-NO" : "en-GB", { month: "short", year: "2-digit" }
                    )
                    return (
                      <div key={m.label} className={`sig-monthly-col${isPeak ? " sig-monthly-col--peak" : ""}`}>
                        <span className="sig-monthly-val">{m.value}</span>
                        <div className="sig-monthly-bar-wrap">
                          <div className="sig-monthly-bar" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="sig-monthly-lbl">{lbl}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

        </div>
      </div>

      {/* ═══ EXTENDED STATS ═══ */}
      {totalCases > 0 && (
        <div className="sig-extended">

          {/* Datakvalitet */}
          <div className="sig-quality-card">
            <p className="sig-section-title">{lang === "no" ? "Datakvalitet" : "Data quality"}</p>
            <div className="sig-quality-grid">
              <div className="sig-quality-cell">
                <span className="sig-quality-dot sig-quality-dot--ok" />
                <span className="sig-quality-label">{lang === "no" ? "Sesjon" : "Session"}</span>
                <strong className="sig-quality-value">{sessionId}</strong>
              </div>
              <div className="sig-quality-cell">
                <span className="sig-quality-dot sig-quality-dot--ok" />
                <span className="sig-quality-label">{lang === "no" ? "Saker hentet" : "Cases fetched"}</span>
                <strong className="sig-quality-value">{totalCases}</strong>
              </div>
              <div className="sig-quality-cell">
                <span className="sig-quality-dot sig-quality-dot--ok" />
                <span className="sig-quality-label">{lang === "no" ? "Oppdatert" : "Updated"}</span>
                <strong className="sig-quality-value">
                  {updatedAt ? updatedAt.toLocaleTimeString(lang === "no" ? "no-NO" : "en-GB", { hour: "2-digit", minute: "2-digit" }) : "—"}
                </strong>
              </div>
              <div className="sig-quality-cell">
                <span className="sig-quality-dot sig-quality-dot--ok" />
                <span className="sig-quality-label">{lang === "no" ? "Unike komiteer" : "Unique committees"}</span>
                <strong className="sig-quality-value">{uniqueCommittees}</strong>
              </div>
              <div className={`sig-quality-cell ${missingCommittee > 0 ? "sig-quality-cell--warn" : ""}`}>
                <span className={`sig-quality-dot ${missingCommittee > 0 ? "sig-quality-dot--warn" : "sig-quality-dot--ok"}`} />
                <span className="sig-quality-label">{lang === "no" ? "Mangler komité" : "Missing committee"}</span>
                <strong className="sig-quality-value">
                  {missingCommittee}
                  {missingCommittee > 0 && <em> ({Math.round(missingCommittee / totalCases * 100)}%)</em>}
                </strong>
              </div>
              <div className="sig-quality-cell">
                <span className="sig-quality-dot sig-quality-dot--ok" />
                <span className="sig-quality-label">{lang === "no" ? "Kilde" : "Source"}</span>
                <strong className="sig-quality-value sig-quality-value--link">Stortinget API</strong>
              </div>
            </div>
          </div>

          {/* Three-column stats row */}
          <div className="sig-stats-row">

            {/* Top committees */}
            <div className="sig-committee-section">
              <p className="sig-section-title">{lang === "no" ? "Mest aktive komiteer" : "Most active committees"}</p>
              {topCommittees.map(([name, count], idx) => {
                const maxC = topCommittees[0]?.[1] || 1
                return (
                  <div key={name} className="sig-committee-row">
                    <span className="sig-committee-rank">{idx + 1}</span>
                    <span className="sig-committee-name" title={name}>{name}</span>
                    <div className="sig-committee-track">
                      <div className="sig-committee-fill" style={{ width: `${Math.round(count / maxC * 100)}%` }} />
                    </div>
                    <span className="sig-committee-count">{count}</span>
                  </div>
                )
              })}
            </div>

            {/* Case types */}
            <div className="sig-types-section">
              <p className="sig-section-title">{lang === "no" ? "Sakstyper" : "Case types"}</p>
              {caseTypes.map(([type, count]) => {
                const maxT = caseTypes[0]?.[1] || 1
                const pct = Math.round(count / totalCases * 100)
                return (
                  <div key={type} className="sig-type-row">
                    <span className="sig-type-name" title={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                    <div className="sig-type-track">
                      <div className="sig-type-fill" style={{ width: `${Math.round(count / maxT * 100)}%` }} />
                    </div>
                    <span className="sig-type-pct">{pct}%</span>
                  </div>
                )
              })}
            </div>

            {/* Fun facts */}
            <div className="sig-facts-section">
              <p className="sig-section-title">{lang === "no" ? "Nøkkeltall" : "Key figures"}</p>
              <div className="sig-facts-grid">
                <div className="sig-fact">
                  <span className="sig-fact-num">{avgPerMonth}</span>
                  <span className="sig-fact-label">{lang === "no" ? "Snitt saker/mnd." : "Avg. cases/month"}</span>
                </div>
                <div className="sig-fact">
                  <span className="sig-fact-num">{Math.round(globalBehandlet / totalCases * 100)}%</span>
                  <span className="sig-fact-label">{lang === "no" ? "Behandlingsgrad" : "Completion rate"}</span>
                </div>
                <div className="sig-fact">
                  <span className="sig-fact-num">{uniqueCommittees}</span>
                  <span className="sig-fact-label">{lang === "no" ? "Aktive komiteer" : "Active committees"}</span>
                </div>
                <div className="sig-fact">
                  <span className="sig-fact-num">
                    {peakMonth
                      ? new Date(peakMonth.label + "-01").toLocaleDateString(
                          lang === "no" ? "no-NO" : "en-GB", { month: "short" }
                        )
                      : "—"}
                  </span>
                  <span className="sig-fact-label">
                    {peakMonth
                      ? `${lang === "no" ? "Toppmåned" : "Peak month"} · ${peakMonth.value}`
                      : "—"}
                  </span>
                </div>
                <div className="sig-fact">
                  <span className="sig-fact-num">{caseTypes.length}</span>
                  <span className="sig-fact-label">{lang === "no" ? "Ulike sakstyper" : "Distinct case types"}</span>
                </div>
                <div className="sig-fact">
                  <span className="sig-fact-num">{themeCards.length}</span>
                  <span className="sig-fact-label">{lang === "no" ? "Tematiske kategorier" : "Theme categories"}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <footer className="home-footer">
        <p>{t("footer")}</p>
      </footer>

      {showHowTo && (
        <div className="home-howto-overlay" role="dialog" aria-modal aria-label={t("howToUse")}>
          <div className="home-howto-modal">
            <button type="button" className="home-howto-close" onClick={dismissHowTo} aria-label="Lukk">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <h2>{t("howToUse")}</h2>
            <p>{t("statsLead")}</p>
            <div className="home-intro-points">
              <article>
                <strong>1. {t("introStep1Title")}</strong>
                <p>{t("introStep1Text")}</p>
              </article>
              <article>
                <strong>2. {t("introStep2Title")}</strong>
                <p>{t("introStep2Text")}</p>
              </article>
              <article>
                <strong>3. {t("introStep3Title")}</strong>
                <p>{t("introStep3Text")}</p>
              </article>
            </div>
            <button type="button" className="home-howto-dismiss" onClick={dismissHowTo}>
              {lang === "no" ? "Forstått, ikke vis igjen" : "Got it, don't show again"}
            </button>
          </div>
        </div>
      )}

      {/* ═══ COOKIE BANNER ═══ */}
      {!cookieAccepted && (
        <div className="cookie-banner" role="region" aria-label="Informasjonskapsler">
          <div className="cookie-banner-inner">
            <div className="cookie-banner-icon">🍪</div>
            <div className="cookie-banner-text">
              <strong>{lang === "no" ? "Informasjonskapsler" : "Cookies"}</strong>
              <p>
                {lang === "no"
                  ? "Denne siden bruker localStorage for å huske dine innstillinger (tema, språk, veiledning). Data hentes direkte fra Stortingets åpne API og lagres ikke hos oss."
                  : "This site uses localStorage to remember your settings (theme, language, guide). Data is fetched directly from Stortinget's open API and not stored by us."}
              </p>
            </div>
            <div className="cookie-banner-actions">
              <button type="button" className="cookie-btn cookie-btn--accept" onClick={acceptCookies}>
                {lang === "no" ? "Godta" : "Accept"}
              </button>
              <button type="button" className="cookie-btn cookie-btn--decline" onClick={acceptCookies}>
                {lang === "no" ? "Kun nødvendige" : "Necessary only"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
