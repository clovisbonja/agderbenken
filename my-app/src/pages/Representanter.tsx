import { useEffect, useMemo, useState, useRef } from "react"

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

function FlickeringGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let w = window.innerWidth
    let h = window.innerHeight
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const CELL = 22
    const GAP = 2
    let COLS = Math.ceil(w / CELL)
    let ROWS = Math.ceil(h / CELL)

    let opacities = Array.from({ length: COLS * ROWS }, () => Math.random() * 0.3)
    let targets = Array.from({ length: COLS * ROWS }, () => Math.random() * 0.35)
    let speeds = Array.from({ length: COLS * ROWS }, () => 0.003 + Math.random() * 0.015)

    const flickerInterval = setInterval(() => {
      const n = Math.floor(Math.random() * 12) + 3
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * opacities.length)
        targets[idx] = 0.05 + Math.random() * 0.65
      }
    }, 80)

    let animId: number

    function draw() {
      animId = requestAnimationFrame(draw)
      if (!ctx) return
      ctx.fillStyle = "#04090f"
      ctx.fillRect(0, 0, w, h)
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const i = r * COLS + c
          opacities[i] += (targets[i] - opacities[i]) * speeds[i]
          if (Math.abs(opacities[i] - targets[i]) < 0.005) targets[i] = Math.random() * 0.25
          ctx.fillStyle = `rgba(80, 150, 255, ${opacities[i]})`
          ctx.beginPath()
          ctx.roundRect(c * CELL + GAP, r * CELL + GAP, CELL - GAP * 2, CELL - GAP * 2, 3)
          ctx.fill()
        }
      }
      const grad = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.8)
      grad.addColorStop(0, "rgba(4,9,15,0)")
      grad.addColorStop(1, "rgba(4,9,15,0.85)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, w, h)
    }

    draw()

    const handleResize = () => {
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = w
      canvas.height = h
      COLS = Math.ceil(w / CELL)
      ROWS = Math.ceil(h / CELL)
      opacities = Array.from({ length: COLS * ROWS }, () => Math.random() * 0.3)
      targets = Array.from({ length: COLS * ROWS }, () => Math.random() * 0.35)
      speeds = Array.from({ length: COLS * ROWS }, () => 0.003 + Math.random() * 0.015)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animId)
      clearInterval(flickerInterval)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: -1, pointerEvents: "none" }}
    />
  )
}

// Hvit tekst-stil for innhold direkte mot bakgrunnen (utenfor kortene)
const overBgStyle: React.CSSProperties = {
  color: "white",
  textShadow: "0 1px 8px rgba(0,0,0,0.7)",
}

export default function Representanter() {
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
          throw new Error(`Klarte ikke hente data (${response.status})`)
        }

        const xmlText = await response.text()
        const parsed = parseRepresentatives(xmlText)

        setData(parsed)
        setLastUpdated(Date.now())
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : "Ukjent feil ved henting av data")
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
          throw new Error(`Klarte ikke hente biografi (${response.status})`)
        }

        const xmlText = await response.text()
        setBiography(parseBiography(xmlText))
        setShowBiography(false)
      } catch (e) {
        if (controller.signal.aborted) return
        setBiography([])
        setBiographyError(e instanceof Error ? e.message : "Ukjent feil ved henting av biografi")
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
    <>
      <FlickeringGrid />
      <main className="page">

        {/* Hvit tekst direkte mot den mørke bakgrunnen */}
        <section className="section" style={overBgStyle}>
          <h1>Representanter</h1>
          {/* Denne teksten forklarer at listen er basert på levende data fra Stortinget. */}
          <p>Live data fra Stortinget-API (dagens representanter). Hentes direkte ved hver sidevisning.</p>
          {lastUpdated && (
            <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
              Sist oppdatert: {new Date(lastUpdated).toLocaleString("nb-NO")}
            </p>
          )}
        </section>

        {loading && <p style={overBgStyle}>Laster representanter...</p>}
        {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

        {!loading && !error && (
          <section className="section">

            {/* Hvit tekst mot bakgrunnen for overskrift og filter */}
            <div style={overBgStyle}>
              <div className="rep-header">
                <h2>Agder</h2>
                <span className="rep-count">{visibleRepresentanter.length} representanter</span>
              </div>

              <div className="rep-filter-wrap">
                {/* Brukeren klikker et kort under for å bytte hvem som vises i profilpanelet. */}
                <p className="rep-filter-hint">Trykk på en representant for å se bilde.</p>
                <label htmlFor="party-filter" className="rep-filter-label">
                  Filtrer parti
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
                      ? `${selectedRepresentative.alder} år`
                      : "Alder ukjent"}
                  </p>
                  <div className="rep-chips">
                    <span className="rep-chip rep-chip-party">{selectedRepresentative.parti}</span>
                    <span className="rep-chip">{selectedRepresentative.kommune}</span>
                  </div>

                  <section className="rep-bio">
                    <h4 className="rep-bio-heading">Personlig biografi</h4>
                    {biographyLoading && <p className="rep-bio-status">Laster biografi...</p>}
                    {biographyError && (
                      <p className="rep-bio-status rep-bio-status-error">{biographyError}</p>
                    )}
                    {!biographyLoading && !biographyError && biography.length === 0 && (
                      <p className="rep-bio-status">Ingen biografi funnet for denne representanten.</p>
                    )}

                    {!biographyLoading && !biographyError && biography.length > 0 && (
                      <>
                        <button
                          type="button"
                          className="rep-bio-toggle"
                          aria-expanded={showBiography}
                          onClick={() => setShowBiography((current) => !current)}
                        >
                          {showBiography ? "Skjul detaljer" : "Vis biografi"}
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
                        {rep.alder !== null ? `${rep.alder} år` : "Alder ukjent"}
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
              <p style={{ marginTop: "0.8rem", ...overBgStyle }}>
                Ingen representanter funnet for valgt parti.
              </p>
            )}
          </section>
        )}
      </main>
    </>
  )
}

