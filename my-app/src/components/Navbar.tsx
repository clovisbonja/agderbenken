/*
 * ═══════════════════════════════════════════════════════════════════════════
 * NAVBAR — src/components/Navbar.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toppnavigasjonen. Har to moduser:
 *   - Desktop (≥768px): horisontal meny med lenker
 *   - Mobil (<768px):   hamburgermeny — trykk for å åpne/lukke en skuff
 *
 * Hamburger-skuffen lukkes automatisk når:
 *   - Brukeren klikker en lenke
 *   - Brukeren trykker Escape
 *   - Brukeren klikker bakgrunns-overlegget
 * ══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"

// ── Props ─────────────────────────────────────────────────────────────────────

type NavbarProps = {
  theme: "light" | "dark"
  lang: "no" | "en"
  onToggleTheme: () => void
  onToggleLanguage: () => void
}

// ── Menylenker ────────────────────────────────────────────────────────────────
// Rekkefølgen bestemmer visningsrekkefølgen. Labels oversettes i komponenten.

const LENKER = [
  { to: "/",                labelNo: "Forside",         labelEn: "Home" },
  { to: "/statistikk",     labelNo: "Statistikk",      labelEn: "Statistics" },
  { to: "/votering",       labelNo: "Stemmegivning",   labelEn: "Voting" },
  { to: "/representanter", labelNo: "Representanter",  labelEn: "Representatives" },
  { to: "/parti",          labelNo: "Partiprogrammer", labelEn: "Party Programs" },
  { to: "/om",             labelNo: "Om Agderbenken",  labelEn: "About" },
]

// ── SVG-ikoner ────────────────────────────────────────────────────────────────

function IkonSol() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  )
}

function IkonMåne() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="none" aria-hidden>
      <path d="M17 11.5A7 7 0 1 1 8.5 3c-.5 2.5.5 6 4.5 7.5 2 .7 3.5.5 4 1z"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function Navbar({ theme, lang, onToggleTheme, onToggleLanguage }: NavbarProps) {
  const [menuÅpen, setMenuÅpen] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const location = useLocation()

  const no = lang === "no"

  // Lukk mobilmenyen automatisk når URL-en endrer seg (bruker trykket en lenke)
  useEffect(() => {
    setMenuÅpen(false)
  }, [location.pathname])

  // Lukk mobilmenyen med Escape-tasten
  useEffect(() => {
    function håndterTast(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuÅpen(false)
    }
    document.addEventListener("keydown", håndterTast)
    return () => document.removeEventListener("keydown", håndterTast)
  }, [])

  // Skru av scroll på body mens mobilmenyen er åpen
  useEffect(() => {
    document.body.style.overflow = menuÅpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [menuÅpen])

  return (
    <>
      {/* ── Selve topplinja ─────────────────────────────────────────────── */}
      <header className="topbar" ref={navRef}>
        <div className="topbar-inner">

          {/* Logo */}
          <NavLink to="/" className="brand" onClick={() => setMenuÅpen(false)}>
            <strong>Sørblikket</strong>
            <span className="brand-divider" aria-hidden>|</span>
            <span className="brand-sub">Agder regionens øye på Stortinget</span>
          </NavLink>

          {/* Desktop-nav — skjules på mobil via CSS */}
          <nav className="nav-desktop" aria-label={no ? "Navigasjon" : "Navigation"}>
            {LENKER.map((lenke) => (
              <NavLink
                key={lenke.to}
                to={lenke.to}
                end={lenke.to === "/"}
                className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}
              >
                {no ? lenke.labelNo : lenke.labelEn}
              </NavLink>
            ))}
          </nav>

          {/* Høyresiden: verktøyknapper + hamburger */}
          <div className="nav-tools">
            <button
              className="theme-toggle"
              aria-label={no ? "Bytt tema" : "Toggle theme"}
              onClick={onToggleTheme}
            >
              {theme === "dark" ? <><IkonSol /> Dag</> : <><IkonMåne /> Natt</>}
            </button>

            <button
              className="lang-toggle"
              aria-label={no ? "Bytt språk" : "Toggle language"}
              onClick={onToggleLanguage}
            >
              {lang === "no" ? "EN" : "NO"}
            </button>

            {/* Hamburger-knapp — vises kun på mobil */}
            <button
              className={`hamburger${menuÅpen ? " hamburger--open" : ""}`}
              aria-label={menuÅpen ? "Lukk meny" : "Åpne meny"}
              aria-expanded={menuÅpen}
              aria-controls="mobil-meny"
              onClick={() => setMenuÅpen((v) => !v)}
            >
              {/* Tre streker → X ved åpning (animert i CSS) */}
              <span className="hamburger-linje" />
              <span className="hamburger-linje" />
              <span className="hamburger-linje" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobil-overlegg (backdrop) ────────────────────────────────────── */}
      {/* Klikk utenfor menyen for å lukke */}
      {menuÅpen && (
        <div
          className="mobil-backdrop"
          aria-hidden
          onClick={() => setMenuÅpen(false)}
        />
      )}

      {/* ── Mobilmeny-skuff ──────────────────────────────────────────────── */}
      <nav
        id="mobil-meny"
        className={`mobil-meny${menuÅpen ? " mobil-meny--open" : ""}`}
        aria-label={no ? "Mobilnavigasjon" : "Mobile navigation"}
        aria-hidden={!menuÅpen}
      >
        {LENKER.map((lenke) => (
          <NavLink
            key={lenke.to}
            to={lenke.to}
            end={lenke.to === "/"}
            className={({ isActive }) => `mobil-lenke${isActive ? " active" : ""}`}
          >
            {no ? lenke.labelNo : lenke.labelEn}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
