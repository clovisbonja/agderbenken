import { describe, it, expect } from "vitest"
import {
  normaliserStatus,
  statusVisningsnavn,
  erBehandlet,
  erAktiv,
  erMottatt,
  telStatusFordeling,
} from "../utils/status"

// ── normaliserStatus ──────────────────────────────────────────────────────────

describe("normaliserStatus", () => {
  it("gjør om til lavcase", () => {
    expect(normaliserStatus("BEHANDLET")).toBe("behandlet")
  })

  it("erstatter mellomrom med underscore", () => {
    expect(normaliserStatus("til behandling")).toBe("til_behandling")
  })

  it("erstatter bindestrek med underscore", () => {
    expect(normaliserStatus("til-behandling")).toBe("til_behandling")
  })

  it("håndterer blanding av store bokstaver og mellomrom", () => {
    expect(normaliserStatus("Til Behandling")).toBe("til_behandling")
  })

  it("trimmer ledende og etterfølgende mellomrom", () => {
    expect(normaliserStatus("  mottatt  ")).toBe("mottatt")
  })

  it("håndterer tom streng", () => {
    expect(normaliserStatus("")).toBe("")
  })
})

// ── statusVisningsnavn ────────────────────────────────────────────────────────

describe("statusVisningsnavn", () => {
  it("returnerer norsk visningsnavn for behandlet", () => {
    expect(statusVisningsnavn("behandlet", "no")).toBe("Ferdig behandlet")
  })

  it("returnerer engelsk visningsnavn for behandlet", () => {
    expect(statusVisningsnavn("behandlet", "en")).toBe("Processed")
  })

  it("returnerer norsk visningsnavn for til_behandling (med underscore)", () => {
    expect(statusVisningsnavn("til_behandling", "no")).toBe("Til behandling")
  })

  it("returnerer norsk visningsnavn for til behandling (med mellomrom)", () => {
    // normaliserStatus gjør konverteringen internt
    expect(statusVisningsnavn("til behandling", "no")).toBe("Til behandling")
  })

  it("returnerer norsk visningsnavn for mottatt", () => {
    expect(statusVisningsnavn("mottatt", "no")).toBe("Mottatt — ikke startet")
  })

  it("returnerer originalverdien for ukjent status", () => {
    expect(statusVisningsnavn("helt_ukjent_status", "no")).toBe("helt_ukjent_status")
  })
})

// ── erBehandlet ───────────────────────────────────────────────────────────────

describe("erBehandlet", () => {
  it("returnerer true for 'behandlet'", () => {
    expect(erBehandlet("behandlet")).toBe(true)
  })

  it("returnerer true for 'BEHANDLET' (case-insensitiv)", () => {
    expect(erBehandlet("BEHANDLET")).toBe(true)
  })

  it("returnerer false for 'til behandling'", () => {
    expect(erBehandlet("til behandling")).toBe(false)
  })

  it("returnerer false for tom streng", () => {
    expect(erBehandlet("")).toBe(false)
  })
})

// ── erAktiv ───────────────────────────────────────────────────────────────────

describe("erAktiv", () => {
  it("returnerer true for 'til_behandling'", () => {
    expect(erAktiv("til_behandling")).toBe(true)
  })

  it("returnerer true for 'til behandling' (med mellomrom)", () => {
    expect(erAktiv("til behandling")).toBe(true)
  })

  it("returnerer false for 'behandlet'", () => {
    expect(erAktiv("behandlet")).toBe(false)
  })
})

// ── erMottatt ─────────────────────────────────────────────────────────────────

describe("erMottatt", () => {
  it("returnerer true for 'mottatt'", () => {
    expect(erMottatt("mottatt")).toBe(true)
  })

  it("returnerer false for 'behandlet'", () => {
    expect(erMottatt("behandlet")).toBe(false)
  })
})

// ── telStatusFordeling ────────────────────────────────────────────────────────

describe("telStatusFordeling", () => {
  it("teller behandlet korrekt", () => {
    const saker = [
      { status: "behandlet" },
      { status: "behandlet" },
      { status: "mottatt" },
    ]
    const fordeling = telStatusFordeling(saker)
    expect(fordeling.behandlet).toBe(2)
    expect(fordeling.mottatt).toBe(1)
  })

  it("mapper ukjente statuser til ukjent-kategorien", () => {
    const saker = [{ status: "noe_helt_ukjent" }]
    const fordeling = telStatusFordeling(saker)
    expect(fordeling.ukjent).toBe(1)
  })

  it("returnerer 0 for alle kategorier ved tom liste", () => {
    const fordeling = telStatusFordeling([])
    expect(fordeling.behandlet).toBe(0)
    expect(fordeling.til_behandling).toBe(0)
    expect(fordeling.mottatt).toBe(0)
  })

  it("normaliserer status med store bokstaver og mellomrom", () => {
    const saker = [
      { status: "Til Behandling" },
      { status: "til-behandling" },
    ]
    const fordeling = telStatusFordeling(saker)
    expect(fordeling.til_behandling).toBe(2)
  })
})
