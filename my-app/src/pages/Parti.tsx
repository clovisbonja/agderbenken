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

const STATUS_META: Record<LofteSak["status"], {
  label: string; labelEn: string; color: string
  forklaring: string; forklaringEn: string
}> = {
  fulfilled: {
    label: "Holdt", labelEn: "Fulfilled", color: "#16a34a",
    forklaring: "Partiet har fremmet eller stemt for tiltak som oppfyller dette løftet i Stortinget.",
    forklaringEn: "The party has proposed or voted for measures fulfilling this pledge in the Storting.",
  },
  partial: {
    label: "Delvis holdt", labelEn: "Partially kept", color: "#f59e0b",
    forklaring: "Partiet har gjort fremskritt, men løftet er ikke fullt ut oppfylt. Det kan mangle finansiering, gjennomføring eller lovvedtak.",
    forklaringEn: "The party has made progress, but the pledge has not been fully fulfilled. Funding, implementation or legislation may still be missing.",
  },
  broken: {
    label: "Ikke holdt", labelEn: "Not kept", color: "#dc2626",
    forklaring: "Partiet har ikke fulgt opp dette løftet, eller har stemt mot tiltak som ville oppfylt det.",
    forklaringEn: "The party has not followed up on this pledge, or has voted against measures that would have fulfilled it.",
  },
  pending: {
    label: "Ikke behandlet", labelEn: "Pending", color: "#6b7280",
    forklaring: "Ingen Stortingssak er ennå koblet til dette løftet. Det kan være under behandling eller ikke fremmet ennå.",
    forklaringEn: "No Storting case has been linked to this pledge yet. It may be under consideration or not yet introduced.",
  },
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

          {/* Intro-banner */}
          <div className="lofter-banner">
            <div className="lofter-banner-text">
              <h2>{lang === "no" ? "Hva lovet de — og hva skjedde?" : "What did they promise — and what happened?"}</h2>
              <p>{lang === "no"
                ? "Velg et parti for å se deres valgløfter fra partiprogrammet, koblet mot faktiske saker behandlet på Stortinget. Statusene er basert på vedtak og saksbehandling i Stortingets åpne data."
                : "Select a party to see their election promises, linked to actual cases processed in the Storting. Statuses are based on decisions and case processing in Storting open data."
              }</p>
            </div>
            <div className="lofter-banner-legend">
              {(["fulfilled","partial","broken","pending"] as const).map(s => (
                <div key={s} className="lofter-legend-item">
                  <span className={`lofter-legend-dot lofter-legend-dot--${s}`} />
                  <span>{STATUS_META[s][lang === "no" ? "label" : "labelEn"]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Parti-velger */}
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
                    boxShadow: `0 0 0 2px ${safeColor}33, 0 6px 20px ${safeColor}22`,
                    background: `${safeColor}0d`,
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
            <p className="lofter-select-hint">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              {lang === "no" ? "Velg et parti ovenfor" : "Select a party above"}
            </p>
          )}

          {selectedParti && loading && (
            <div className="lofter-loading">
              <div className="lofter-loading-spinner" />
              <span>{t.loading}</span>
            </div>
          )}

          {selectedParti && !loading && error && (
            <div className="lofter-error-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p>{error}</p>
            </div>
          )}

          {selectedParti && !loading && !error && promises.length === 0 && (
            <p className="lofter-status">{t.noPromises}</p>
          )}

          {selectedParti && !loading && promises.length > 0 && (
            <div className="lofter-list">

              {/* Parti-header med scorekort */}
              {selectedPartyInfo && (() => {
                const getStatus = (p: Valglofte): LofteSak["status"] => {
                  const s = p.lofte_sak.map(x => x.status)
                  return s.includes("broken") ? "broken" : s.includes("partial") ? "partial" : s.includes("fulfilled") ? "fulfilled" : "pending"
                }
                const counts = {
                  fulfilled: filteredPromises.filter(p => getStatus(p) === "fulfilled").length,
                  partial:   filteredPromises.filter(p => getStatus(p) === "partial").length,
                  broken:    filteredPromises.filter(p => getStatus(p) === "broken").length,
                  pending:   filteredPromises.filter(p => getStatus(p) === "pending").length,
                }
                const total = filteredPromises.length
                const heldPct = total > 0 ? Math.round((counts.fulfilled + counts.partial * 0.5) / total * 100) : 0
                return (
                  <div className="lofter-scorekort">
                    <div className="lofter-scorekort-top">
                      <img src={selectedPartyInfo.logo} alt={selectedPartyInfo.navn} className="lofter-scorekort-logo" />
                      <div className="lofter-scorekort-info">
                        <strong>{selectedPartyInfo.navn}</strong>
                        <span>{lang === "no" ? `${total} valgløfter registrert` : `${total} pledges registered`}</span>
                      </div>
                      <div className="lofter-scorekort-pct">
                        <span className="lofter-score-num">{heldPct}%</span>
                        <span className="lofter-score-label">{lang === "no" ? "holdt (helt/delvis)" : "kept (full/partial)"}</span>
                      </div>
                    </div>
                    {/* Fremdriftsbar */}
                    <div className="lofter-progress-bar">
                      {counts.fulfilled > 0 && <div className="lofter-progress-seg lofter-progress-seg--fulfilled" style={{ width: `${counts.fulfilled/total*100}%` }} title={STATUS_META.fulfilled.label} />}
                      {counts.partial > 0   && <div className="lofter-progress-seg lofter-progress-seg--partial"   style={{ width: `${counts.partial/total*100}%`   }} title={STATUS_META.partial.label} />}
                      {counts.broken > 0    && <div className="lofter-progress-seg lofter-progress-seg--broken"    style={{ width: `${counts.broken/total*100}%`    }} title={STATUS_META.broken.label} />}
                      {counts.pending > 0   && <div className="lofter-progress-seg lofter-progress-seg--pending"   style={{ width: `${counts.pending/total*100}%`   }} title={STATUS_META.pending.label} />}
                    </div>
                    <div className="lofter-scorekort-pills">
                      {(["fulfilled","partial","broken","pending"] as const).map(s => counts[s] > 0 && (
                        <span key={s} className={`lofter-stat-pill lofter-stat-pill--${s}`}>
                          <span className="lofter-stat-num">{counts[s]}</span>
                          {STATUS_META[s][lang === "no" ? "label" : "labelEn"]}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Kategori-filter */}
              {promises.length > 0 && (() => {
                const allKategorier = [...new Set(promises.map(p => p.kategori).filter(Boolean))] as string[]
                return allKategorier.length > 1 ? (
                  <div className="lofte-filter-strip">
                    <button type="button" className={`lofte-filter-btn${!selectedLofteKategori ? " active" : ""}`} onClick={() => setSelectedLofteKategori(null)}>
                      {lang === "no" ? "Alle" : "All"}
                    </button>
                    {allKategorier.map(k => (
                      <button key={k} type="button" className={`lofte-filter-btn${selectedLofteKategori === k ? " active" : ""}`} onClick={() => setSelectedLofteKategori(k)}>
                        {k}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}

              {/* Løfteliste */}
              <div className="lofte-liste">
                {filteredPromises.map((promise, idx) => {
                  const statuses = promise.lofte_sak.map((s) => s.status)
                  const dominantStatus: LofteSak["status"] =
                    statuses.includes("broken")    ? "broken"    :
                    statuses.includes("partial")   ? "partial"   :
                    statuses.includes("fulfilled") ? "fulfilled" : "pending"
                  const dm = STATUS_META[dominantStatus]
                  const aktiveSaker = promise.lofte_sak.filter(c => c.status !== "pending")

                  return (
                    <div key={promise.lofte_id} className={`lofte-item lofte-item--${dominantStatus}`}>

                      {/* Topprad: nummer + kategori + periode */}
                      <div className="lofte-item-meta">
                        <span className="lofte-item-num">{idx + 1}</span>
                        {promise.kategori && (
                          <span className="lofte-kategori"
                            style={KATEGORI_COLORS[promise.kategori]
                              ? { background: KATEGORI_COLORS[promise.kategori].bg, color: KATEGORI_COLORS[promise.kategori].text, borderColor: "transparent" }
                              : {}}>
                            {promise.kategori}
                          </span>
                        )}
                        {promise.program_periode && (
                          <span className="lofte-periode">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                            </svg>
                            {promise.program_periode}
                          </span>
                        )}
                      </div>

                      {/* To-kolonne layout: løfte | resultat */}
                      <div className="lofte-tokolonne">

                        {/* Venstre: Hva de lovet */}
                        <div className="lofte-kolonne lofte-kolonne--lofte">
                          <p className="lofte-kolonne-label">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                            {lang === "no" ? "Hva de lovet" : "What they promised"}
                          </p>
                          <p className="lofte-tekst">"{promise.tekst}"</p>
                        </div>

                        {/* Høyre: Hva som skjedde */}
                        <div className={`lofte-kolonne lofte-kolonne--resultat lofte-kolonne--${dominantStatus}`}>
                          <p className="lofte-kolonne-label">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            {lang === "no" ? "Hva skjedde" : "What happened"}
                          </p>
                          <span className={`lofte-status-badge lofte-status-badge--${dominantStatus}`}>
                            {lang === "no" ? dm.label : dm.labelEn}
                          </span>
                          <p className="lofte-resultat-forklaring">
                            {STATUS_META[dominantStatus][lang === "no" ? "forklaring" : "forklaringEn"]}
                          </p>
                        </div>
                      </div>

                      {/* Koblete stortingssaker */}
                      {promise.lofte_sak.length > 0 && (
                        <div className="lofte-saker-section">
                          <p className="lofte-saker-label">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {lang === "no" ? "Saker fra Stortinget koblet til dette løftet" : "Storting cases linked to this pledge"}
                          </p>
                          <div className="lofte-saker-cards">
                            {promise.lofte_sak.map((c) => (
                              <div key={c.id} className={`lofte-sak-card lofte-sak-card--${c.status}`}>
                                <div className="lofte-sak-card-header">
                                  <span className={`lofte-sak-badge lofte-sak-badge--${c.status}`}>
                                    {STATUS_META[c.status][lang === "no" ? "label" : "labelEn"]}
                                  </span>
                                  {c.sak_dato && (
                                    <span className="lofte-sak-card-date">
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                                      </svg>
                                      {new Date(c.sak_dato).toLocaleDateString(lang === "no" ? "nb-NO" : "en-GB", { day: "numeric", month: "short", year: "numeric" })}
                                    </span>
                                  )}
                                </div>
                                <p className="lofte-sak-card-title">{c.sak_tittel ?? c.sak_id}</p>
                                {c.notat && (
                                  <p className="lofte-sak-card-note">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                    </svg>
                                    {c.notat}
                                  </p>
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

              {/* Kildeinformasjon */}
              <div className="lofter-kilde-note">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {lang === "no"
                  ? "Løftene er hentet fra partienes offisielle partiprogrammer. Kobling til Stortingssaker er basert på Stortingets åpne API og redaksjonell vurdering."
                  : "Pledges are sourced from official party programs. Links to Storting cases are based on the Storting open API and editorial assessment."
                }
              </div>
            </div>
          )}
        </section>
      )}
    </main>
    </>
  )
}
