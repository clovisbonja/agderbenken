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

import { useEffect, useMemo, useState } from "react"

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

  return representatives
    .map((rep): Representative => {
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

      return {
        id: pickFirstNonEmpty(rep, ["id"]),
        fornavn: pickFirstNonEmpty(rep, ["fornavn"]),
        etternavn: pickFirstNonEmpty(rep, ["etternavn"]),
        alder: parseAge(pickFirstNonEmpty(rep, ["foedselsdato"])),
        parti,
        kommune,
        fylke,
      }
    })
    // Vi viser bare rader med navn.
    .filter((rep) => Boolean(rep.fornavn && rep.etternavn))
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

type RepresentanterProps = { lang: Lang }

export default function Representanter({ lang }: RepresentanterProps) {
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
  // Valgt parti i filteret.
  const [selectedParty, setSelectedParty] = useState<string>(ALL_PARTIES_OPTION)
  // Hvilken representant som er "aktiv" (for stort profilbilde og markering i kort).
  const [selectedRepresentativeId, setSelectedRepresentativeId] = useState<string | null>(
    null
  )

  useEffect(() => {
    // AbortController gjør at vi kan avbryte hentingen hvis brukeren forlater siden.
    const controller = new AbortController()

    async function loadRepresentatives() {
      setLoading(true)
      setError(null)

      // Henter alltid ferske data direkte fra API (ingen lokal cache).
      try {
        const response = await fetch(API_URL, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`${t.fetchError} (${response.status})`)
        }

        const xmlText = await response.text()
        const parsed = parseRepresentatives(xmlText)

        setData(parsed)
        setLastUpdated(Date.now())
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : t.unknownFetchError)
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

  // Stabil sortering for forutsigbar visning.
  const sortedRepresentanter = useMemo(
    () =>
      [...agderRepresentanter].sort((a, b) =>
        `${a.etternavn} ${a.fornavn}`.localeCompare(
          `${b.etternavn} ${b.fornavn}`,
          "nb-NO"
        )
      ),
    [agderRepresentanter]
  )

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

  useEffect(() => {
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
              ? "Agderbenkens representanter på Stortinget — hvem de er og hva de gjør."
              : "Agder's representatives in the Storting — who they are and what they do."}
          </p>
          {!loading && !error && (
            <p className="ed-page-hero-meta">
              {sortedRepresentanter.length} {lang === "no" ? "representanter fra Agder" : "representatives from Agder"} · {lang === "no" ? "Hentet live fra Stortingets API" : "Fetched live from the Storting API"}
            </p>
          )}
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>
      <div className="rp-hero" style={{display:"none"}}>
        <div className="rp-hero-inner">
          <div className="rp-hero-left">
          </div>
          {!loading && !error && (
            <div className="rp-hero-stat">
              <span className="rp-hero-stat-num">{sortedRepresentanter.length}</span>
              <span className="rp-hero-stat-lbl">{lang === "no" ? "representanter" : "representatives"}</span>
            </div>
          )}
        </div>
      </div>

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
              <div className="rp-detail" aria-live="polite">
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
                    </h2>
                    <p className="rp-detail-age">
                      {selectedRepresentative.alder !== null
                        ? `${selectedRepresentative.alder} ${t.years}`
                        : t.ageUnknown}
                    </p>
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
                      onClick={() => setSelectedRepresentativeId(isSelected ? null : rep.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault()
                          setSelectedRepresentativeId(isSelected ? null : rep.id)
                        }
                      }}
                    >
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
                      {isSelected && <span className="rp-card-tick" aria-hidden>✓</span>}
                    </article>
                  )
                })}
              </div>
            )}

          </>
        )}
      </div>
    </div>
  )
}
