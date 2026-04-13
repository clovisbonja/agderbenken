/*
 * ═══════════════════════════════════════════════════════════════════════════
 * FORSIDE — src/pages/Hjem.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Forsiden for Sørblikket. Inneholder:
 *   - Hero-seksjon med nøkkeltall og CTA-knapp
 *   - Fire feature-kort (Statistikk, Representanter, Stemmegivning, Parti)
 *   - Tema-strip med lenker til statistikksiden
 *   - Om-seksjon med forklaring av prosjektnavnet
 *
 * Støtter norsk (no) og engelsk (en) via lang-prop.
 * CSS finnes i src/styles/hjem.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NavLink } from "react-router-dom"

type Lang = "no" | "en"
type HjemProps = { lang: Lang }

// Temaene som vises i hero-panelet og temastripet
const TEMAER = [
  {
    key: "klima",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    ),
    no: "Klima", en: "Climate",
  },
  {
    key: "helse",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      </svg>
    ),
    no: "Helse", en: "Health",
  },
  {
    key: "utdanning",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
    no: "Utdanning", en: "Education",
  },
  {
    key: "økonomi",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    no: "Økonomi", en: "Economy",
  },
  {
    key: "samferdsel",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="7" width="18" height="9" rx="2"/><circle cx="8" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/>
      </svg>
    ),
    no: "Samferdsel", en: "Transport",
  },
  {
    key: "justis",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 22V2M2 12h20M5 7l7-5 7 5M5 17l7 5 7-5"/>
      </svg>
    ),
    no: "Justis", en: "Justice",
  },
  {
    key: "distrikt",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 3l4 8 5-5 5 15H2L8 3z"/>
      </svg>
    ),
    no: "Distrikt", en: "Districts",
  },
]

export default function Hjem({ lang }: HjemProps) {
  const no = lang === "no"

  return (
    <main className="fp-page">

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section className="fp-hero">
        <div className="fp-hero-left">
          <p className="fp-hero-eyebrow">
            {no ? "Et prosjekt av Fædrelandsvennen og Digin" : "A project by Fædrelandsvennen and Digin"}
          </p>
          <h1 className="fp-hero-heading">Sørblikket</h1>
          <p className="fp-hero-tagline">
            {no ? "Regionens øye på Stortinget" : "The region's eye on the Storting"}
          </p>
          <p className="fp-hero-lead">
            {no
              ? "Vi følger Agderbenkens representanter på Stortinget — deres saker, stemmer og valgløfter — og gjør den politiske hverdagen lettere å forstå for alle."
              : "We track Agder's representatives in the Storting — their cases, votes and election promises — making parliamentary work easier to understand for everyone."}
          </p>

          <div className="fp-hero-meta">
            <div className="fp-hero-meta-item">
              <strong>490+</strong>
              <span>{no ? "behandlede saker" : "processed cases"}</span>
            </div>
            <div className="fp-hero-meta-divider" aria-hidden />
            <div className="fp-hero-meta-item">
              <strong>10</strong>
              <span>{no ? "representanter" : "representatives"}</span>
            </div>
            <div className="fp-hero-meta-divider" aria-hidden />
            <div className="fp-hero-meta-item">
              <strong>7</strong>
              <span>{no ? "temaområder" : "topic areas"}</span>
            </div>
            <div className="fp-hero-meta-divider" aria-hidden />
            <div className="fp-hero-meta-item">
              <strong>2025–29</strong>
              <span>{no ? "stortingssesjon" : "parliamentary term"}</span>
            </div>
          </div>

          <NavLink to="/statistikk" className="fp-hero-cta">
            {no ? "Utforsk statistikk" : "Explore statistics"}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </NavLink>
        </div>

      </section>

      {/* ══ FEATURE CARDS ════════════════════════════════════════════ */}
      <section className="fp-features">
        <NavLink to="/statistikk" className="fp-feature fp-feature--primary">
          <div className="fp-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M4 17.5h16"/><rect x="5" y="11" width="3.4" height="5.5" rx="1"/><rect x="10.3" y="7.5" width="3.4" height="9" rx="1"/><rect x="15.6" y="4.8" width="3.4" height="11.7" rx="1"/>
            </svg>
          </div>
          <div className="fp-feature-body">
            <p className="fp-feature-label">01</p>
            <h2 className="fp-feature-title">{no ? "Statistikk" : "Statistics"}</h2>
            <p className="fp-feature-desc">
              {no
                ? "Nøkkeltall, temafordeling og aktivitetstrender for Agderbenkens saker på Stortinget."
                : "Key numbers, theme distribution and activity trends for Agder's cases in the Storting."}
            </p>
          </div>
          <span className="fp-feature-arrow">
            {no ? "Åpne" : "Open"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </NavLink>

        <NavLink to="/representanter" className="fp-feature">
          <div className="fp-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="9" cy="8" r="3"/><path d="M3.5 18.5a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9" r="2.2"/><path d="M14.5 18.5a4.2 4.2 0 0 1 5.7-3.9"/>
            </svg>
          </div>
          <div className="fp-feature-body">
            <p className="fp-feature-label">02</p>
            <h2 className="fp-feature-title">{no ? "Representanter" : "Representatives"}</h2>
            <p className="fp-feature-desc">
              {no
                ? "Møt Agderbenkens 9 stortingsrepresentanter og se hvem de representerer."
                : "Meet Agder's 9 MPs and see who they represent."}
            </p>
          </div>
          <span className="fp-feature-arrow">
            {no ? "Se alle" : "View all"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </NavLink>

        <NavLink to="/votering" className="fp-feature">
          <div className="fp-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
          </div>
          <div className="fp-feature-body">
            <p className="fp-feature-label">03</p>
            <h2 className="fp-feature-title">{no ? "Stemmegivning" : "Voting"}</h2>
            <p className="fp-feature-desc">
              {no
                ? "Se hva det ble stemt over og hvem som stemte for eller mot — votering for votering."
                : "See what was voted on and who voted for or against — vote by vote."}
            </p>
          </div>
          <span className="fp-feature-arrow">
            {no ? "Utforsk" : "Explore"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </NavLink>

        <NavLink to="/parti" className="fp-feature">
          <div className="fp-feature-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div className="fp-feature-body">
            <p className="fp-feature-label">04</p>
            <h2 className="fp-feature-title">{no ? "Partiprogrammer" : "Party Programs"}</h2>
            <p className="fp-feature-desc">
              {no
                ? "Hva lovet partiene velgerne? Programmer og valgløfter opp mot faktisk handling."
                : "What did parties promise voters? Programs and pledges vs. actual action."}
            </p>
          </div>
          <span className="fp-feature-arrow">
            {no ? "Les mer" : "Read more"}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </NavLink>
      </section>

      {/* ══ TOPICS STRIP ═════════════════════════════════════════════ */}
      <section className="fp-topics-section">
        <p className="fp-topics-label">{no ? "Temaer vi dekker" : "Topics we cover"}</p>
        <div className="fp-topics-row">
          {TEMAER.map((th) => (
            <NavLink
              key={th.key}
              to={`/statistikk`}
              className="fp-topic-pill"
            >
              <span className="fp-topic-pill-icon">{th.icon}</span>
              {no ? th.no : th.en}
            </NavLink>
          ))}
        </div>
      </section>

{/* ══ ABOUT ════════════════════════════════════════════════════ */}
      <section className="fp-about">
        <div className="fp-about-intro">
          <p className="fp-about-kicker">{no ? "Om prosjektet" : "About the project"}</p>
          <h2 className="fp-about-heading">{no ? "Hva er Sørblikket?" : "What is Sørblikket?"}</h2>
          <p className="fp-about-lead">
            {no
              ? "Sørblikket er et journalistisk verktøy som gjør Stortingets arbeid mer tilgjengelig for innbyggerne i Agder."
              : "Sørblikket is a journalistic tool that makes the Storting's work more accessible to residents of Agder."}
          </p>
        </div>
        <div className="fp-about-grid">
          <article className="fp-about-item">
            <strong>SØR</strong>
            <p>
              {no
                ? "Viser til Agder og Sørlandet, regionen løsningen representerer."
                : "Refers to Agder and Southern Norway, the region this solution represents."}
            </p>
          </article>
          <article className="fp-about-item">
            <strong>BLIKKET</strong>
            <p>
              {no
                ? "Handler om innsyn, oppmerksomhet og at innbyggerne følger politikken nøye."
                : "Means scrutiny and attention, so citizens can follow politics closely."}
            </p>
          </article>
          <article className="fp-about-item">
            <strong>AGDERBENKEN</strong>
            <p>
              {no
                ? "Representantene valgt fra Agder. Sørblikket gjør arbeidet deres mer åpent og lett å følge."
                : "MPs elected from Agder. Sørblikket makes their work more open and easy to follow."}
            </p>
          </article>
        </div>
      </section>

    </main>
  )
}
