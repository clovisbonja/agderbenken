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
    <main className="page rep-page">
      <div className="rep-page-bg" aria-hidden />
      <div className="rep-page-content">

        {/* Hvit tekst direkte mot den mørke bakgrunnen */}
        <section className="section">
          <h1>{t.title}</h1>
          {/* Denne teksten forklarer at listen er basert på levende data fra Stortinget. */}
          <p>{t.intro}</p>
          {lastUpdated && (
            <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              {t.updated}: {new Date(lastUpdated).toLocaleString(lang === "no" ? "nb-NO" : "en-GB")}
            </p>
          )}
        </section>

        {loading && <p>{t.loading}</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {!loading && !error && (
          <section className="section">

            {/* Hvit tekst mot bakgrunnen for overskrift og filter */}
            <div>
              <div className="rep-header">
                <h2>{t.agder}</h2>
                <span className="rep-count">{visibleRepresentanter.length} {t.representatives}</span>
              </div>

              <div className="rep-filter-wrap">
                {/* Brukeren klikker et kort under for å bytte hvem som vises i profilpanelet. */}
                <p className="rep-filter-hint">{t.tapHint}</p>
                <label htmlFor="party-filter" className="rep-filter-label">
                  {t.filterParty}
                </label>
                <select
                  id="party-filter"
                  className="rep-filter-select"
                  value={selectedParty}
                  // Når parti endres, filtreres listen automatisk.
                  onChange={(e) => setSelectedParty(e.target.value)}
                >
                  {partyFilters.map((party) => (
                    <option key={party} value={party}>
                      {party}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedRepresentative && (
              // Eget panel som viser valgt representant med større bilde.
              // Kortet har sin egen bakgrunn (var(--card)), bruker var(--text) fra CSS.
              <article className="rep-profile" aria-live="polite">
                <img
                  className="rep-profile-image"
                  src={getRepresentativeImageUrl(selectedRepresentative.id)}
                  alt={`${selectedRepresentative.fornavn} ${selectedRepresentative.etternavn}`}
                  loading="lazy"
                />
                <div className="rep-profile-content">
                  <h3 className="rep-profile-name">
                    {selectedRepresentative.fornavn} {selectedRepresentative.etternavn}
                  </h3>
                  <p className="rep-muted">
                    {selectedRepresentative.alder !== null
                      ? `${selectedRepresentative.alder} ${t.years}`
                      : t.ageUnknown}
                  </p>
                  <div className="rep-chips">
                    <span className="rep-chip rep-chip-party">{selectedRepresentative.parti}</span>
                    <span className="rep-chip">{selectedRepresentative.kommune}</span>
                  </div>

                  <section className="rep-bio">
                    <h4 className="rep-bio-heading">{t.biography}</h4>
                    {biographyLoading && <p className="rep-bio-status">{t.loadingBio}</p>}
                    {biographyError && (
                      <p className="rep-bio-status rep-bio-status-error">{biographyError}</p>
                    )}
                    {!biographyLoading && !biographyError && biography.length === 0 && (
                      <p className="rep-bio-status">{t.noBio}</p>
                    )}

                    {!biographyLoading && !biographyError && biography.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="rep-bio-toggle"
                          aria-expanded={showBiography}
                          onClick={() => setShowBiography((current) => !current)}
                        >
                          {showBiography ? t.hideDetails : t.showBio}
                        </button>

                        {showBiography && (
                          <ul className="rep-bio-list">
                            {biography.map((item) => (
                              <li key={item.id} className="rep-bio-row">
                                <p className="rep-bio-title">{item.title}</p>
                                {item.subtitle && <p className="rep-bio-subtitle">{item.subtitle}</p>}
                                {item.period && <p className="rep-bio-period">{item.period}</p>}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </section>
                </div>
              </article>
            )}

            <div className="rep-grid">
              {visibleRepresentanter.map((rep) => (
                <article
                  key={`${rep.id}-${rep.fornavn}-${rep.etternavn}`}
                  className={`rep-card${selectedRepresentativeId === rep.id ? " rep-card-selected" : ""}`}
                  role="button"
                  tabIndex={0}
                  // Klikk oppdaterer valgt representant.
                  onClick={() => setSelectedRepresentativeId(rep.id)}
                  onKeyDown={(event) => {
                    // Tastaturstøtte: Enter/Mellomrom gjør samme som klikk.
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setSelectedRepresentativeId(rep.id)
                    }
                  }}
                >
                  <div className="rep-top">
                    <img
                      className="rep-thumb"
                      // Lite profilbilde i hvert kort.
                      src={getRepresentativeImageUrl(rep.id, "lite")}
                      alt={`${rep.fornavn} ${rep.etternavn}`}
                      loading="lazy"
                    />
                    <div>
                      <h3 className="rep-name">
                        {rep.fornavn} {rep.etternavn}
                      </h3>
                      <p className="rep-muted">
                        {rep.alder !== null ? `${rep.alder} ${t.years}` : t.ageUnknown}
                      </p>
                    </div>
                  </div>

                  <div className="rep-chips">
                    <span className="rep-chip rep-chip-party">{rep.parti}</span>
                    <span className="rep-chip">{rep.kommune}</span>
                  </div>
                </article>
              ))}
            </div>

            {visibleRepresentanter.length === 0 && (
              <p style={{ marginTop: "0.8rem" }}>
                {t.noForParty}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

