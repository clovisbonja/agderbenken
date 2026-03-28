/*
 * ═══════════════════════════════════════════════════════════════════════════
 * STATISTIKK — src/pages/Statistikk.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Wrapper-siden for statistikk-dashboardet. Har to ansvarsområder:
 *
 *   1. HERO-SEKSJONEN — mørk overskriftsbanner med:
 *        - Tittel og ingress
 *        - Live-tall (totalt, behandlet, aktive) fra Stortingets API
 *        - "Slik bruker du siden"-knapp som åpner howto-overlay
 *
 *   2. DASHBOARD — rendrer <StatistikkDashboard> som inneholder
 *        signal-dashboardet med temaer, KPI-kort, grafer osv.
 *
 * Hero-seksjonen henter data selv (enkelt API-kall) for å fylle chips
 * raskt. StatistikkDashboard gjør sin egen, mer detaljerte datafetching.
 *
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react"
import StatistikkDashboard from "./StatistikkDashboard"

type StatistikkProps = {
  lang: "no" | "en"
}

// ── Hjelpefunksjon: beregn gjeldende sesjon-ID ────────────────────────────────
// Stortingets sesjon starter i oktober (måned 9 i JavaScript, 0-indeksert).
// Hvis vi er i oktober–desember, er sesjons-start dette året.
// Hvis vi er i januar–september, er sesjons-start forrige år.
// Eksempel: mars 2026 → "2025-2026"

function sesjonIdNå(): string {
  const nå = new Date()
  const start = nå.getMonth() >= 9 ? nå.getFullYear() : nå.getFullYear() - 1
  return `${start}-${start + 1}`
}

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function Statistikk({ lang }: StatistikkProps) {

  // Raske nøkkeltall som vises i hero-banneret
  const [totaltAntall, setTotaltAntall] = useState<number | null>(null)
  const [behandlet, setBehandlet]       = useState<number | null>(null)
  const [aktive, setAktive]             = useState<number | null>(null)
  const [sesjonId, setSesjonId]         = useState("")
  const [oppdatert, setOppdatert]       = useState<Date | null>(null)

  useEffect(() => {
    const sid = sesjonIdNå()
    setSesjonId(sid)

    // Hent saker fra Stortingets XML-API og tell statuser
    async function hentStatistikk() {
      try {
        const res = await fetch(`https://data.stortinget.no/eksport/saker?sesjonid=${sid}`)
        const tekst = await res.text()

        // Parse XML-svaret
        const parser = new DOMParser()
        const doc = parser.parseFromString(tekst, "application/xml")
        const saker = Array.from(doc.querySelectorAll("sak"))

        // Tell saker per status
        const antallBehandlet = saker.filter(s =>
          s.querySelector("status")?.textContent?.trim().toLowerCase() === "behandlet"
        ).length

        const antallAktive = saker.filter(s => {
          const v = s.querySelector("status")?.textContent
            ?.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
          return v === "til_behandling"
        }).length

        setTotaltAntall(saker.length)
        setBehandlet(antallBehandlet)
        setAktive(antallAktive)
        setOppdatert(new Date())
      } catch (err) {
        console.error("[Statistikk] Feil ved henting av hero-stats:", err)
      }
    }

    hentStatistikk()

    // Oppdater hvert 5. minutt så tallene holder seg ferske
    const intervall = setInterval(hentStatistikk, 5 * 60 * 1000)
    return () => clearInterval(intervall)
  }, [])

  const no = lang === "no"

  return (
    <>
      {/* ── Hero-banner ──────────────────────────────────────────────────────── */}
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">Stortinget · Agder</p>
          <h1 className="ed-page-hero-heading">{no ? "Statistikk" : "Statistics"}</h1>
          <p className="ed-page-hero-lead">
            {no
              ? "Nøkkeltall, temafordeling og aktivitetstrender for Agderbenkens saker på Stortinget."
              : "Key figures, theme distribution and activity trends for Agder's cases in the Storting."}
          </p>

          {/* Chips: live-tall og "slik bruker du siden"-knapp */}
          <div className="ed-page-hero-meta-row">
            {totaltAntall !== null && (
              <span className="ed-page-hero-chip">
                {totaltAntall} {no ? "saker" : "cases"}
              </span>
            )}
            {sesjonId && (
              <span className="ed-page-hero-chip">
                {no ? "Sesjon" : "Session"}: {sesjonId}
              </span>
            )}
            {oppdatert && (
              <span className="ed-page-hero-chip">
                {no ? "Sist oppdatert" : "Last updated"}: {oppdatert.toLocaleTimeString(no ? "no-NO" : "en-GB")}
              </span>
            )}

            {/* Knapp som åpner howto-overlay i StatistikkDashboard via custom event */}
            <button
              type="button"
              className="ed-page-hero-howto-btn"
              onClick={() => window.dispatchEvent(new CustomEvent("open-howto"))}
              aria-label={no ? "Slik bruker du siden" : "How to use this page"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              {no ? "Slik bruker du siden" : "How to use"}
            </button>
          </div>
        </div>

        {/* Nøkkeltall-kolonne til høyre i hero */}
        <div className="ed-page-hero-stats-col">
          {totaltAntall !== null && (
            <>
              <div className="ed-page-hero-stat">
                <strong>{totaltAntall}</strong>
                <span>{no ? "Saker" : "Cases"}</span>
              </div>
              <div className="ed-page-hero-stat">
                <strong>{behandlet ?? "—"}</strong>
                <span>{no ? "Behandlet" : "Processed"}</span>
              </div>
              <div className="ed-page-hero-stat">
                <strong>{aktive ?? "—"}</strong>
                <span>{no ? "Aktive" : "Active"}</span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Hoveddashboard ───────────────────────────────────────────────────── */}
      {/* StatistikkDashboard henter sin egen data og viser temaer, grafer osv. */}
      <StatistikkDashboard lang={lang} />
    </>
  )
}
