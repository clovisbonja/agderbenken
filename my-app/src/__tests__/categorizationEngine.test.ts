import { describe, it, expect } from "vitest"
import {
  levenshteinDistance,
  fuzzyMatch,
  categorizeSak,
  categorizeCases,
  searchCases,
} from "../lib/categorizationEngine"
import type { CaseItem } from "../types/sak"

// ── Testdata-fabrikk ──────────────────────────────────────────────────────────

function lagSak(overrides: Partial<CaseItem> = {}): CaseItem {
  return {
    id: "test-001",
    title: "Testproposisjon",
    shortTitle: "Testproposisjon",
    type: "Proposisjon",
    status: "til_behandling",
    date: "2024-11-01",
    committee: "Generell komité",
    ...overrides,
  }
}

// ── levenshteinDistance ───────────────────────────────────────────────────────

describe("levenshteinDistance", () => {
  it("returnerer 1 for to identiske strenger", () => {
    expect(levenshteinDistance("hei", "hei")).toBe(1)
  })

  it("returnerer 1 for to tomme strenger", () => {
    expect(levenshteinDistance("", "")).toBe(1)
  })

  it("returnerer 0 hvis én streng er tom og den andre ikke", () => {
    expect(levenshteinDistance("hei", "")).toBe(0)
    expect(levenshteinDistance("", "hei")).toBe(0)
  })

  it("returnerer høy score for nær-identiske strenger", () => {
    // "klima" vs "klime" — én bokstav forskjell
    const score = levenshteinDistance("klima", "klime")
    expect(score).toBeGreaterThan(0.7)
  })

  it("returnerer lav score for svært ulike strenger", () => {
    const score = levenshteinDistance("abc", "xyz")
    expect(score).toBeLessThan(0.5)
  })

  it("er symmetrisk — rekkefølgen av argumenter spiller ingen rolle", () => {
    const ab = levenshteinDistance("helse", "helst")
    const ba = levenshteinDistance("helst", "helse")
    expect(ab).toBe(ba)
  })
})

// ── fuzzyMatch ────────────────────────────────────────────────────────────────

describe("fuzzyMatch", () => {
  it("returnerer 100 ved eksakt substring-treff", () => {
    expect(fuzzyMatch("klimapolitikk er viktig", "klima")).toBe(100)
  })

  it("er case-insensitiv ved eksakt treff", () => {
    expect(fuzzyMatch("Klimapolitikk", "klima")).toBe(100)
  })

  it("returnerer 60 ved treff på de første 4 tegnene", () => {
    // "skat" er de første 4 tegnene i "skatteregelen"
    // Nøkkelordet "skatteregelen" matcher ikke direkte, men prefiks "skat" finnes i "skattelov"
    expect(fuzzyMatch("skattelov er endret", "skatteregelen")).toBe(60)
  })

  it("returnerer 0 for ingen match", () => {
    expect(fuzzyMatch("fotball er gøy", "klima")).toBe(0)
  })

  it("returnerer 0 for tom nøkkelord", () => {
    expect(fuzzyMatch("klimapolitikk", "")).toBe(0)
  })

  it("returnerer 0 for tom tekst", () => {
    expect(fuzzyMatch("", "klima")).toBe(0)
  })
})

// ── categorizeSak ─────────────────────────────────────────────────────────────

describe("categorizeSak", () => {
  it("kategoriserer en klimasak til 'klima'", () => {
    const sak = lagSak({
      title: "Endringer i klimakvotesystemet",
      shortTitle: "Klimakvoter",
      committee: "Energi- og miljøkomiteen",
    })
    const resultat = categorizeSak(sak)
    expect(resultat.primary).toBe("klima")
  })

  it("kategoriserer en helsesak til 'helse'", () => {
    const sak = lagSak({
      title: "Bedre fastlegeordning i norske kommuner",
      shortTitle: "Fastlegeordning",
      committee: "Helse- og omsorgskomiteen",
    })
    const resultat = categorizeSak(sak)
    expect(resultat.primary).toBe("helse")
  })

  it("kategoriserer en utdanningssak til 'utdanning'", () => {
    const sak = lagSak({
      title: "Endringer i skoleopplæringsloven",
      shortTitle: "Opplæringsloven",
      committee: "Utdannings- og forskningskomiteen",
    })
    const resultat = categorizeSak(sak)
    expect(resultat.primary).toBe("utdanning")
  })

  it("returnerer en score og matches-liste", () => {
    const sak = lagSak({
      title: "Klimatiltak i transportsektoren",
      shortTitle: "Klimatransport",
      committee: "Miljøkomiteen",
    })
    const resultat = categorizeSak(sak)
    expect(resultat.score).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(resultat.matches)).toBe(true)
  })

  it("alltid returnerer en av de gyldige tema-nøklene", () => {
    const gyldigeTemaer = ["klima", "helse", "utdanning", "økonomi", "samferdsel", "justis", "distrikt"]
    const sak = lagSak({ title: "Absolutt tilfeldig tittel xyzzy" })
    const resultat = categorizeSak(sak)
    expect(gyldigeTemaer).toContain(resultat.primary)
  })
})

// ── categorizeCases ───────────────────────────────────────────────────────────

describe("categorizeCases", () => {
  it("returnerer et objekt med alle tema-nøkler", () => {
    const resultat = categorizeCases([])
    const nøkler = Object.keys(resultat)
    expect(nøkler).toEqual(
      expect.arrayContaining(["klima", "helse", "utdanning", "økonomi", "samferdsel", "justis", "distrikt"])
    )
  })

  it("returnerer tomme lister for alle temaer ved tom input", () => {
    const resultat = categorizeCases([])
    Object.values(resultat).forEach((liste) => {
      expect(liste).toHaveLength(0)
    })
  })

  it("plasserer alle saker i én av kategoriene (ingen forsvinner)", () => {
    const saker = [
      lagSak({ id: "1", title: "Klimakvote" }),
      lagSak({ id: "2", title: "Fastlege endringer" }),
      lagSak({ id: "3", title: "Skattereform" }),
    ]
    const resultat = categorizeCases(saker)
    const totalt = Object.values(resultat).flat().length
    expect(totalt).toBe(saker.length)
  })

  it("legger til category-felt på hver sak", () => {
    const saker = [lagSak({ id: "1", title: "Klimatiltak" })]
    const resultat = categorizeCases(saker)
    const alleSaker = Object.values(resultat).flat()
    expect(alleSaker[0]).toHaveProperty("category")
  })
})

// ── searchCases ───────────────────────────────────────────────────────────────

describe("searchCases", () => {
  const saker: CaseItem[] = [
    lagSak({ id: "1", title: "Ny klimalov for utslippsreduksjon", shortTitle: "Klimalov" }),
    lagSak({ id: "2", title: "Forbedring av fastlegeordningen", shortTitle: "Fastlege" }),
    lagSak({ id: "3", title: "Økt støtte til distriktskommuner", shortTitle: "Distriktsstøtte" }),
  ]

  it("returnerer alle saker for tom søkestreng", () => {
    expect(searchCases(saker, "")).toHaveLength(saker.length)
  })

  it("finner saker som matcher på kortittel", () => {
    const resultat = searchCases(saker, "klimalov")
    expect(resultat.some((s) => s.id === "1")).toBe(true)
  })

  it("finner saker som matcher på fulltittel", () => {
    const resultat = searchCases(saker, "fastlege")
    expect(resultat.some((s) => s.id === "2")).toBe(true)
  })

  it("er case-insensitiv", () => {
    const resultat = searchCases(saker, "KLIMALOV")
    expect(resultat.some((s) => s.id === "1")).toBe(true)
  })

  it("returnerer tom liste for søkeord uten treff", () => {
    const resultat = searchCases(saker, "xyz123ingentreff")
    expect(resultat).toHaveLength(0)
  })

  it("sorterer etter relevans — beste treff øverst", () => {
    const resultat = searchCases(saker, "klimalov")
    if (resultat.length > 1) {
      // Saken som matcher i kortittel skal ha høyest score
      expect(resultat[0].id).toBe("1")
    }
  })
})
