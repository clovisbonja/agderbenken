import { describe, it, expect } from "vitest"
import {
  beregnetAktivSesjon,
  sesjonVisningsnavn,
  sakerApiUrl,
  voteringerApiUrl,
} from "../config/sesjon"

// ── beregnetAktivSesjon ───────────────────────────────────────────────────────

describe("beregnetAktivSesjon", () => {
  it("returnerer en streng på formatet ÅÅÅÅ-ÅÅÅÅ", () => {
    const sesjon = beregnetAktivSesjon()
    expect(sesjon).toMatch(/^\d{4}-\d{4}$/)
  })

  it("de to årstallene følger hverandre (sluttår = startår + 1)", () => {
    const sesjon = beregnetAktivSesjon()
    const [start, slutt] = sesjon.split("-").map(Number)
    expect(slutt).toBe(start + 1)
  })
})

// ── sesjonVisningsnavn ────────────────────────────────────────────────────────

describe("sesjonVisningsnavn", () => {
  it("forkorter sluttåret til to siffer", () => {
    expect(sesjonVisningsnavn("2024-2025")).toBe("2024/25")
  })

  it("håndterer sesjon på tvers av tiår", () => {
    expect(sesjonVisningsnavn("2029-2030")).toBe("2029/30")
  })

  it("returnerer originalverdien for ugyldig format", () => {
    expect(sesjonVisningsnavn("ugyldig")).toBe("ugyldig")
  })
})

// ── sakerApiUrl ───────────────────────────────────────────────────────────────

describe("sakerApiUrl", () => {
  it("bygger korrekt URL for Stortingets API", () => {
    expect(sakerApiUrl("2024-2025")).toBe(
      "https://data.stortinget.no/eksport/saker?sesjonid=2024-2025"
    )
  })

  it("URL-en inneholder sesjon-ID-en", () => {
    const url = sakerApiUrl("2023-2024")
    expect(url).toContain("2023-2024")
  })
})

// ── voteringerApiUrl ──────────────────────────────────────────────────────────

describe("voteringerApiUrl", () => {
  it("bygger korrekt URL for voteringer", () => {
    expect(voteringerApiUrl("2024-2025")).toBe(
      "https://data.stortinget.no/eksport/voteringer?sesjonid=2024-2025"
    )
  })

  it("URL-en inneholder sesjon-ID-en", () => {
    const url = voteringerApiUrl("2023-2024")
    expect(url).toContain("2023-2024")
  })
})
