import { useEffect, useMemo, useState } from "react"

// Stortinget API-endepunkter
const SAKER_URL = "https://data.stortinget.no/eksport/saker"
const VOTERINGER_URL = "https://data.stortinget.no/eksport/voteringer"
const REPR_VOTER_URL = "https://data.stortinget.no/eksport/voteringsresultat"
const FORSLAG_URL = "https://data.stortinget.no/eksport/voteringsforslag"

type Lang = "no" | "en"
type VoteringProps = { lang: Lang }

type Sak = {
  id: string
  tittel: string
  kortTittel: string
  sesjonId: string
  type: string
  dato: string
  status: string
}

type Votering = {
  id: string
  sakId: string
  vedtatt: boolean
  resultatType: string   // f.eks. "enstemmig_vedtatt", "vedtatt_mot_N_stemmer"
  resultatTekst: string  // f.eks. "Enstemmig vedtatt"
  tema: string           // hva det ble stemt over
  tid: string
  antallFor: number
  antallMot: number
  antallIkkeTilStede: number
  personligVotering: boolean
}

// Et enkelt voteringsforslag
type VoteringForslag = {
  id: string
  betegnelse: string
  betegnelseKort: string
  paaVegneAv: string
  tekst: string   // allerede HTML-strippet
  type: "tilraading" | "mindretallsforslag" | "loest_forslag" | string
}

// Representantens enkeltvotering
type RepVote = {
  representantId: string
  fornavn: string
  etternavn: string
  parti: string
  fylke: string
  vote: "for" | "mot" | "ikke_tilstede"
}

// Hjelpefunksjoner for XML-parsing
function getTextByLocalName(node: Element, name: string): string {
  if (node.localName === name) return (node.textContent ?? "").trim()
  const descendants = node.getElementsByTagName("*")
  for (let i = 0; i < descendants.length; i++) {
    const el = descendants[i]
    if (el.localName === name) return (el.textContent ?? "").trim()
  }
  return ""
}

function findAll(xml: Document, localName: string): Element[] {
  return Array.from(xml.getElementsByTagName("*")).filter(
    (el) => el.localName === localName
  )
}

function getCurrentSession(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 10) return `${year}-${year + 1}`
  return `${year - 1}-${year}`
}

function getPreviousSession(): string {
  const cur = getCurrentSession()
  const startYear = parseInt(cur.split("-")[0], 10)
  return `${startYear - 1}-${startYear}`
}

// Tilgjengelige sesjoner (siste 4)
function getAvailableSessions(): string[] {
  const cur = getCurrentSession()
  const startYear = parseInt(cur.split("-")[0], 10)
  return [
    cur,
    `${startYear - 1}-${startYear}`,
    `${startYear - 2}-${startYear - 1}`,
    `${startYear - 3}-${startYear - 2}`,
  ]
}

// Hjelper: hent direkte barn-tekstverdi (unngår å plukke id fra nestede sub-elementer)
function getDirectChild(el: Element, localName: string): string {
  const child = Array.from(el.children).find((c) => c.localName === localName)
  return child?.textContent?.trim() ?? ""
}

function parseSaker(xmlText: string): Sak[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  const nodes = findAll(doc, "sak")

  return nodes
    .map((sak): Sak => ({
      // Alle felt hentes som direkte barn — unngår å plukke emne-IDs o.l.
      id: getDirectChild(sak, "id"),
      tittel: getDirectChild(sak, "tittel") || getDirectChild(sak, "korttittel"),
      kortTittel: getDirectChild(sak, "korttittel"),
      sesjonId: getDirectChild(sak, "sesjon_id") || getDirectChild(sak, "behandlet_sesjon_id"),
      type: getDirectChild(sak, "type"),
      dato: getDirectChild(sak, "dato") || getDirectChild(sak, "mottatt_dato") || getDirectChild(sak, "sist_oppdatert_dato"),
      status: getDirectChild(sak, "status"),
    }))
    .filter((s) => s.id && s.tittel)
}

function parseVoteringer(xmlText: string, sakId: string): Votering[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  // Stortinget API bruker "sak_votering" som element for hver enkelt votering
  const nodes = findAll(doc, "sak_votering")

  return nodes
    .map((v): Votering => {
      const antallFor = parseInt(getTextByLocalName(v, "antall_for") || "0", 10)
      const antallMot = parseInt(getTextByLocalName(v, "antall_mot") || "0", 10)
      const antallIkkeTilStede = parseInt(getTextByLocalName(v, "antall_ikke_tilstede") || "0", 10)

      return {
        id: getTextByLocalName(v, "votering_id"),
        sakId,
        vedtatt: getTextByLocalName(v, "vedtatt").toLowerCase() === "true",
        resultatType: getTextByLocalName(v, "votering_resultat_type"),
        resultatTekst: getTextByLocalName(v, "votering_resultat_type_tekst"),
        tema: getTextByLocalName(v, "votering_tema"),
        tid: getTextByLocalName(v, "votering_tid"),
        antallFor: antallFor < 0 ? 0 : antallFor,
        antallMot: antallMot < 0 ? 0 : antallMot,
        antallIkkeTilStede: antallIkkeTilStede < 0 ? 0 : antallIkkeTilStede,
        personligVotering: getTextByLocalName(v, "personlig_votering").toLowerCase() === "true",
      }
    })
    .filter((v) => v.id)
}

function parseRepVoter(xmlText: string): RepVote[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  // Endepunkt: voteringsresultat — hvert element er <representant_voteringsresultat>
  // Struktur: <representant> (fornavn, etternavn, id, parti, fylke) + <votering> (for/mot/ikke_tilstede)
  const nodes = findAll(doc, "representant_voteringsresultat")

  return nodes
    .map((n): RepVote | null => {
      const repNode = Array.from(n.children).find((c) => c.localName === "representant")
      if (!repNode) return null

      const fornavn = getTextByLocalName(repNode, "fornavn")
      const etternavn = getTextByLocalName(repNode, "etternavn")
      if (!fornavn || !etternavn) return null

      // Fylke — brukes til å filtrere Agder-representanter
      const fylkeNode = Array.from(repNode.getElementsByTagName("*")).find(
        (el) => el.localName === "fylke"
      )
      const fylke = fylkeNode ? getTextByLocalName(fylkeNode, "navn") : ""

      // Kun Agder-representanter (Aust-Agder og Vest-Agder)
      const fylkeLower = fylke.toLowerCase()
      if (!fylkeLower.includes("agder")) return null

      const partiNode = Array.from(repNode.getElementsByTagName("*")).find(
        (el) => el.localName === "parti"
      )
      const partiId = partiNode ? getTextByLocalName(partiNode, "id") : ""

      // <votering> er direkte barn av <representant_voteringsresultat>
      const voteRaw = Array.from(n.children)
        .find((c) => c.localName === "votering")
        ?.textContent?.trim()
        .toLowerCase() ?? ""

      return {
        representantId: getTextByLocalName(repNode, "id"),
        fornavn,
        etternavn,
        parti: partiId || "Ukjent",
        fylke,
        vote: voteRaw === "mot"
          ? "mot"
          : voteRaw === "ikke_tilstede"
          ? "ikke_tilstede"
          : "for",
      }
    })
    .filter((r): r is RepVote => r !== null)
}

function stripHtml(html: string): string {
  const div = document.createElement("div")
  div.innerHTML = html
  return (div.textContent ?? "").replace(/\s+/g, " ").trim()
}

function parseVoteringForslag(xmlText: string): VoteringForslag[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  const nodes = findAll(doc, "voteringsforslag")
  return nodes
    .map((n): VoteringForslag => ({
      id: getTextByLocalName(n, "forslag_id"),
      betegnelse: getTextByLocalName(n, "forslag_betegnelse"),
      betegnelseKort: getTextByLocalName(n, "forslag_betegnelse_kort"),
      paaVegneAv: getTextByLocalName(n, "forslag_paa_vegne_av_tekst"),
      tekst: stripHtml(getTextByLocalName(n, "forslag_tekst")),
      type: getTextByLocalName(n, "forslag_type"),
    }))
    .filter((f) => f.id)
}

// Gjør parlamentarisk fagspråk forståelig — også for barn
function simplifyTema(tema: string, lang: Lang): string {
  if (!tema) return ""
  const t = tema.toLowerCase().trim()

  // "Innstillingens tilråding" — komiteen sa JA, og nå stemmer alle
  if (t === "innstillingens tilråding" || (t.startsWith("innstillingens tilråding") && !t.includes("alternativ"))) {
    return lang === "no" ? "Komiteens anbefaling" : "Committee's recommendation"
  }

  // "Lovens overskrift og loven i sin helhet" — sluttstemme om hele loven
  if (t.includes("lovens overskrift") || t.includes("loven i sin helhet")) {
    return lang === "no" ? "Hele loven — sluttstemme" : "Entire law — final vote"
  }

  // "Alternativ votering mellom innstillingen romertall X og forslag nr.Y-Z fra [partier]"
  if (t.includes("alternativ votering")) {
    const partierMatch = tema.match(/fra\s+([A-ZÆØÅa-zæøå,\s]+(?:og\s+[A-ZÆØÅ]+)?)(?:[.,]?\s*$)/i)
    if (partierMatch) {
      const fra = partierMatch[1].trim().replace(/\.$/, "")
      return lang === "no"
        ? `Valg mellom komiteens forslag og forslag fra ${fra}`
        : `Choice between committee proposal and proposals from ${fra}`
    }
    return lang === "no" ? "Valg mellom ulike forslag" : "Vote between proposals"
  }

  // "Forslag nr. X på vegne av [partier]." eller "Forslag nr. X fra [partier]."
  const forslagPaaVegne = tema.match(/forslag\s+nr\.?\s*([\d,\s\-–]+)\s+(?:på vegne av|fra)\s+(.+?)\.?\s*$/i)
  if (forslagPaaVegne) {
    const fra = forslagPaaVegne[2].trim()
    return lang === "no" ? `Forslag fra ${fra}` : `Proposal from ${fra}`
  }

  // "Forslag nr. X" — bare nummeret, ingen parti nevnt
  const bareForslag = tema.match(/^forslag\s+nr\.?\s*([\d,\s\-–]+)\.?\s*$/i)
  if (bareForslag) {
    return lang === "no"
      ? `Alternativt forslag nr. ${bareForslag[1].trim()}`
      : `Alternative proposal no. ${bareForslag[1].trim()}`
  }

  // Presidentens forslag
  if (t.includes("presidentens forslag")) {
    return lang === "no" ? "Presidentens forslag" : "Speaker's proposal"
  }

  return tema
}

// Kort forklaring på vanlig norsk (for barn og folk uten parlamentarisk kjennskap)
function explainTema(tema: string, lang: Lang): string {
  if (!tema) return ""
  const t = tema.toLowerCase().trim()

  if (t === "innstillingens tilråding" || (t.startsWith("innstillingens tilråding") && !t.includes("alternativ"))) {
    return lang === "no"
      ? "Stortinget stemte over om de ville si JA til det komiteen hadde foreslått."
      : "Parliament voted on whether to accept what the committee proposed."
  }

  if (t.includes("lovens overskrift") || t.includes("loven i sin helhet")) {
    return lang === "no"
      ? "Til slutt stemte de over om hele loven skulle bli vedtatt — som en siste godkjenning."
      : "The final vote to approve the whole law as one."
  }

  if (t.includes("alternativ votering")) {
    const partierMatch = tema.match(/fra\s+([A-ZÆØÅa-zæøå,\s]+(?:og\s+[A-ZÆØÅ]+)?)(?:[.,]?\s*$)/i)
    const fra = partierMatch ? partierMatch[1].trim().replace(/\.$/, "") : lang === "no" ? "noen partier" : "some parties"
    return lang === "no"
      ? `${fra} hadde et annet forslag enn komiteen. Her valgte representantene hvilket forslag de likte best.`
      : `${fra} had a different proposal. Representatives chose which version they preferred.`
  }

  const forslagPaaVegne = tema.match(/forslag\s+nr\.?\s*[\d,\s\-–]+\s+(?:på vegne av|fra)\s+(.+?)\.?\s*$/i)
  if (forslagPaaVegne) {
    const fra = forslagPaaVegne[1].trim()
    return lang === "no"
      ? `${fra} hadde et eget forslag som de ønsket at Stortinget skulle stemme over.`
      : `${fra} put forward their own proposal for Parliament to vote on.`
  }

  const bareForslag = tema.match(/^forslag\s+nr\.?\s*([\d,\s\-–]+)\.?\s*$/i)
  if (bareForslag) {
    return lang === "no"
      ? "Et alternativt forslag ble lagt frem i tillegg til komiteens anbefaling."
      : "An alternative proposal was put forward alongside the committee's recommendation."
  }

  return ""
}

// Partifarge — samme palett som brukes i appen ellers
const PARTY_COLORS: Record<string, string> = {
  H: "#0066CC",
  AP: "#EF3340",
  FRP: "#003087",
  SP: "#009B3A",
  SV: "#EF3C96",
  V: "#00843D",
  KRF: "#FDD835",
  MDG: "#5E9732",
  R: "#E30613",
  "Arbeiderpartiet": "#EF3340",
  "Høyre": "#0066CC",
  "Fremskrittspartiet": "#003087",
  "Senterpartiet": "#009B3A",
  "Sosialistisk Venstreparti": "#EF3C96",
  "Venstre": "#00843D",
  "Kristelig Folkeparti": "#FDD835",
  "Miljøpartiet De Grønne": "#5E9732",
  "Rødt": "#E30613",
}

function getPartyColor(parti: string): string {
  return PARTY_COLORS[parti] || "#6b7280"
}

function VoteIcon({ vote }: { vote: "for" | "mot" | "ikke_tilstede" }) {
  if (vote === "for") {
    return (
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none">
        <circle cx="10" cy="10" r="9" fill="#16a34a" />
        <path d="M5.5 10.5l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (vote === "mot") {
    return (
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none">
        <circle cx="10" cy="10" r="9" fill="#dc2626" />
        <path d="M7 7l6 6M13 7l-6 6" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden fill="none">
      <circle cx="10" cy="10" r="9" fill="#9ca3af" />
      <path d="M6 10h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type ThemeKey = "klima" | "energi" | "samferdsel" | "levekår"

function guessVoteringTheme(title: string): ThemeKey | null {
  const t = title.toLowerCase()
  if (t.includes("klima") || t.includes("utslipp") || t.includes("natur") || t.includes("miljø")) return "klima"
  if (t.includes("strøm") || t.includes("energi") || t.includes("kraft") || t.includes("fornybar")) return "energi"
  if (t.includes("vei") || t.includes("tog") || t.includes("bane") || t.includes("transport") || t.includes("kollektiv") || t.includes("jernbane")) return "samferdsel"
  if (t.includes("helse") || t.includes("velferd") || t.includes("arbeid") || t.includes("trygd") || t.includes("skole") || t.includes("utdanning") || t.includes("barnehage")) return "levekår"
  return null
}

export default function Votering({ lang }: VoteringProps) {
  const t =
    lang === "no"
      ? {
          title: "Stemmeoversikt",
          intro: "Se hvordan representantene fra Agder stemmer på Stortinget. Velg en sak for å se stemmemønsteret.",
          loadingReps: "Laster representanter...",
          loadingSaker: "Laster saker...",
          loadingVoting: "Laster stemmedata...",
          errorReps: "Klarte ikke hente representanter",
          errorSaker: "Klarte ikke hente saker",
          errorVoting: "Klarte ikke hente stemmedata",
          selectSak: "Velg en sak i listen for å se stemmegivningen",
          noVoting: "Ingen voteringsdata for denne saken",
          for: "For",
          mot: "Mot",
          absent: "Ikke til stede",
          vedtatt: "Vedtatt",
          ikkeVedtatt: "Ikke vedtatt",
          likt: "Uavgjort",
          total: "Totalt i Stortinget",
          agderVotes: "Agderbenkens stemmer",
          session: "Sesjon",
          sessionLabel: "Sesjon",
          cases: "saker tilgjengelig",
          behandlet: "saker med voteringsdata",
          searchPlaceholder: "Søk i saker...",
          noResults: "Ingen saker funnet",
          voteringNr: "Votering",
          result: "Resultat",
          noVoteDetails: "Finner ikke detaljerte stemmetall for denne voteringen. Prøv å velge en annen sak.",
          infoText: "Data hentes direkte fra Stortingets åpne API.",
          agderReps: "Agder-representanter",
          allVotes: "Alle stemmer",
        }
      : {
          title: "Voting Overview",
          intro: "See how representatives from Agder vote in Parliament. Select a case to see the voting pattern.",
          loadingReps: "Loading representatives...",
          loadingSaker: "Loading cases...",
          loadingVoting: "Loading voting data...",
          errorReps: "Could not fetch representatives",
          errorSaker: "Could not fetch cases",
          errorVoting: "Could not fetch voting data",
          selectSak: "Select a case to see voting",
          noVoting: "No voting data for this case",
          for: "For",
          mot: "Against",
          absent: "Absent",
          vedtatt: "Passed",
          ikkeVedtatt: "Rejected",
          likt: "Tied",
          total: "Total in Parliament",
          agderVotes: "Agderbenken votes",
          session: "Session",
          cases: "cases available",
          searchPlaceholder: "Search cases...",
          noResults: "No cases found",
          voteringNr: "Vote",
          result: "Result",
          noVoteDetails: "No detailed vote counts found for this vote. Try another case.",
          infoText: "Data fetched directly from the Storting open API.",
          agderReps: "Agder representatives",
          allVotes: "All votes",
          sessionLabel: "Session",
          behandlet: "processed cases with voting data",
          venterVotering: "Awaiting vote",
        }

  const availableSessions = getAvailableSessions()
  // Standard: nåværende sesjon (2025-2026)
  const [selectedSession, setSelectedSession] = useState<string>(getCurrentSession)

  const [saker, setSaker] = useState<Sak[]>([])
  const [voteringer, setVoteringer] = useState<Votering[]>([])
  const [repVoter, setRepVoter] = useState<RepVote[]>([])
  const [forslag, setForslag] = useState<VoteringForslag[]>([])
  const [selectedSakId, setSelectedSakId] = useState<string | null>(null)
  const [selectedVoteringId, setSelectedVoteringId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [expandedForslag, setExpandedForslag] = useState<Set<string>>(new Set())

  const [loadingSaker, setLoadingSaker] = useState(true)
  const [loadingVoting, setLoadingVoting] = useState(false)
  const [errorSaker, setErrorSaker] = useState<string | null>(null)
  const [errorVoting, setErrorVoting] = useState<string | null>(null)

  // Last inn saker for valgt sesjon — filtrerer til behandlede
  useEffect(() => {
    const ctrl = new AbortController()
    setSaker([])
    setSelectedSakId(null)
    setVoteringer([])
    setRepVoter([])
    setForslag([])
    setSelectedVoteringId(null)
    setLoadingSaker(true)
    setErrorSaker(null)

    async function load() {
      try {
        const params = new URLSearchParams({ sesjonid: selectedSession, antall: "1000", format: "xml" })
        const res = await fetch(`${SAKER_URL}?${params}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`${t.errorSaker} (${res.status})`)
        const xml = await res.text()
        const all = parseSaker(xml)
        // Vis kun behandlede saker og saker som venter votering — disse har voteringsdata
        const withVotes = all.filter(
          (s) => s.status === "behandlet" || s.status === "venter_votering"
        )
        setSaker(withVotes)
      } catch (e) {
        if (ctrl.signal.aborted) return
        setErrorSaker(e instanceof Error ? e.message : t.errorSaker)
      } finally {
        if (!ctrl.signal.aborted) setLoadingSaker(false)
      }
    }
    load()
    return () => ctrl.abort()
  }, [selectedSession])

  // Last inn voteringer når en sak er valgt
  useEffect(() => {
    if (!selectedSakId) {
      setVoteringer([])
      setRepVoter([])
      setSelectedVoteringId(null)
      return
    }
    const ctrl = new AbortController()
    async function load() {
      setLoadingVoting(true)
      setErrorVoting(null)
      setVoteringer([])
      setRepVoter([])
      setSelectedVoteringId(null)
      try {
        const params = new URLSearchParams({ sakid: selectedSakId!, format: "xml" })
        const res = await fetch(`${VOTERINGER_URL}?${params}`, { signal: ctrl.signal })
        if (!res.ok) throw new Error(`${t.errorVoting} (${res.status})`)
        const xml = await res.text()
        const parsed = parseVoteringer(xml, selectedSakId!)
        setVoteringer(parsed)
        if (parsed.length > 0) setSelectedVoteringId(parsed[0].id)
      } catch (e) {
        if (ctrl.signal.aborted) return
        setErrorVoting(e instanceof Error ? e.message : t.errorVoting)
      } finally {
        if (!ctrl.signal.aborted) setLoadingVoting(false)
      }
    }
    load()
    return () => ctrl.abort()
  }, [selectedSakId])

  // Last inn representantvoter og voteringsforslag når en votering er valgt
  useEffect(() => {
    if (!selectedVoteringId) {
      setRepVoter([])
      setForslag([])
      setExpandedForslag(new Set())
      return
    }
    const ctrl = new AbortController()
    async function load() {
      setLoadingVoting(true)
      setErrorVoting(null)
      setForslag([])
      setExpandedForslag(new Set())
      try {
        const params = new URLSearchParams({ voteringid: selectedVoteringId!, format: "xml" })
        const [repRes, forslagRes] = await Promise.all([
          fetch(`${REPR_VOTER_URL}?${params}`, { signal: ctrl.signal }),
          fetch(`${FORSLAG_URL}?${params}`, { signal: ctrl.signal }),
        ])
        if (!repRes.ok) throw new Error(`${t.errorVoting} (${repRes.status})`)
        const [repXml, forslagXml] = await Promise.all([repRes.text(), forslagRes.ok ? forslagRes.text() : Promise.resolve("")])
        setRepVoter(parseRepVoter(repXml))
        if (forslagXml) setForslag(parseVoteringForslag(forslagXml))
      } catch (e) {
        if (ctrl.signal.aborted) return
        setErrorVoting(e instanceof Error ? e.message : t.errorVoting)
      } finally {
        if (!ctrl.signal.aborted) setLoadingVoting(false)
      }
    }
    load()
    return () => ctrl.abort()
  }, [selectedVoteringId])

  const filteredSaker = useMemo(() => {
    if (!search.trim()) return saker
    const q = search.toLowerCase()
    return saker.filter(
      (s) =>
        s.tittel.toLowerCase().includes(q) ||
        s.kortTittel.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
    )
  }, [saker, search])

  const selectedSak = useMemo(
    () => saker.find((s) => s.id === selectedSakId) ?? null,
    [saker, selectedSakId]
  )

  const selectedVotering = useMemo(
    () => voteringer.find((v) => v.id === selectedVoteringId) ?? null,
    [voteringer, selectedVoteringId]
  )

  // repVoter er allerede filtrert til kun Agder-reps i parseRepVoter
  const agderSummary = useMemo(() => {
    const forCount = repVoter.filter((v) => v.vote === "for").length
    const motCount = repVoter.filter((v) => v.vote === "mot").length
    const absentCount = repVoter.filter((v) => v.vote === "ikke_tilstede").length
    return { forCount, motCount, absentCount }
  }, [repVoter])

  // Bruker vedtatt (boolean) + resultatTekst fra det faktiske API-formatet
  const vedtakLabel = (v: Votering) => {
    if (v.resultatTekst) return v.resultatTekst
    if (v.resultatType === "enstemmig_vedtatt") return lang === "no" ? "Enstemmig vedtatt" : "Unanimously passed"
    if (v.resultatType.includes("vedtatt_mot")) return lang === "no" ? "Vedtatt" : "Passed"
    if (v.resultatType.includes("forkastet")) return lang === "no" ? "Forkastet" : "Rejected"
    return v.vedtatt ? t.vedtatt : t.ikkeVedtatt
  }

  const vedtakColor = (v: Votering) => {
    if (!v.personligVotering && v.vedtatt) return "#16a34a"
    if (v.resultatType.includes("forkastet")) return "#dc2626"
    if (v.resultatType.includes("likt") || v.resultatType.includes("dobbeltstemme")) return "#f59e0b"
    return v.vedtatt ? "#16a34a" : "#dc2626"
  }


  return (
    <>
    <section className="ed-page-hero">
      <div className="ed-page-hero-content">
        <p className="ed-page-hero-kicker">Stortinget · Agder</p>
        <h1 className="ed-page-hero-heading">{lang === "no" ? "Stemmegivning" : "Voting"}</h1>
        <p className="ed-page-hero-lead">{lang === "no" ? "Se hva Stortinget stemte over og hvordan Agderbenkens representanter stemte i hver sak." : "See what Parliament voted on and how Agder's representatives voted in each case."}</p>
      </div>
      <div className="ed-page-hero-panel" aria-hidden />
    </section>

    <div className="vsl-page">

    {/* ── LEFT SIDEBAR ── */}
    <aside className="vsl-sidebar">
      <div className="vsl-sidebar-top">
        <div className="vsl-brand-row">
          <div>
            <h1 className="vsl-page-title">{lang === "no" ? "Stemmegivning" : "Voting"}</h1>
            <p className="vsl-page-sub">Stortinget · Agder</p>
          </div>
          <select
            className="vsl-session-select"
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
          >
            {availableSessions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <p className="vsl-sidebar-desc">
          {lang === "no"
            ? "Se hva Stortinget stemte over og hvordan representantene fra Agder stemte."
            : "See what Parliament voted on and how Agder's representatives voted."}
        </p>
        <div className="vsl-search-wrap">
          <svg className="vsl-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden width="15" height="15">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <input
            className="vsl-search"
            type="search"
            placeholder={t.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loadingSaker ? (
        <div className="vsl-list-status">
          <span className="vsl-spinner" aria-hidden />
          <span>{t.loadingSaker}</span>
        </div>
      ) : errorSaker ? (
        <div className="vsl-list-status vsl-list-error">{errorSaker}</div>
      ) : (
        <>
          <p className="vsl-case-count">
            {filteredSaker.length === saker.length
              ? `${saker.length} saker`
              : `${filteredSaker.length} av ${saker.length}`}
          </p>
          <div className="vsl-list" role="list">
            {filteredSaker.length === 0 ? (
              <p className="vsl-list-empty">{t.noResults}</p>
            ) : filteredSaker.map((sak) => {
              const th = guessVoteringTheme(sak.kortTittel || sak.tittel)
              const isActive = selectedSakId === sak.id
              return (
                <button
                  key={sak.id}
                  role="listitem"
                  className={`vsl-item${isActive ? " vsl-item-active" : ""}`}
                  onClick={() => setSelectedSakId(sak.id)}
                >
                  <div className="vsl-item-main">
                    {th && <span className={`vsl-item-dot vsl-dot-${th}`} aria-hidden />}
                    <span className="vsl-item-title">{sak.kortTittel || sak.tittel}</span>
                  </div>
                  <span className="vsl-item-meta">
                    <span className="vsl-item-type">{sak.type}</span>
                    <span className="vsl-item-date">{sak.dato ? sak.dato.slice(0, 10) : ""}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </>
      )}
    </aside>

    {/* ── RIGHT DETAIL PANEL ── */}
    <section className="vsl-detail">
      {!selectedSakId ? (
        <div className="vsl-empty">
          <svg viewBox="0 0 56 56" width="56" height="56" fill="none" aria-hidden>
            <circle cx="28" cy="28" r="24" stroke="currentColor" strokeWidth="1.5" opacity=".15"/>
            <path d="M18 28h20M28 18v20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" opacity=".25"/>
          </svg>
          <p className="vsl-empty-title">{lang === "no" ? "Velg en sak" : "Select a case"}</p>
          <p className="vsl-empty-body">{t.selectSak}</p>
        </div>
      ) : (
        <div className="vsl-article">

          <div className="vsl-article-head">
            <div className="vsl-article-meta">
              {selectedSak?.type && <span className="vsl-article-type">{selectedSak.type}</span>}
              {selectedSak?.dato && (
                <span className="vsl-article-date">{selectedSak.dato.slice(0, 10)}</span>
              )}
            </div>
            <h2 className="vsl-article-title">
              {selectedSak?.kortTittel || selectedSak?.tittel}
            </h2>
            {selectedSak?.tittel !== selectedSak?.kortTittel && selectedSak?.tittel && (
              <p className="vsl-article-subtitle">{selectedSak.tittel}</p>
            )}
          </div>

          {loadingVoting && (
            <div className="vsl-detail-status">
              <span className="vsl-spinner" aria-hidden />
              <span>{t.loadingVoting}</span>
            </div>
          )}
          {errorVoting && (
            <div className="vsl-detail-status vsl-detail-error">{errorVoting}</div>
          )}
          {!loadingVoting && !errorVoting && voteringer.length === 0 && (
            <p className="vsl-no-data">{t.noVoting}</p>
          )}

          {voteringer.length > 0 && (
            <div className="vsl-vtabs-wrap">
              <p className="vsl-vtabs-label">
                {lang === "no"
                  ? `${voteringer.length} votering${voteringer.length > 1 ? "er" : ""} — velg én:`
                  : `${voteringer.length} vote${voteringer.length > 1 ? "s" : ""} — select:`}
              </p>
              <div className="vsl-vtabs">
                {voteringer.map((v, i) => {
                  const simple = simplifyTema(v.tema, lang)
                  const isActive = selectedVoteringId === v.id
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`vsl-vtab${isActive ? " vsl-vtab-active" : ""}`}
                      onClick={() => setSelectedVoteringId(v.id)}
                      style={isActive ? { borderColor: vedtakColor(v) } : {}}
                    >
                      <span className="vsl-vtab-nr">#{i + 1}</span>
                      <span className="vsl-vtab-label">{simple || v.tema || `${t.voteringNr} ${i + 1}`}</span>
                      <span className="vsl-vtab-badge" style={{ background: vedtakColor(v) }}>
                        {vedtakLabel(v)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {selectedVotering && (() => {
            const simple = simplifyTema(selectedVotering.tema, lang)
            const explain = explainTema(selectedVotering.tema, lang)
            const TRUNCATE = 380
            const total = selectedVotering.antallFor + selectedVotering.antallMot + selectedVotering.antallIkkeTilStede
            return (
              <div className="vsl-content">

                {/* ① DET BLE STEMT OVER */}
                <div className="vsl-tema-secondary">
                  <p className="vsl-section-label">{lang === "no" ? "Det ble stemt over" : "They voted on"}</p>
                  <h3 className="vsl-section-heading">
                    {simple || selectedVotering.tema || (lang === "no" ? "Saken som helhet" : "The case as a whole")}
                  </h3>
                  {explain && <p className="vsl-section-body">{explain}</p>}
                  {selectedVotering.tid && (
                    <p className="vsl-section-time">
                      {new Date(selectedVotering.tid).toLocaleString(lang === "no" ? "nb-NO" : "en-GB", {
                        day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </p>
                  )}
                  {forslag.length > 0 && (
                    <div className="votering-forslag-list">
                      {forslag.map((f) => {
                        const isExpanded = expandedForslag.has(f.id)
                        const isTruncated = f.tekst.length > TRUNCATE
                        const visibleText = isExpanded ? f.tekst : f.tekst.slice(0, TRUNCATE)
                        const typeLabel =
                          f.type === "tilraading"
                            ? (lang === "no" ? "Komiteens forslag" : "Committee proposal")
                            : f.type === "mindretallsforslag"
                            ? (lang === "no" ? "Mindretallsforslag" : "Minority proposal")
                            : (lang === "no" ? "Løst forslag" : "Free proposal")
                        const typeClass =
                          f.type === "tilraading" ? "forslag-tilraading"
                          : f.type === "mindretallsforslag" ? "forslag-mindretall"
                          : "forslag-loest"
                        const heading = f.paaVegneAv || f.betegnelse || f.betegnelseKort
                        return (
                          <div key={f.id} className={`votering-forslag-card ${typeClass}`}>
                            <div className="votering-forslag-header">
                              {heading && <span className="votering-forslag-fra">{heading}</span>}
                              <span className={`votering-forslag-type ${typeClass}-badge`}>{typeLabel}</span>
                            </div>
                            {f.tekst ? (
                              <>
                                <p className="votering-forslag-tekst">
                                  {visibleText}{!isExpanded && isTruncated && "…"}
                                </p>
                                {isTruncated && (
                                  <button
                                    type="button"
                                    className="votering-forslag-toggle"
                                    onClick={() => setExpandedForslag((prev) => {
                                      const next = new Set(prev)
                                      isExpanded ? next.delete(f.id) : next.add(f.id)
                                      return next
                                    })}
                                  >
                                    {isExpanded
                                      ? (lang === "no" ? "Vis mindre" : "Show less")
                                      : (lang === "no" ? "Les hele forslaget" : "Read full proposal")}
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="votering-forslag-mangler">
                                {lang === "no" ? "Forslagstekst ikke tilgjengelig." : "Proposal text not available."}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* ② AGDERBENKENS STEMMER */}
                <div className="vsl-agder-focus">
                  <p className="vsl-section-label">{lang === "no" ? "Agderbenkens stemmer" : "Agder votes"}</p>

                  {loadingVoting && (
                    <div className="vsl-detail-status">
                      <span className="vsl-spinner" aria-hidden />
                      <span>{t.loadingVoting}</span>
                    </div>
                  )}

                  {repVoter.length > 0 && (
                    <>
                      <div className="vsl-agder-scoreboard">
                        <div className="vsl-agder-score vsl-agder-score-for">
                          <span className="vsl-agder-score-num">{agderSummary.forCount}</span>
                          <span className="vsl-agder-score-lbl">{lang === "no" ? "stemte for" : "voted for"}</span>
                        </div>
                        <div className="vsl-agder-score-sep">·</div>
                        <div className="vsl-agder-score vsl-agder-score-mot">
                          <span className="vsl-agder-score-num">{agderSummary.motCount}</span>
                          <span className="vsl-agder-score-lbl">{lang === "no" ? "stemte mot" : "voted against"}</span>
                        </div>
                        {agderSummary.absentCount > 0 && (
                          <>
                            <div className="vsl-agder-score-sep">·</div>
                            <div className="vsl-agder-score vsl-agder-score-absent">
                              <span className="vsl-agder-score-num">{agderSummary.absentCount}</span>
                              <span className="vsl-agder-score-lbl">{lang === "no" ? "ikke til stede" : "absent"}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="vsl-rep-grid">
                        {repVoter.map((rv) => (
                          <div key={rv.representantId} className={`vsl-rep-card vsl-rep-${rv.vote}`}>
                            <span className="vsl-rep-stripe" style={{ background: getPartyColor(rv.parti) }} />
                            <div className="vsl-rep-info">
                              <span className="vsl-rep-name">{rv.fornavn} {rv.etternavn}</span>
                              <span className="vsl-rep-parti">{rv.parti}</span>
                            </div>
                            <div className="vsl-rep-icon"><VoteIcon vote={rv.vote} /></div>
                          </div>
                        ))}
                      </div>

                      <div className="vsl-rep-legend">
                        <span className="vsl-rep-legend-item"><VoteIcon vote="for" />{lang === "no" ? "Stemte for" : "Voted for"}</span>
                        <span className="vsl-rep-legend-item"><VoteIcon vote="mot" />{lang === "no" ? "Stemte mot" : "Voted against"}</span>
                        <span className="vsl-rep-legend-item"><VoteIcon vote="ikke_tilstede" />{lang === "no" ? "Ikke til stede" : "Absent"}</span>
                      </div>
                    </>
                  )}

                  {repVoter.length === 0 && !loadingVoting && (
                    <p className="vsl-agder-no-data">
                      {lang === "no"
                        ? "Ingen individuelle stemmer registrert for denne voteringen."
                        : "No individual votes recorded for this vote."}
                    </p>
                  )}
                </div>

                {/* ③ HELE STORTINGET */}
                <div className="vsl-section vsl-storting-compact">
                  <p className="vsl-section-label">{lang === "no" ? "Hele Stortinget stemte" : "Full Parliament voted"}</p>
                  <div className="vsl-storting-row">
                    <span className="vsl-storting-verdict" style={{ color: vedtakColor(selectedVotering) }}>
                      {vedtakLabel(selectedVotering)}
                    </span>
                    {selectedVotering.personligVotering && (
                      <span className="vsl-storting-counts">
                        <span className="vsl-count-for">✓ {selectedVotering.antallFor}</span>
                        <span className="vsl-count-mot">✗ {selectedVotering.antallMot}</span>
                        {selectedVotering.antallIkkeTilStede > 0 && (
                          <span className="vsl-count-absent">– {selectedVotering.antallIkkeTilStede}</span>
                        )}
                      </span>
                    )}
                  </div>
                  {selectedVotering.personligVotering && (
                    <div className="vsl-storting-bar-wrap">
                      {[
                        { pct: Math.round(selectedVotering.antallFor / Math.max(1,total) * 100), cls: "votering-fill-for" },
                        { pct: Math.round(selectedVotering.antallMot / Math.max(1,total) * 100), cls: "votering-fill-mot" },
                        { pct: Math.round(selectedVotering.antallIkkeTilStede / Math.max(1,total) * 100), cls: "votering-fill-absent" },
                      ].filter(b => b.pct > 0).map((b, i) => (
                        <div key={i} className={`vsl-storting-seg ${b.cls}`} style={{ width: `${b.pct}%` }} title={`${b.pct}%`} />
                      ))}
                    </div>
                  )}
                  {!selectedVotering.personligVotering && (
                    <p className="vsl-storting-unanimous">
                      {lang === "no" ? "Enstemmig — ingen individuelle stemmer registrert." : "Unanimous — no individual votes recorded."}
                    </p>
                  )}
                </div>

              </div>
            )
          })()}

        </div>
      )}
    </section>

  </div>
  </>
)
}
