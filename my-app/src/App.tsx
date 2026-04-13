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
import { useNettStatus } from "./hooks/useNettStatus"
import Hjem from "./pages/Hjem"
import Statistikk from "./pages/Statistikk"
import Parti from "./pages/Parti"
import Representanter from "./pages/Representanter"
import Om from "./pages/Om"
import Votering from "./pages/Votering"

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

// ── Offline-banner ────────────────────────────────────────────────────────────
function OfflineBanner({ lang }: { lang: "no" | "en" }) {
  const erOnline = useNettStatus()
  const [visKomTilbake, setVisKomTilbake] = useState(false)

  useEffect(() => {
    if (erOnline) {
      // Vis kort "tilkoblet igjen"-melding etter at nett kom tilbake
      setVisKomTilbake(true)
      const t = setTimeout(() => setVisKomTilbake(false), 3000)
      return () => clearTimeout(t)
    }
  }, [erOnline])

  if (erOnline && !visKomTilbake) return null

  const no = lang === "no"

  return (
    <div className={`offline-banner ${erOnline ? "offline-banner--online" : "offline-banner--offline"}`} role="status">
      {erOnline ? (
        <>
          <span className="offline-banner-dot offline-banner-dot--green" />
          {no ? "Tilkoblet igjen" : "Back online"}
        </>
      ) : (
        <>
          <span className="offline-banner-dot offline-banner-dot--red" />
          {no
            ? "Ingen internettilkobling — data kan være utdatert"
            : "No internet connection — data may be outdated"}
        </>
      )}
    </div>
  )
}

export default function App() {

  // ── Tema-tilstand ────────────────────────────────────────────────────────────
  // null  = følg systemet (CSS @media tar seg av det — fungerer i Brave og alle andre)
  // "dark"  = manuelt satt mørkt
  // "light" = manuelt satt lyst
  const [themeOverride, setThemeOverride] = useState<"light" | "dark" | null>(() => {
    try {
      const lagret = localStorage.getItem("theme-override")
      if (lagret === "light" || lagret === "dark") return lagret
    } catch {}
    return null // ingen manuell override → CSS følger systemet
  })


  // ── Språk-tilstand ───────────────────────────────────────────────────────────
  // Norsk er standard. Språkvalget huskes i localStorage.
  const [lang, setLang] = useState<"no" | "en">(() => {
    try {
      // Manuelt valg overstyrer alt
      const lagret = localStorage.getItem("lang-override")
      if (lagret === "en" || lagret === "no") return lagret
    } catch {}

    // Ingen manuell override → bruk maskinens språkinnstilling
    const browserSpråk = navigator.languages ?? [navigator.language]
    const erNorsk = browserSpråk.some((l) =>
      l.toLowerCase().startsWith("nb") ||
      l.toLowerCase().startsWith("nn") ||
      l.toLowerCase().startsWith("no")
    )
    return erNorsk ? "no" : "en"
  })

  // ── Tema-effekt: oppdater DOM ─────────────────────────────────────────────────
  // Null (system-modus): fjern attributtet → CSS @media tar over (Brave-safe)
  // "dark"/"light": sett attributtet eksplisitt → overstyrer CSS @media
  useEffect(() => {
    const html = document.documentElement
    if (themeOverride === null) {
      // Ingen manuell override — la CSS @media (prefers-color-scheme) styre
      html.removeAttribute("data-theme")
      // data-home-theme: sett basert på faktisk system for å holde spesifikke stiler riktige
      const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
      html.setAttribute("data-home-theme", isDark ? "dark" : "light")
    } else {
      html.setAttribute("data-theme", themeOverride)
      html.setAttribute("data-home-theme", themeOverride)
    }
    try {
      if (themeOverride) {
        localStorage.setItem("theme-override", themeOverride)
      } else {
        localStorage.removeItem("theme-override")
      }
      localStorage.removeItem("theme")        // rydd opp gammelt nøkkelnavn
      localStorage.removeItem("theme-manuelt") // rydd opp gammelt flagg
    } catch {}
  }, [themeOverride])

  // ── data-home-theme synkronisering ───────────────────────────────────────────
  // matchMedia-event (fungerer i Chrome/Safari/Firefox) + focus-fallback for Brave
  useEffect(() => {
    if (themeOverride !== null) return // ikke treng lytter ved manuell override

    const syncHomeTheme = () => {
      const isDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches
      document.documentElement.setAttribute("data-home-theme", isDark ? "dark" : "light")
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    mq.addEventListener("change", syncHomeTheme)
    document.addEventListener("visibilitychange", syncHomeTheme)
    window.addEventListener("focus", syncHomeTheme)

    return () => {
      mq.removeEventListener("change", syncHomeTheme)
      document.removeEventListener("visibilitychange", syncHomeTheme)
      window.removeEventListener("focus", syncHomeTheme)
    }
  }, [themeOverride])

  // ── Språk-effekt ─────────────────────────────────────────────────────────────
  // Lagrer manuelt valgt språk i localStorage slik at det huskes ved neste besøk.
  useEffect(() => {
    try {
      localStorage.setItem("lang-override", lang)
    } catch {}
  }, [lang])

  return (
    <>
      {/* Offline-tilbakemelding */}
      <OfflineBanner lang={lang} />

      {/* Fast toppnavigasjon — vises på alle sider */}
      <Navbar
        themeOverride={themeOverride}
        lang={lang}
        onSetTheme={(t) => setThemeOverride(t)}
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
{/* Ukjente URL-er sendes tilbake til forsiden */}
        <Route path="*"             element={<Navigate to="/" replace />} />
      </Routes>

      {/* Bunn-linje — vises på alle sider */}
      <Footer lang={lang} />
    </>
  )
}
