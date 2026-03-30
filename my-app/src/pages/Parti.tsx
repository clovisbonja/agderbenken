/*
 * ═══════════════════════════════════════════════════════════════════════════
 * PARTI — src/pages/Parti.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Viser partier representert på Agderbenken, med partiprogrammer og
 * valgløfter. Bruker Supabase for å laste valgløftedata.
 *
 * Faner per parti:
 *   - "Partiprogram" — lenke til partiets offisielle program
 *   - "Valgløfter"  — løfter fra Supabase med oppfyllelsesstatus
 *
 * Konfigurasjon:
 *   - Partidata (navn, farge, logo, lenker) er i src/config/partier.ts
 *   - Supabase-tilkobling er i src/lib/supabase.ts
 *
 * Støtter norsk (no) og engelsk (en) via lang-prop.
 * CSS finnes i src/styles/parti.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "../lib/supabase"
import { AGDER_PARTIER } from "../config/partier"

// Partidata importeres fra src/config/partier.ts — legg til/fjern partier der.

type Lang = "no" | "en"

// ── Supabase-typer ────────────────────────────────────────────────────────────

type LofteSak = {
  id: string
  lofte_id: string
  sak_id: string
  sak_tittel: string | null
  sak_dato: string | null
  notat: string | null
  status: "pending" | "fulfilled" | "broken" | "partial"
}

type Valglofte = {
  lofte_id: string
  tekst: string
  kategori: string | null
  program_periode: string
  lofte_sak: LofteSak[]
}

// ── Hjelpere ──────────────────────────────────────────────────────────────────

const KATEGORI_COLORS: Record<string, { bg: string; text: string }> = {
  Klima:       { bg: "rgba(22,163,74,.12)",  text: "#16a34a" },
  Helse:       { bg: "rgba(219,39,119,.1)",  text: "#db2777" },
  Utdanning:   { bg: "rgba(37,99,235,.1)",   text: "#2563eb" },
  Økonomi:     { bg: "rgba(217,119,6,.12)",  text: "#b45309" },
  Samferdsel:  { bg: "rgba(124,58,237,.1)",  text: "#7c3aed" },
  Justis:      { bg: "rgba(55,65,81,.1)",    text: "#374151" },
  Familie:     { bg: "rgba(236,72,153,.1)",  text: "#be185d" },
  Bistand:     { bg: "rgba(5,150,105,.12)",  text: "#059669" },
  Distrikt:    { bg: "rgba(120,83,10,.1)",   text: "#92400e" },
  Landbruk:    { bg: "rgba(101,163,13,.12)", text: "#4d7c0f" },
  Innvandring: { bg: "rgba(55,65,81,.1)",    text: "#374151" },
  Sosial:      { bg: "rgba(14,165,233,.1)",  text: "#0369a1" },
  Næring:      { bg: "rgba(245,158,11,.1)",  text: "#b45309" },
}

const STATUS_META: Record<LofteSak["status"], { label: string; labelEn: string; color: string }> = {
  pending:   { label: "Ikke behandlet", labelEn: "Pending",    color: "#6b7280" },
  fulfilled: { label: "Holdt",          labelEn: "Fulfilled",  color: "#16a34a" },
  broken:    { label: "Ikke holdt",     labelEn: "Not kept",   color: "#374151" },
  partial:   { label: "Delvis holdt",   labelEn: "Partial",    color: "#f59e0b" },
}

// ── Komponent ─────────────────────────────────────────────────────────────────

type PartiProps = { lang: Lang }

export default function Parti({ lang }: PartiProps) {
  const t =
    lang === "no"
      ? {
          title: "Partiprogrammer",
          subtitle: "Oversikt over partienes programmer med direkte lenke til originalkildene.",
          open: "Åpne program",
          read: "Les partiprogram",
          tabPrograms: "Partiprogrammer",
          tabPromises: "Løfter vs. handling",
          promisesIntro: "Velg et parti for å se hva de lovet i sitt program — og om de har fulgt opp.",
          selectParty: "Velg parti",
          loading: "Laster løfter…",
          noPromises: "Ingen løfter registrert for dette partiet ennå.",
          linkedCases: "Relaterte saker",
          noCases: "Ingen saker koblet ennå.",
          status: "Status",
          note: "Notat",
          caseLink: "Se sak",
        }
      : {
          title: "Party Programs",
          subtitle: "Overview of party programs with direct links to the original sources.",
          open: "Open program",
          read: "Read party program",
          tabPrograms: "Party Programs",
          tabPromises: "Promises vs. action",
          promisesIntro: "Select a party to see what they promised — and whether they followed through.",
          selectParty: "Select party",
          loading: "Loading promises…",
          noPromises: "No promises registered for this party yet.",
          linkedCases: "Related cases",
          noCases: "No cases linked yet.",
          status: "Status",
          note: "Note",
          caseLink: "View case",
        }

  const [tab, setTab] = useState<"programs" | "promises">("programs")
  const [selectedParti, setSelectedParti] = useState<string | null>(null)
  const [promises, setPromises] = useState<Valglofte[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLofteKategori, setSelectedLofteKategori] = useState<string | null>(null)

  useEffect(() => {
    if (tab !== "promises" || !selectedParti) return
    let cancelled = false
    setPromises([])
    setLoading(true)
    setError(null)

    async function load() {
      // Supabase er ikke konfigurert — vis tydelig melding i stedet for å krasje
      if (!supabase) {
        if (!cancelled) {
          setError("Valgløfter krever Supabase-konfig. Se .env.example for oppsett.")
          setLoading(false)
        }
        return
      }

      const { data, error: err } = await supabase
        .from("valgløfte")
        .select("*, lofte_sak(*)")
        .eq("parti", selectedParti)
        .order("created_at", { ascending: true })

      if (!cancelled) {
        if (err) setError(err.message)
        else setPromises((data ?? []) as Valglofte[])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [tab, selectedParti])

  const selectedPartyInfo = AGDER_PARTIER.find((p) => p.forkortelse === selectedParti)
  const filteredPromises = selectedLofteKategori
    ? promises.filter(p => p.kategori === selectedLofteKategori)
    : promises

  return (
    <>
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">Stortinget · Agder</p>
          <h1 className="ed-page-hero-heading">{lang === "no" ? "Partiprogrammer" : "Party Programs"}</h1>
          <p className="ed-page-hero-lead">{lang === "no" ? "Hva lovet partiene velgerne? Programmer og valgløfter i én oversikt." : "What did parties promise voters? Programs and pledges in one overview."}</p>
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>
    <main className="page parti-page">
      {/* Tab-navigasjon — sentrert og tydelig */}
      <div className="parti-tab-wrapper">
        <div className="parti-tabs">
          <button
            type="button"
            className={`parti-tab${tab === "programs" ? " parti-tab-active" : ""}`}
            onClick={() => setTab("programs")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>
            </svg>
            {t.tabPrograms}
          </button>
          <button
            type="button"
            className={`parti-tab${tab === "promises" ? " parti-tab-active" : ""}`}
            onClick={() => setTab("promises")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            {t.tabPromises}
          </button>
        </div>
        <p className="parti-tab-hint">
          {tab === "programs"
            ? (lang === "no" ? "Direktelenker til partienes offisielle programmer" : "Direct links to official party programs")
            : (lang === "no" ? "Sammenlign valgløfter med faktiske handlinger" : "Compare election promises with actual actions")}
        </p>
      </div>

      {/* Tab: Partiprogrammer */}
      {tab === "programs" && (
        <section className="parti-grid">
          {AGDER_PARTIER.map((parti) => (
            <article
              key={parti.navn}
              className="parti-card"
              style={{ "--party-color": parti.farge } as CSSProperties}
            >
              <a
                className="parti-link"
                href={parti.partiprogram ?? parti.nettside}
                target="_blank"
                rel="noopener noreferrer"
              >
                <header className="parti-card-head">
                  <span className="parti-pill">{parti.forkortelse}</span>
                  <span className="parti-open">{t.open}</span>
                </header>
                <div className="parti-logo-wrap">
                  <img src={parti.logo} alt={parti.navn} className="parti-logo" />
                </div>
                <footer className="parti-card-foot">
                  <strong>{parti.navn}</strong>
                  <small>{t.read}</small>
                </footer>
              </a>
            </article>
          ))}
        </section>
      )}

      {/* Tab: Løfter vs. handling */}
      {tab === "promises" && (
        <section className="lofter-section">
          <p className="lofter-intro">{t.promisesIntro}</p>

          {/* Parti-velger — forbedret grid */}
          <div className="lofter-party-grid">
            {AGDER_PARTIER.map((p) => {
              const isActive = selectedParti === p.forkortelse
              const safeColor = p.farge === "#ffffff" ? "#9ca3af" : p.farge
              return (
                <button
                  key={p.forkortelse}
                  type="button"
                  className={`lofter-party-card${isActive ? " lofter-party-card--active" : ""}`}
                  style={isActive ? {
                    borderColor: safeColor,
                    boxShadow: `0 0 0 2px ${safeColor}33, 0 4px 16px ${safeColor}22`,
                    background: `${safeColor}0f`,
                  } : {}}
                  onClick={() => setSelectedParti(p.forkortelse)}
                >
                  <div className="lofter-party-card-logo">
                    <img src={p.logo} alt={p.forkortelse} />
                  </div>
                  <div className="lofter-party-card-info">
                    <strong>{p.forkortelse}</strong>
                    <span>{p.navn}</span>
                  </div>
                  {isActive && (
                    <div className="lofter-party-card-check" style={{ color: safeColor }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <path d="M20 6 9 17l-5-5"/>
                      </svg>
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {!selectedParti && (
            <p className="lofter-select-hint">{t.selectParty} ↑</p>
          )}

          {selectedParti && loading && (
            <p className="lofter-status">{t.loading}</p>
          )}

          {selectedParti && !loading && error && (
            <p className="lofter-status lofter-error">{error}</p>
          )}

          {selectedParti && !loading && !error && promises.length === 0 && (
            <p className="lofter-status">{t.noPromises}</p>
          )}

          {selectedParti && !loading && promises.length > 0 && (
            <div className="lofter-list">
              {selectedPartyInfo && (
                <div className="lofter-party-heading">
                  <img src={selectedPartyInfo.logo} alt={selectedPartyInfo.navn} className="lofter-heading-logo" />
                  <div className="lofter-heading-text">
                    <strong>{selectedPartyInfo.navn}</strong>
                    <span className="lofter-count">{filteredPromises.length} {lang === "no" ? "valgløfter registrert" : "pledges registered"}</span>
                  </div>
                  <div className="lofter-heading-stats">
                    {(["fulfilled","partial","broken","pending"] as const).map(s => {
                      const n = filteredPromises.filter(p => {
                        const dom = p.lofte_sak.map(x=>x.status).includes("broken") ? "broken"
                          : p.lofte_sak.map(x=>x.status).includes("partial") ? "partial"
                          : p.lofte_sak.map(x=>x.status).includes("fulfilled") ? "fulfilled" : "pending"
                        return dom === s
                      }).length
                      if (!n) return null
                      return (
                        <span key={s} className={`lofter-stat-pill lofter-stat-pill--${s}`}>
                          {n} {STATUS_META[s][lang === "no" ? "label" : "labelEn"]}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Category filter */}
              {promises.length > 0 && (() => {
                const allKategorier = [...new Set(promises.map(p => p.kategori).filter(Boolean))] as string[]
                return allKategorier.length > 1 ? (
                  <div className="lofte-filter-strip">
                    <button
                      type="button"
                      className={`lofte-filter-btn${!selectedLofteKategori ? " active" : ""}`}
                      onClick={() => setSelectedLofteKategori(null)}
                    >
                      Alle
                    </button>
                    {allKategorier.map(k => (
                      <button
                        key={k}
                        type="button"
                        className={`lofte-filter-btn${selectedLofteKategori === k ? " active" : ""}`}
                        onClick={() => setSelectedLofteKategori(k)}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}

              {filteredPromises.map((promise) => {
                const statuses = promise.lofte_sak.map((s) => s.status)
                const dominantStatus: LofteSak["status"] =
                  statuses.includes("broken")    ? "broken"    :
                  statuses.includes("partial")   ? "partial"   :
                  statuses.includes("fulfilled") ? "fulfilled" : "pending"
                const dm = STATUS_META[dominantStatus]
                const matchedCases = promise.lofte_sak.filter(c => c.status !== "pending")
                const hasMatches = matchedCases.length > 0

                return (
                  <div key={promise.lofte_id} className={`lofte-item lofte-item--${dominantStatus}`}>
                    <div className="lofte-item-header">
                      <div className="lofte-item-status">
                        <span className={`lofte-status-badge lofte-status-badge--${dominantStatus}`}>
                          {lang === "no" ? dm.label : dm.labelEn}
                        </span>
                        {promise.kategori && (
                          <span className="lofte-kategori">{promise.kategori}</span>
                        )}
                      </div>
                      {hasMatches && (
                        <span className="lofte-matched-indicator">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                          </svg>
                          {matchedCases.length} {lang === "no" ? "kobling" : "link"}{matchedCases.length !== 1 ? (lang === "no" ? "er" : "s") : ""}
                        </span>
                      )}
                    </div>
                    <p className="lofte-tekst">{promise.tekst}</p>

                    {promise.lofte_sak.length > 0 && (
                      <div className="lofte-saker-section">
                        <p className="lofte-saker-label">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                          </svg>
                          {lang === "no" ? "Saker som svarer på dette løftet" : "Cases responding to this pledge"}
                        </p>
                        <div className="lofte-saker-cards">
                          {promise.lofte_sak.map((c) => (
                            <div key={c.id} className={`lofte-sak-card lofte-sak-card--${c.status}`}>
                              <div className="lofte-sak-card-header">
                                <span className={`lofte-sak-badge lofte-sak-badge--${c.status}`}>
                                  {STATUS_META[c.status][lang === "no" ? "label" : "labelEn"]}
                                </span>
                                {c.sak_dato && (
                                  <span className="lofte-sak-card-date">{c.sak_dato.slice(0, 10)}</span>
                                )}
                              </div>
                              <p className="lofte-sak-card-title">{c.sak_tittel ?? c.sak_id}</p>
                              {c.notat && (
                                <p className="lofte-sak-card-note">{c.notat}</p>
                              )}
                              <a
                                className="lofte-sak-card-link"
                                href={`https://www.stortinget.no/no/Saker-og-publikasjoner/Saker/Sak/?p=${c.sak_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {lang === "no" ? "Se sak hos Stortinget" : "View case at Stortinget"}
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                                </svg>
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
    </main>
    </>
  )
}
