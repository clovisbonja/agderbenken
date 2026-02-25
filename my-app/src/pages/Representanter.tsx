import { useEffect, useMemo, useState } from "react"

const API_URL =
  "https://data.stortinget.no/eksport/representanter?stortingsperiodeid=2005-2009"
const CACHE_KEY = "representanter-2005-2009-cache-v1"
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

type Representative = {
  id: string
  fornavn: string
  etternavn: string
  alder: number | null
  parti: string
  kommune: string
  fylke: string
}

type CachePayload = {
  fetchedAt: number
  data: Representative[]
}

function readCache(): CachePayload | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachePayload
    if (
      typeof parsed.fetchedAt !== "number" ||
      !Array.isArray(parsed.data)
    ) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

function writeCache(payload: CachePayload) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload))
  } catch {}
}

function normalizeAgder(value: string): string {
  const v = value.trim().toLowerCase()
  if (v === "aust-agder" || v === "vest-agder" || v === "agder") return "Agder"
  return value.trim()
}

function getTextByLocalName(node: Element, name: string): string {
  if (node.localName === name) return (node.textContent ?? "").trim()
  const all = node.getElementsByTagName("*")
  for (let i = 0; i < all.length; i += 1) {
    const el = all[i]
    if (el.localName === name) return (el.textContent ?? "").trim()
  }
  return ""
}

function parseAge(isoDateTime: string): number | null {
  if (!isoDateTime) return null
  const birth = new Date(isoDateTime)
  if (Number.isNaN(birth.getTime())) return null

  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())

  if (beforeBirthday) age -= 1
  return age
}

function parseRepresentatives(xmlText: string): Representative[] {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml")
  const reps = Array.from(doc.getElementsByTagName("*")).filter(
    (el) => el.localName === "representant"
  )

  return reps
    .map((rep): Representative => {
      const fylkeElement = Array.from(rep.getElementsByTagName("*")).find(
        (el) => el.localName === "fylke"
      )
      const partiElement = Array.from(rep.getElementsByTagName("*")).find(
        (el) => el.localName === "parti"
      )
      const kommuneElement = Array.from(rep.getElementsByTagName("*")).find(
        (el) => el.localName === "kommune" || el.localName === "hjemkommune"
      )

      const fylkeRaw = fylkeElement
        ? getTextByLocalName(fylkeElement, "navn") ||
          getTextByLocalName(fylkeElement, "id")
        : ""

      const parti =
        (partiElement &&
          (getTextByLocalName(partiElement, "navn") ||
            getTextByLocalName(partiElement, "id"))) ||
        "Ukjent parti"

      const kommuneRaw = kommuneElement
        ? getTextByLocalName(kommuneElement, "navn") ||
          getTextByLocalName(kommuneElement, "id")
        : ""

      const fylke = normalizeAgder(fylkeRaw || "Ukjent fylke")
      const kommune = normalizeAgder(kommuneRaw || fylke)

      return {
        id: getTextByLocalName(rep, "id"),
        fornavn: getTextByLocalName(rep, "fornavn"),
        etternavn: getTextByLocalName(rep, "etternavn"),
        alder: parseAge(getTextByLocalName(rep, "foedselsdato")),
        parti,
        kommune,
        fylke,
      }
    })
    .filter((rep) => rep.fornavn && rep.etternavn)
}

export default function Representanter() {
  const [data, setData] = useState<Representative[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(null)
  const [selectedParty, setSelectedParty] = useState<string>("Alle")

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      const cached = readCache()
      const now = Date.now()
      const hasFreshCache =
        cached !== null && now - cached.fetchedAt < ONE_WEEK_MS

      if (cached) {
        setData(cached.data)
        setLastUpdated(cached.fetchedAt)
      }

      if (hasFreshCache) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(API_URL, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Klarte ikke hente data (${res.status})`)
        }
        const xml = await res.text()
        const parsed = parseRepresentatives(xml)
        const payload: CachePayload = { fetchedAt: Date.now(), data: parsed }
        setData(parsed)
        setLastUpdated(payload.fetchedAt)
        writeCache(payload)
      } catch (e) {
        if (controller.signal.aborted) return
        if (!cached) {
          setError(
            e instanceof Error ? e.message : "Ukjent feil ved henting av data"
          )
        } else {
          setError(
            "Klarte ikke hente nye data nå. Viser sist lagrede data."
          )
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [])

  const agderRepresentanter = useMemo(
    () => data.filter((r) => r.fylke === "Agder" || r.kommune === "Agder"),
    [data]
  )
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
  const partyFilters = useMemo(
    () => [
      "Alle",
      ...Array.from(new Set(sortedRepresentanter.map((rep) => rep.parti))).sort(
        (a, b) => a.localeCompare(b, "nb-NO")
      ),
    ],
    [sortedRepresentanter]
  )
  const visibleRepresentanter = useMemo(
    () =>
      selectedParty === "Alle"
        ? sortedRepresentanter
        : sortedRepresentanter.filter((rep) => rep.parti === selectedParty),
    [selectedParty, sortedRepresentanter]
  )

  return (
    <main className="page">
      <section className="section">
        <h1>Representanter</h1>
        <p>Live data fra Stortinget-API. Oppdateres automatisk hver uke.</p>
        {lastUpdated && (
          <p style={{ fontSize: "0.9rem", opacity: 0.8 }}>
            Sist oppdatert: {new Date(lastUpdated).toLocaleString("nb-NO")}
          </p>
        )}
      </section>

      {loading && <p>Laster representanter...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && !error && (
        <section className="section">
          <div className="rep-header">
            <h2>Agder</h2>
            <span className="rep-count">{visibleRepresentanter.length} representanter</span>
          </div>

          <div className="rep-filter-wrap">
            <label htmlFor="party-filter" className="rep-filter-label">
              Filtrer parti
            </label>
            <select
              id="party-filter"
              className="rep-filter-select"
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
            >
              {partyFilters.map((party) => (
                <option key={party} value={party}>
                  {party}
                </option>
              ))}
            </select>
          </div>

          <div className="rep-grid">
            {visibleRepresentanter.map((rep) => (
              <article
                key={`${rep.id}-${rep.fornavn}-${rep.etternavn}`}
                className="rep-card"
              >
                <div className="rep-top">
                  <div>
                    <h3 className="rep-name">
                      {rep.fornavn} {rep.etternavn}
                    </h3>
                    <p className="rep-muted">{rep.alder !== null ? `${rep.alder} år` : "Alder ukjent"}</p>
                  </div>
                </div>

                <div className="rep-chips">
                  <span className="rep-chip rep-chip-party">{rep.parti}</span>
                  <span className="rep-chip">{rep.kommune}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
