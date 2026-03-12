import { useEffect, useMemo, useState } from "react"
import {
  categorizeCases,
  getAllThemes,
  getThemeStats,
  searchCases,
  type CaseItem,
  type ThemeKey,
} from "../lib/categorizationEngine"

type Lang = "no" | "en"
type ForsideProps = { lang: Lang }
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
    title: "Bachelor 2026",
    subtitle: "Oversikt over saker fra Stortinget",
    statsHeading: "Statistikk",
    statsLead: "Denne siden samler alle saker fra Stortingets API i én oversikt. Du kan søke, velge tema, åpne enkeltsaker og få rask innsikt i status og utvikling.",
    howToUse: "Slik bruker du siden",
    introStep1Title: "Finn saker raskt",
    introStep1Text: "Bruk søkefeltet for å finne saker på tittel, komité, type, status eller saksnummer.",
    introStep2Title: "Velg tema og sammenlign",
    introStep2Text: "Bytt mellom temaene for å se hva som dominerer og hvilke saker som hører sammen.",
    introStep3Title: "Forstå helheten",
    introStep3Text: "Nederst ser du nøkkeltall, statusfordeling, komitéaktivitet og datakvalitet.",
    cases: "saker",
    session: "Sesjon",
    updated: "Sist oppdatert",
    source: "Kilde",
    sourceValue: "Stortingets åpne data (XML API)",
    language: "English",
    dark: "Mørk",
    light: "Lys",
    searchPlaceholder: "Søk i alle saker (tittel, komité, type, status eller saksnummer)...",
    allCasesLabel: "Søk i alle saker",
    searchAcrossAll: "Søker i alle saker",
    searchModeLabel: "Søkemodus: alle saker",
    themeModeLabel: "Temavalg og saker i tema",
    clearSearch: "Nullstill",
    creativeDashboards: "Innsiktsdashboards",
    creativeDashboardsDesc: "Topp 3-oversikt for tema, komité og aktivitetsnivå.",
    themeCards: "Temakort",
    activityTrend: "Aktivitet siste måneder",
    topCommittees: "Mest aktive komiteer",
    latestCase: "Nyeste sak",
    latestCaseDesc: "Siste registrerte sak fra Stortingets API",
    shareOfAllCases: "andel av alle saker",
    shareOfSelectedTheme: "av valgt tema",
    largestTheme: "Største tema",
    topCommittee: "Mest aktiv komité",
    avgPerMonth: "Snitt saker/måned",
    found: "funnet",
    inTheme: "i",
    loading: "Laster saker...",
    noCases: "Ingen saker funnet",
    selectCase: "Velg en sak",
    status: "Status",
    type: "Type",
    date: "Dato",
    totalInTheme: "Saker i valgt tema",
    treated: "Behandlet",
    inProgress: "Til behandling",
    received: "Mottatt",
    otherStatus: "Andre saker",
    statusOverview: "Statusoversikt",
    statusHelp: "Fordeling av saksstatus i hele datasettet. Prosenten regnes av totalt antall hentede saker.",
    typeOverview: "Sakstyper",
    typeHelp: "De vanligste sakstypene i aktiv sesjon.",
    explorerHelp: "Start med søk i alle saker, eller velg et tema for en mer fokusert liste.",
    selectedCaseHelp: "Her ser du detaljer for saken du har valgt, med lenke til originalkilden.",
    kpiHelp: "Nøkkeltall som viser hvordan saker i valgt tema fordeler seg på status.",
    creativeHelp: "Alternative visninger som raskt viser hva som dominerer i datasettet.",
    qualitySectionHelp: "Datagrunnlag og komitéaktivitet samlet på ett sted.",
    themeBalance: "Temabalanse",
    themeHelp: "Hvor stor andel av alle saker hvert tema utgjør.",
    monthTrend: "Månedstrend",
    monthHelp: "Antall registrerte saker per måned basert på saksdato.",
    quality: "Datakvalitet",
    qualityHelp: "Kontrollkort for sesjon, volum og oppdateringsfrekvens.",
    votingSummary: "Voteringsoppsummering",
    votingHelp: "Enkel visning av hva de stemte over og hvem som stemte for eller mot.",
    votingDecisions: "Hva skjedde i voteringene?",
    noVoting: "Ingen voteringsdata tilgjengelig",
    caseInfoTitle: "Sammendrag av saken",
    quickRead: "Kort fortalt",
    openCase: "Åpne saken hos Stortinget",
    caseId: "Saksnummer",
    caseInfoLoading: "Laster mer info om saken...",
    caseInfoMissing: "Fant ikke mer info om denne saken.",
    recommendation: "Forslag fra komiteen",
    decisionText: "Dette ble bestemt",
    shortDecision: "Kort forklart",
    reference: "Hentet fra",
    decisions: "vedtak",
    forVotes: "For",
    againstVotes: "Mot",
    absentVotes: "Ikke til stede",
    voteBalance: "Stemmebalanse",
    majority: "Flertall",
    proposalsTitle: "Forslag i denne voteringen",
    simpleExplanation: "Kort forklart",
    whatTheyVotedOn: "Hva stemte de over?",
    forMeans: "Stemte for forslaget",
    againstMeans: "Stemte mot forslaget",
    whatWasDecided: "Hva ble bestemt?",
    noDecisions: "Det finnes ingen vedtakstekst for denne voteringen enda.",
    proposalType: "Forslagstype",
    proposalLabel: "Forslag",
    proposalText: "Forslagstekst",
    noProposals: "Ingen forslagstekst registrert",
    footer: "Data hentet fra Stortinget",
    passed: "Vedtatt",
    rejected: "Ikke vedtatt",
    tie: "Uavgjort",
    resultForKids: "Kort resultat",
    simpleSteps: "Slik leser du dette",
    step1: "Se hva de stemte over.",
    step2: "Se hvem som fikk flest stemmer.",
    step3: "Les hva som ble bestemt.",
  },
  en: {
    title: "Bachelor 2026",
    subtitle: "Overview of cases from Parliament",
    statsHeading: "Statistics",
    statsLead: "This page gathers all cases from the Storting API in one overview. You can search, select a theme, open individual cases and quickly understand status and trends.",
    howToUse: "How to use this page",
    introStep1Title: "Find cases quickly",
    introStep1Text: "Use the search field to find cases by title, committee, type, status or case number.",
    introStep2Title: "Select a theme and compare",
    introStep2Text: "Switch between themes to see what dominates and which cases belong together.",
    introStep3Title: "Understand the full picture",
    introStep3Text: "Further down you get key numbers, status distribution, committee activity and data quality.",
    cases: "cases",
    session: "Session",
    updated: "Last updated",
    source: "Source",
    sourceValue: "Storting open data (XML API)",
    language: "Norsk",
    dark: "Dark",
    light: "Light",
    searchPlaceholder: "Search all cases (title, committee, type, status or case ID)...",
    allCasesLabel: "Search all cases",
    searchAcrossAll: "Searching across all cases",
    searchModeLabel: "Search mode: all cases",
    themeModeLabel: "Theme selection and themed cases",
    clearSearch: "Clear",
    creativeDashboards: "Insight dashboards",
    creativeDashboardsDesc: "Top 3 overview of themes, committees and activity level.",
    themeCards: "Theme cards",
    activityTrend: "Activity in recent months",
    topCommittees: "Most active committees",
    latestCase: "Latest case",
    latestCaseDesc: "Most recently registered case from the Storting API",
    shareOfAllCases: "share of all cases",
    shareOfSelectedTheme: "of selected theme",
    largestTheme: "Largest theme",
    topCommittee: "Most active committee",
    avgPerMonth: "Avg cases/month",
    found: "found",
    inTheme: "in",
    loading: "Loading cases...",
    noCases: "No cases found",
    selectCase: "Select a case",
    status: "Status",
    type: "Type",
    date: "Date",
    totalInTheme: "Cases in selected theme",
    treated: "Processed",
    inProgress: "In progress",
    received: "Received",
    otherStatus: "Other cases",
    statusOverview: "Status overview",
    statusHelp: "Case status distribution for the full dataset. Percentages are based on total fetched cases.",
    typeOverview: "Case types",
    typeHelp: "Most common case types in the active session.",
    explorerHelp: "Start by searching all cases, or select a theme for a focused list.",
    selectedCaseHelp: "Details for the selected case, including a direct link to the source.",
    kpiHelp: "Key numbers showing how the selected theme is distributed by status.",
    creativeHelp: "Alternative views that quickly show what dominates the dataset.",
    qualitySectionHelp: "Dataset quality and committee activity in one place.",
    themeBalance: "Theme balance",
    themeHelp: "Each theme's share of all fetched cases.",
    monthTrend: "Monthly trend",
    monthHelp: "Number of registered cases per month based on case date.",
    quality: "Data quality",
    qualityHelp: "Control cards for session, data volume and refresh timing.",
    votingSummary: "Voting summary",
    votingHelp: "Simple view of what they voted on and who voted for or against.",
    votingDecisions: "What happened in the votes?",
    noVoting: "No voting data available",
    caseInfoTitle: "Case summary",
    quickRead: "In short",
    openCase: "Open case at Stortinget",
    caseId: "Case number",
    caseInfoLoading: "Loading more case info...",
    caseInfoMissing: "Could not find more info for this case.",
    recommendation: "Proposal from committee",
    decisionText: "This was decided",
    shortDecision: "In short",
    reference: "Fetched from",
    decisions: "decisions",
    forVotes: "For",
    againstVotes: "Against",
    absentVotes: "Absent",
    voteBalance: "Vote balance",
    majority: "Majority",
    proposalsTitle: "Proposals in this vote",
    simpleExplanation: "In simple words",
    whatTheyVotedOn: "What did they vote on?",
    forMeans: "Voted for the proposal",
    againstMeans: "Voted against the proposal",
    whatWasDecided: "What was decided?",
    noDecisions: "No decision text is available for this vote yet.",
    proposalType: "Proposal type",
    proposalLabel: "Proposal",
    proposalText: "Proposal text",
    noProposals: "No proposal text registered",
    footer: "Data from Stortinget",
    passed: "Passed",
    rejected: "Rejected",
    tie: "Tie",
    resultForKids: "Simple result",
    simpleSteps: "How to read this",
    step1: "See what they voted on.",
    step2: "See who got most votes.",
    step3: "Read what was decided.",
  },
}

const THEME_LABELS: Record<Lang, Record<ThemeKey, string>> = {
  no: {
    klima: "Klima og Miljø",
    energi: "Energi og Kraft",
    samferdsel: "Samferdsel og Transport",
    levekår: "Levekår og Velferd",
  },
  en: {
    klima: "Climate and Environment",
    energi: "Energy and Power",
    samferdsel: "Transport and Infrastructure",
    levekår: "Welfare and Living Conditions",
  },
}

const THEME_BLURBS: Record<Lang, Record<ThemeKey, string>> = {
  no: {
    klima: "Klima, natur og utslipp.",
    energi: "Strøm, kraft og energiløsninger.",
    samferdsel: "Vei, kollektivtransport og infrastruktur.",
    levekår: "Helse, arbeid, utdanning og velferd.",
  },
  en: {
    klima: "Climate, nature and emissions.",
    energi: "Electricity, power and energy solutions.",
    samferdsel: "Roads, public transport and infrastructure.",
    levekår: "Health, work, education and welfare.",
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

function compactLabel(value: string, max = 30): string {
  const text = String(value || "").trim()
  if (text.length <= max) return text
  return `${text.slice(0, max - 1).trimEnd()}…`
}

function formatMonthLabel(value: string, lang: Lang): string {
  const [year, month] = String(value || "").split("-")
  if (!year || !month) return value
  const d = new Date(`${year}-${month}-01T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  const locale = lang === "no" ? "nb-NO" : "en-GB"
  return d.toLocaleDateString(locale, { month: "short", year: "numeric" })
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

function StatCard({
  label,
  value,
  accent,
  total,
  t,
}: {
  label: string
  value: number
  accent: string
  total?: number
  t: (key: string) => string
}) {
  const pct = total && total > 0 ? Math.round((value / total) * 100) : null
  return (
    <article className="home-stat">
      <p>{label}</p>
      <strong style={{ color: accent }}>{value}</strong>
      {pct !== null && <small>{pct}% {t("shareOfSelectedTheme")}</small>}
    </article>
  )
}

function MetricBars({ rows, total }: { rows: Array<{ label: string; value: number }>; total: number }) {
  return (
    <div className="home-metric-list">
      {rows.map((row) => {
        const pct = total > 0 ? Math.round((row.value / total) * 100) : 0
        return (
          <div key={row.label} className="home-metric-row">
            <div className="home-metric-meta">
              <span>{row.label}</span>
              <small>
                {row.value} ({pct}%)
              </small>
            </div>
            <div className="home-metric-track">
              <div className="home-metric-fill" style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

type DashboardIconType = "theme" | "committee" | "trend"

function DashboardIcon({ type }: { type: DashboardIconType }) {
  if (type === "theme") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M5 4v2M4 5h2M19 18v2M18 19h2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (type === "committee") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <rect x="3" y="8" width="7" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="10" y="4" width="11" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M13 8h4M13 12h4M13 16h4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M4 16l6-6 4 4 6-6" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 8h4v4" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ThemeSymbol({ theme }: { theme: ThemeKey }) {
  if (theme === "klima") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2L12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    )
  }
  if (theme === "energi") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
        <path d="M13 2L5 13h6l-1 9 8-11h-6l1-9z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
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
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 11c0 5.5-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

function PodiumMini({
  title,
  items,
  iconType,
}: {
  title: string
  items: Array<{ label: string; value: number }>
  iconType: DashboardIconType
}) {
  if (items.length === 0) return null
  const max = Math.max(...items.map((i) => i.value), 1)
  const ordered = [items[1], items[0], items[2]].filter(Boolean) as Array<{ label: string; value: number }>

  return (
    <article className="home-podium-card">
      <div className="home-podium-head">
        <span className="home-title-icon">
          <DashboardIcon type={iconType} />
        </span>
        <small>{title}</small>
      </div>
      <div className="home-podium-stage">
        {ordered.map((item, i) => {
          const place = i === 1 ? 1 : i === 0 ? 2 : 3
          const height = Math.max(54, Math.round((item.value / max) * 100))
          return (
            <div key={`${title}-${place}-${item.label}`} className={`home-podium-col place-${place}`}>
              <div className="home-podium-bar" style={{ height: `${height}px` }}>
                <b>#{place}</b>
                <strong>{item.value}</strong>
              </div>
              <span title={item.label}>{item.label}</span>
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default function Forside({ lang }: ForsideProps) {
  const [selectedTheme, setSelectedTheme] = useState<ThemeKey>("klima")
  const [searchTerm, setSearchTerm] = useState("")
  const [sessionId, setSessionId] = useState("")
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [loading, setLoading] = useState(true)

  const [allCases, setAllCases] = useState<CaseItem[]>([])
  const [categorizedCases, setCategorizedCases] = useState<Record<ThemeKey, CaseItem[]>>({
    klima: [],
    energi: [],
    samferdsel: [],
    levekår: [],
  })
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null)
  const [selectedCaseDetail, setSelectedCaseDetail] = useState<CaseDetail | null>(null)
  const [loadingCaseDetail, setLoadingCaseDetail] = useState(false)

  const t = (key: string) => TEXT[lang][key] || key
  const themes = getAllThemes()
  const stats = getThemeStats(Object.values(categorizedCases).flat(), selectedTheme)

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
  const otherStatus = Math.max(0, stats.total - stats.statusCounts.behandlet - stats.statusCounts.til_behandling - stats.statusCounts.mottatt)
  const selectedThemeName = THEME_LABELS[lang][selectedTheme]
  const themePanelTitle =
    lang === "no" ? `Saker i ${selectedThemeName}` : `Cases in ${selectedThemeName}`
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

  const searchResults = useMemo(() => {
    const items = searchTerm.trim() ? searchCases(allCases, searchTerm) : allCases
    return [...items].sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))
  }, [allCases, searchTerm])

  const themeCases = useMemo(
    () =>
      [...(categorizedCases[selectedTheme] || [])].sort(
        (a, b) => dateSortValue(b.date) - dateSortValue(a.date)
      ),
    [categorizedCases, selectedTheme]
  )

  const latestCase = useMemo(
    () => [...allCases].sort((a, b) => dateSortValue(b.date) - dateSortValue(a.date))[0] || null,
    [allCases]
  )

  const statusOverview = useMemo(() => {
    const labels: Record<string, string> =
      lang === "no"
        ? {
            behandlet: "Behandlet",
            til_behandling: "Til behandling",
            mottatt: "Mottatt",
            varslet: "Varslet",
            trukket: "Trukket",
            bortfalt: "Bortfalt",
            ukjent: "Ukjent",
          }
        : {
            behandlet: "Processed",
            til_behandling: "In progress",
            mottatt: "Received",
            varslet: "Notified",
            trukket: "Withdrawn",
            bortfalt: "Expired",
            ukjent: "Unknown",
          }

    const map = new Map<string, number>()
    allCases.forEach((c) => {
      const key = normalizeStatus(c.status) || "ukjent"
      map.set(key, (map.get(key) || 0) + 1)
    })

    return Array.from(map.entries())
      .map(([key, value]) => ({ label: labels[key] || key, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [allCases, lang])

  const typeOverview = useMemo(() => {
    const map = new Map<string, number>()
    allCases.forEach((c) => {
      const key = c.type || (lang === "no" ? "ukjent" : "unknown")
      map.set(key, (map.get(key) || 0) + 1)
    })

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [allCases, lang])

  const podiumTheme = useMemo(
    () =>
      [...themeCards]
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((x) => ({ label: compactLabel(x.name, 26), value: x.count })),
    [themeCards]
  )

  const podiumCommittees = useMemo(
    () => topCommittees.slice(0, 3).map(([label, value]) => ({ label: compactLabel(label, 34), value })),
    [topCommittees]
  )

  const podiumMonths = useMemo(
    () =>
      [...monthTrend]
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
        .map((x) => ({ label: formatMonthLabel(x.label, lang), value: x.value })),
    [monthTrend, lang]
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
      <section className="home-hero">
        <div>
          <p className="home-kicker">{t("title")}</p>
          <h1>{t("statsHeading")}</h1>
          <p className="home-hero-sub">{t("subtitle")}</p>
          <div className="home-hero-meta">
            <span>{totalCases} {t("cases")}</span>
            <span>{t("session")}: {sessionId || "-"}</span>
            <span>{t("updated")}: {updatedAt ? updatedAt.toLocaleTimeString(lang === "no" ? "no-NO" : "en-GB") : "-"}</span>
          </div>
        </div>

      </section>

      <section className="home-intro-card home-dashboard-block">
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
      </section>

      <section className="home-theme-strip">
        {themeCards.map((card) => (
          <article
            key={`strip-${card.key}`}
            className={`home-theme-strip-card ${selectedTheme === card.key ? "active" : ""}`}
            onClick={() => setSelectedTheme(card.key)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setSelectedTheme(card.key)
            }}
          >
            <p>
              <span className={`home-theme-symbol theme-${card.key}`}>
                <ThemeSymbol theme={card.key} />
              </span>{" "}
              {card.name}
            </p>
            <small className="home-theme-strip-note">{THEME_BLURBS[lang][card.key]}</small>
          </article>
        ))}
      </section>

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

      <p className="home-section-note">{t("explorerHelp")}</p>
      <section className="home-explorer-grid home-dashboard-block">
        <article className="home-card home-explorer">
          <header>
            <h3>{t("allCasesLabel")}</h3>
            <small>
              {searchResults.length} {t("cases")}
            </small>
          </header>
          <div className="home-panel-top">
            <div className="home-search">
              <div className="home-search-row">
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                />
                <button type="button" className="home-clear-search" onClick={() => setSearchTerm("")}>
                  {t("clearSearch")}
                </button>
              </div>
            </div>
          </div>
          <div className="home-case-list-compact">
            {loading ? (
              <p>{t("loading")}</p>
            ) : searchResults.length === 0 ? (
              <p>{t("noCases")}</p>
            ) : (
              searchResults.map((item) => (
                <button
                  type="button"
                  key={`search-${item.id}`}
                  className={selectedCase?.id === item.id ? "active" : ""}
                  onClick={() => setSelectedCase(item)}
                >
                  <strong>{item.shortTitle}</strong>
                  <small>{item.committee}</small>
                </button>
              ))
            )}
          </div>
        </article>

        <article className="home-card home-explorer">
          <header>
            <h3 style={{ color: themes[selectedTheme].accentColor }}>{themePanelTitle}</h3>
            <small>
              {selectedThemeName} ({themeCases.length})
            </small>
          </header>
          <div className="home-panel-top">
            <div className="home-theme-icon-row">
              {(Object.keys(themes) as ThemeKey[]).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedTheme(key)}
                  className={selectedTheme === key ? "active" : ""}
                  style={selectedTheme === key ? { background: themes[key].color } : undefined}
                  title={THEME_LABELS[lang][key]}
                >
                  <span className={`home-theme-symbol theme-${key}`}>
                    <ThemeSymbol theme={key} />
                  </span>
                  <small>{categorizedCases[key].length}</small>
                </button>
              ))}
            </div>
          </div>
          <div className="home-case-list-compact">
            {loading ? (
              <p>{t("loading")}</p>
            ) : themeCases.length === 0 ? (
              <p>{t("noCases")}</p>
            ) : (
              themeCases.map((item) => (
                <button
                  type="button"
                  key={`theme-${item.id}`}
                  className={selectedCase?.id === item.id ? "active" : ""}
                  onClick={() => setSelectedCase(item)}
                >
                  <strong>{item.shortTitle}</strong>
                  <small>{item.committee}</small>
                </button>
              ))
            )}
          </div>
        </article>
      </section>

      <p className="home-section-note">{t("selectedCaseHelp")}</p>
      <section className="home-grid detail-only home-dashboard-block">
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

      <p className="home-section-note">{t("kpiHelp")}</p>
      <section className="home-kpis home-dashboard-block">
        <StatCard label={t("totalInTheme")} value={stats.total} accent="var(--home-neutral-number)" t={t} />
        <StatCard label={t("treated")} value={stats.statusCounts.behandlet} accent="var(--home-neutral-number)" total={stats.total} t={t} />
        <StatCard label={t("inProgress")} value={stats.statusCounts.til_behandling} accent="var(--home-neutral-number)" total={stats.total} t={t} />
        <StatCard label={t("received")} value={stats.statusCounts.mottatt} accent="var(--home-neutral-number)" total={stats.total} t={t} />
        <StatCard label={t("otherStatus")} value={otherStatus} accent="var(--home-neutral-number)" total={stats.total} t={t} />
      </section>

      <section className="home-grid two home-dashboard-block">
        <article className="home-card">
          <h3>{t("statusOverview")}</h3>
          <p>{t("statusHelp")}</p>
          <MetricBars rows={statusOverview} total={Math.max(1, totalCases)} />
        </article>
        <article className="home-card">
          <h3>{t("typeOverview")}</h3>
          <p>{t("typeHelp")}</p>
          <MetricBars rows={typeOverview} total={Math.max(1, totalCases)} />
        </article>
      </section>

      <p className="home-section-note">{t("creativeHelp")}</p>
      <section className="home-card home-creative home-dashboard-block">
        <h3>{t("creativeDashboards")}</h3>
        <p>{t("creativeDashboardsDesc")}</p>
        <div className="home-podium-grid">
          <PodiumMini title={t("largestTheme")} items={podiumTheme} iconType="theme" />
          <PodiumMini title={t("topCommittee")} items={podiumCommittees} iconType="committee" />
          <PodiumMini title={t("avgPerMonth")} items={podiumMonths} iconType="trend" />
        </div>

        <div className="home-theme-card-grid">
          {themeCards.map((card) => (
            <article key={card.key} className="home-theme-card">
              <div className="home-theme-card-head">
                <div className="home-theme-card-title">
                  <span className={`home-theme-symbol theme-${card.key}`}>
                    <ThemeSymbol theme={card.key} />
                  </span>
                  <small>{card.name}</small>
                </div>
                <div
                  className="home-theme-card-ring"
                  style={{
                    background: `conic-gradient(${card.accentColor} ${card.pct * 3.6}deg, rgba(148,163,184,.25) 0deg)`,
                  }}
                >
                  <span>{card.pct}%</span>
                </div>
              </div>
              <strong className="home-theme-card-count" style={{ color: card.accentColor }}>
                {card.count}
              </strong>
              <div className="home-theme-card-track">
                <div style={{ width: `${card.pct}%`, background: card.color }} />
              </div>
              <p className="home-theme-card-share">{t("shareOfAllCases")}</p>
            </article>
          ))}
        </div>
      </section>

      <p className="home-section-note">{t("qualitySectionHelp")}</p>
      <section className="home-grid two home-dashboard-block">
        <article className="home-card">
          <h3>{t("quality")}</h3>
          <p>{t("qualityHelp")}</p>
          <div className="home-quality">
            <div>
              <span>{t("session")}</span>
              <strong>{sessionId || "-"}</strong>
            </div>
            <div>
              <span>{t("cases")}</span>
              <strong>{totalCases}</strong>
            </div>
            <div>
              <span>{t("updated")}</span>
              <strong>
                {updatedAt
                  ? updatedAt.toLocaleTimeString(lang === "no" ? "no-NO" : "en-GB")
                  : "-"}
              </strong>
            </div>
            <div>
              <span>{t("source")}</span>
              <strong>{t("sourceValue")}</strong>
            </div>
          </div>
        </article>
        <article className="home-card">
          <h3>{t("topCommittees")}</h3>
          <div className="home-committee-list">
            {topCommittees.map(([name, count], idx) => (
              <div key={name}>
                <span>
                  {idx + 1}. {name}
                </span>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <footer className="home-footer">
        <p>{t("footer")}</p>
      </footer>
    </main>
  )
}
