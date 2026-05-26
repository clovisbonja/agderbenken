import { describe, it, expect } from "vitest"
import {
  formaterDato,
  månedKortform,
  formaterKlokkeslett,
  datoSorteringsverdi,
  beregnMånedsTrend,
} from "../utils/dato"

// ── formaterDato ─────────────────────────────────────────────────────────────

describe("formaterDato", () => {
  it("returnerer norsk datoformat for gyldig ISO-dato (no)", () => {
    // "15.11.2024" er norsk format
    const resultat = formaterDato("2024-11-15", "no")
    expect(resultat).toBe("15.11.2024")
  })

  it("returnerer britisk datoformat for gyldig ISO-dato (en)", () => {
    // "15/11/2024" er britisk format
    const resultat = formaterDato("2024-11-15", "en")
    expect(resultat).toBe("15/11/2024")
  })

  it("returnerer em-dash for tom streng", () => {
    expect(formaterDato("", "no")).toBe("—")
  })

  it("returnerer originalverdien for ugyldig datostreng", () => {
    expect(formaterDato("ikke-en-dato", "no")).toBe("ikke-en-dato")
  })
})

// ── månedKortform ─────────────────────────────────────────────────────────────

describe("månedKortform", () => {
  it("returnerer norsk månedskortform", () => {
    const resultat = månedKortform("2024-11", "no")
    // "nov." eller "nov" avhengig av Node-versjon — sjekk at det starter med "nov"
    expect(resultat.toLowerCase()).toMatch(/^nov/)
  })

  it("returnerer engelsk månedskortform", () => {
    const resultat = månedKortform("2024-11", "en")
    expect(resultat.toLowerCase()).toMatch(/^nov/)
  })

  it("returnerer originalverdien for ugyldig månedstreng", () => {
    expect(månedKortform("ugyldig", "no")).toBe("ugyldig")
  })

  it("returnerer originalverdien for tom streng", () => {
    expect(månedKortform("", "no")).toBe("")
  })

  it("håndterer januar korrekt", () => {
    const resultat = månedKortform("2024-01", "no")
    expect(resultat.toLowerCase()).toMatch(/^jan/)
  })
})

// ── formaterKlokkeslett ───────────────────────────────────────────────────────

describe("formaterKlokkeslett", () => {
  it("returnerer em-dash for null", () => {
    expect(formaterKlokkeslett(null, "no")).toBe("—")
  })

  it("returnerer HH:MM-format for gyldig dato", () => {
    // Lag en dato med kjent klokkeslett (UTC) — juster for lokal tidssone
    const dato = new Date("2024-06-15T10:30:00")
    const resultat = formaterKlokkeslett(dato, "no")
    // Formatet skal være HH:MM (to siffer, kolon, to siffer)
    expect(resultat).toMatch(/^\d{2}:\d{2}$/)
  })
})

// ── datoSorteringsverdi ───────────────────────────────────────────────────────

describe("datoSorteringsverdi", () => {
  it("returnerer et positivt tall for gyldig ISO-dato", () => {
    expect(datoSorteringsverdi("2024-11-15")).toBeGreaterThan(0)
  })

  it("returnerer 0 for tom streng", () => {
    expect(datoSorteringsverdi("")).toBe(0)
  })

  it("returnerer 0 for ugyldig datostreng", () => {
    expect(datoSorteringsverdi("ikke-dato")).toBe(0)
  })

  it("nyere dato gir større sorteringsverdi", () => {
    const nyere = datoSorteringsverdi("2025-01-01")
    const eldre = datoSorteringsverdi("2020-01-01")
    expect(nyere).toBeGreaterThan(eldre)
  })
})

// ── beregnMånedsTrend ─────────────────────────────────────────────────────────

describe("beregnMånedsTrend", () => {
  it("returnerer tom liste for tom input", () => {
    expect(beregnMånedsTrend([])).toEqual([])
  })

  it("grupperer saker riktig per måned", () => {
    const saker = [
      { dato: "2024-11-01" },
      { dato: "2024-11-15" },
      { dato: "2024-10-05" },
    ]
    const trend = beregnMånedsTrend(saker)
    const novemberPost = trend.find((t) => t.måned === "2024-11")
    const oktoberPost  = trend.find((t) => t.måned === "2024-10")
    expect(novemberPost?.antall).toBe(2)
    expect(oktoberPost?.antall).toBe(1)
  })

  it("begrenser til maks 8 måneder som standard", () => {
    // Lag 10 forskjellige måneder
    const saker = Array.from({ length: 10 }, (_, i) => ({
      dato: `2024-${String(i + 1).padStart(2, "0")}-01`,
    }))
    const trend = beregnMånedsTrend(saker)
    expect(trend.length).toBeLessThanOrEqual(8)
  })

  it("respekterer tilpasset maks-antall", () => {
    const saker = Array.from({ length: 10 }, (_, i) => ({
      dato: `2024-${String(i + 1).padStart(2, "0")}-01`,
    }))
    const trend = beregnMånedsTrend(saker, 3)
    expect(trend.length).toBeLessThanOrEqual(3)
  })

  it("returnerer måneder sortert kronologisk (eldst først)", () => {
    const saker = [
      { dato: "2024-12-01" },
      { dato: "2024-10-01" },
      { dato: "2024-11-01" },
    ]
    const trend = beregnMånedsTrend(saker)
    expect(trend.map((t) => t.måned)).toEqual(["2024-10", "2024-11", "2024-12"])
  })

  it("hopper over saker uten dato", () => {
    const saker = [{ dato: "" }, { dato: "2024-11-01" }]
    const trend = beregnMånedsTrend(saker)
    expect(trend).toHaveLength(1)
    expect(trend[0].antall).toBe(1)
  })
})
