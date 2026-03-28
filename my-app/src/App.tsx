/*
 * ═══════════════════════════════════════════════════════════════════════════
 * APP — src/App.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Rot-komponenten for Sørblikket. Håndterer:
 *   - Tema (lys/mørk) — lagret i localStorage og satt som data-attributt på <html>
 *   - Språk (no/en)   — lagret i localStorage, sendt som prop til alle sider
 *   - Ruting          — React Router bestemmer hvilken side som vises
 *   - Footer          — vises på alle sider under innholdet
 *
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useState } from "react"
import { Routes, Route, Navigate, NavLink } from "react-router-dom"
import Navbar from "./components/Navbar"
import Hjem from "./pages/Hjem"
import Statistikk from "./pages/Statistikk"
import Parti from "./pages/Parti"
import Representanter from "./pages/Representanter"
import Om from "./pages/Om"
import Votering from "./pages/Votering"
import Prototyper from "./pages/Prototyper"

// Stilark — ett per side for enkel oversikt og vedlikehold
import "./styles/basis.css"
import "./styles/navbar.css"
import "./styles/felleskomponenter.css"
import "./styles/hjem.css"
import "./styles/statistikk.css"
import "./styles/parti.css"
import "./styles/votering.css"
import "./styles/representanter.css"
import "./styles/om.css"

// ── Footer ────────────────────────────────────────────────────────────────────
// Vises nederst på alle sider. Inneholder navigasjon og datakilder.

function Footer({ lang }: { lang: "no" | "en" }) {
  const no = lang === "no"
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <span className="site-footer-logo">
            Sørblikket · {no ? "Agder, Sør-Norge" : "Agder, Southern Norway"}
          </span>
        </div>

        {/* Navigasjonskoblinger */}
        <nav className="site-footer-nav" aria-label={no ? "Sidelenker" : "Page links"}>
          <span className="site-footer-nav-label">{no ? "Sider" : "Pages"}</span>
          <NavLink to="/" end className="site-footer-link">{no ? "Forside" : "Home"}</NavLink>
          <NavLink to="/statistikk" className="site-footer-link">{no ? "Statistikk" : "Statistics"}</NavLink>
          <NavLink to="/votering" className="site-footer-link">{no ? "Stemmegivning" : "Voting"}</NavLink>
          <NavLink to="/representanter" className="site-footer-link">{no ? "Representanter" : "Representatives"}</NavLink>
          <NavLink to="/parti" className="site-footer-link">{no ? "Partiprogrammer" : "Party Programs"}</NavLink>
          <NavLink to="/om" className="site-footer-link">{no ? "Om Agderbenken" : "About"}</NavLink>
        </nav>

        {/* Datakilder og samarbeidspartnere */}
        <div className="site-footer-meta">
          <span className="site-footer-nav-label">{no ? "Datakilder" : "Data sources"}</span>
          <a className="site-footer-link" href="https://data.stortinget.no" target="_blank" rel="noopener noreferrer">
            {no ? "Stortingets åpne data API" : "Storting Open Data API"}
          </a>
          <a className="site-footer-link" href="https://data.stortinget.no" target="_blank" rel="noopener noreferrer">
            {no ? "Samarbeidspartner: Digin AS" : "Partner: Digin AS"}
          </a>
        </div>
      </div>

      <div className="site-footer-bottom">
        <span>© {year} Sørblikket · {no ? "Agder, Norge" : "Agder, Norway"}</span>
        <span>{no ? "Data fra Stortinget.no (åpen lisens)" : "Data from Stortinget.no (open license)"}</span>
      </div>
    </footer>
  )
}

// ── Hoved-app ─────────────────────────────────────────────────────────────────

export default function App() {

  // ── Tema-tilstand ────────────────────────────────────────────────────────────
  // Leser fra localStorage ved oppstart. Hvis ingen verdi er lagret, sjekkes
  // brukerens systempreferanse (prefers-color-scheme). Fallback er lys modus.
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const lagret = localStorage.getItem("theme")
      if (lagret === "light" || lagret === "dark") return lagret

      // Bruk systempreferanse hvis ingen localStorage-verdi finnes
      const systemMørk =
        typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-color-scheme: dark)").matches
      return systemMørk ? "dark" : "light"
    } catch {
      return "light" // Fallback hvis localStorage ikke er tilgjengelig (f.eks. privat modus)
    }
  })

  // ── Språk-tilstand ───────────────────────────────────────────────────────────
  // Norsk er standard. Språkvalget huskes i localStorage.
  const [lang, setLang] = useState<"no" | "en">(() => {
    try {
      const lagret = localStorage.getItem("lang")
      return lagret === "en" ? "en" : "no"
    } catch {
      return "no"
    }
  })

  // ── Tema-effekt ──────────────────────────────────────────────────────────────
  // Oppdaterer data-theme-attributtet på <html> hver gang temaet endres.
  // CSS bruker [data-theme="dark"] til å bytte farger.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    document.documentElement.setAttribute("data-home-theme", theme)
    try {
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme])

  // ── Språk-effekt ─────────────────────────────────────────────────────────────
  // Lagrer valgt språk i localStorage slik at det huskes ved neste besøk.
  useEffect(() => {
    try {
      localStorage.setItem("lang", lang)
    } catch {}
  }, [lang])

  return (
    <>
      {/* Fast toppnavigasjon — vises på alle sider */}
      <Navbar
        theme={theme}
        lang={lang}
        onToggleTheme={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
        onToggleLanguage={() => setLang((l) => (l === "no" ? "en" : "no"))}
      />

      {/* Ruting — URL bestemmer hvilken sidekomponent som vises */}
      <Routes>
        <Route path="/"              element={<Hjem lang={lang} />} />
        <Route path="/statistikk"   element={<Statistikk lang={lang} />} />
        <Route path="/parti"        element={<Parti lang={lang} />} />
        <Route path="/representanter" element={<Representanter lang={lang} />} />
        <Route path="/om"           element={<Om lang={lang} />} />
        <Route path="/votering"     element={<Votering lang={lang} />} />
        <Route path="/prototyper"   element={<Prototyper />} />
        {/* Ukjente URL-er sendes tilbake til forsiden */}
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>

      {/* Bunn-linje — vises på alle sider */}
      <Footer lang={lang} />
    </>
  )
}
