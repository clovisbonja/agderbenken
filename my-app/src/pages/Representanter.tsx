import { useEffect, useMemo, useState } from "react"

const API_URL =
  "https://data.stortinget.no/eksport/representanter?stortingsperiodeid=2005-2009"

type Representative = {
  id: string
  fornavn: string
  etternavn: string
  alder: number | null
  parti: string
  kommune: string
  fylke: string
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

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(API_URL, { signal: controller.signal })
        if (!res.ok) {
          throw new Error(`Klarte ikke hente data (${res.status})`)
        }
        const xml = await res.text()
        setData(parseRepresentatives(xml))
      } catch (e) {
        if (controller.signal.aborted) return
        setError(e instanceof Error ? e.message : "Ukjent feil ved henting av data")
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

  return (
    <main className="page">
      <section className="section">
        <h1>Representanter</h1>
        <p>Live data fra Stortinget-API for perioden 2005-2009.</p>
      </section>

      {loading && <p>Laster representanter...</p>}
      {error && <p style={{ color: "#b91c1c" }}>{error}</p>}

      {!loading && !error && (
        <section className="section">
          <h2>Agder ({agderRepresentanter.length})</h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.6rem" }}>Fornavn</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.6rem" }}>Etternavn</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.6rem" }}>Alder</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.6rem" }}>Parti</th>
                  <th style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "0.6rem" }}>Kommune</th>
                </tr>
              </thead>
              <tbody>
                {agderRepresentanter.map((rep) => (
                  <tr key={`${rep.id}-${rep.fornavn}-${rep.etternavn}`}>
                    <td style={{ padding: "0.6rem", borderBottom: "1px solid #eee" }}>{rep.fornavn}</td>
                    <td style={{ padding: "0.6rem", borderBottom: "1px solid #eee" }}>{rep.etternavn}</td>
                    <td style={{ padding: "0.6rem", borderBottom: "1px solid #eee" }}>
                      {rep.alder !== null ? rep.alder : "Ukjent"}
                    </td>
                    <td style={{ padding: "0.6rem", borderBottom: "1px solid #eee" }}>{rep.parti}</td>
                    <td style={{ padding: "0.6rem", borderBottom: "1px solid #eee" }}>{rep.kommune}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
