/*
 * ═══════════════════════════════════════════════════════════════════════════
 * NAVBAR — src/components/Navbar.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Toppnavigasjonen som vises på alle sider. Inneholder:
 *   - Logo/brand-lenke til forsiden
 *   - Menylenker til alle sider (aktiv side understreket)
 *   - Tema-knapp: bytt mellom Dag (lys) og Natt (mørk)
 *   - Språk-knapp: bytt mellom NO og EN
 *
 * Tema og språk styres av App.tsx via props og callbacks.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NavLink } from "react-router-dom"

// ── Ikontyper ─────────────────────────────────────────────────────────────────

type NavIconName = "home" | "stats" | "representatives" | "programs" | "about" | "voting"

// ── SVG-ikoner for menylenker ─────────────────────────────────────────────────
// Returnerer riktig ikon basert på navn. Alle ikoner er 16×16 px og arver farge.

function NavIcon({ name }: { name: NavIconName }) {
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path d="M3 10.5 12 3l9 7.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M6.5 9.5V20h11V9.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  if (name === "representatives") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <circle cx="9" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M3.5 18.5a5.5 5.5 0 0 1 11 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M14.5 18.5a4.2 4.2 0 0 1 5.7-3.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === "stats") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path d="M4 17.5h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <rect x="5" y="11" width="3.4" height="5.5" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="10.3" y="7.5" width="3.4" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
        <rect x="15.6" y="4.8" width="3.4" height="11.7" rx="1" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    )
  }
  if (name === "programs") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <rect x="4" y="4" width="16" height="16" rx="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 8h8M8 12h8M8 16h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  if (name === "voting") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden fill="none">
        <circle cx="7" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
        <circle cx="17" cy="12" r="2.5" stroke="currentColor" strokeWidth="2" />
        <path d="M7 9.5V5M17 9.5V5M7 14.5V19M17 14.5V19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }
  // Fallback: info-ikon (brukes for "Om"-siden)
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.2v6M12 7.4h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// ── Menylenker ────────────────────────────────────────────────────────────────
// Rekkefølgen bestemmer visningsrekkefølgen i menyen.
// Labels oversettes i Navbar-komponenten basert på valgt språk.

const lenker = [
  { to: "/",                label: "Forside",         icon: "home"            as NavIconName },
  { to: "/statistikk",     label: "Statistikk",      icon: "stats"           as NavIconName },
  { to: "/votering",       label: "Stemmegivning",   icon: "voting"          as NavIconName },
  { to: "/representanter", label: "Representanter",  icon: "representatives" as NavIconName },
  { to: "/parti",          label: "Partiprogrammer", icon: "programs"        as NavIconName },
  { to: "/om",             label: "Om Agderbenken",  icon: "about"           as NavIconName },
]

// ── Props ─────────────────────────────────────────────────────────────────────

type NavbarProps = {
  /** Gjeldende tema — styrer tema-ikonet og label */
  theme: "light" | "dark"
  /** Gjeldende språk — styrer alle tekststrenger */
  lang: "no" | "en"
  /** Kalles når brukeren trykker tema-knappen */
  onToggleTheme: () => void
  /** Kalles når brukeren trykker språk-knappen */
  onToggleLanguage: () => void
}

// ── Komponent ─────────────────────────────────────────────────────────────────

export default function Navbar({ theme, lang, onToggleTheme, onToggleLanguage }: NavbarProps) {

  // Alle tekststrenger på valgt språk
  const tekst =
    lang === "no"
      ? {
          home: "Forside",
          stats: "Statistikk",
          voting: "Stemmegivning",
          reps: "Representanter",
          programs: "Partiprogrammer",
          about: "Om Agderbenken",
          temaLabel: "Bytt tema",
          språkLabel: "Bytt språk",
        }
      : {
          home: "Home",
          stats: "Statistics",
          voting: "Voting",
          reps: "Representatives",
          programs: "Party Programs",
          about: "About Agderbenken",
          temaLabel: "Toggle theme",
          språkLabel: "Toggle language",
        }

  // Kobler oversatte tekster til lenkene
  const oversatteLenker = [
    { ...lenker[0], label: tekst.home },
    { ...lenker[1], label: tekst.stats },
    { ...lenker[2], label: tekst.voting },
    { ...lenker[3], label: tekst.reps },
    { ...lenker[4], label: tekst.programs },
    { ...lenker[5], label: tekst.about },
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">

        {/* Logo — lenker alltid til forsiden */}
        <NavLink to="/" className="brand">
          <strong>Sørblikket</strong>
          <span className="brand-divider" aria-hidden>|</span>
          <span className="brand-sub">Regionens øye på Stortinget</span>
        </NavLink>

        {/* Menylenker — aktiv lenke får "active"-klassen via NavLink */}
        <nav className="nav">
          <div className="nav-links">
            {oversatteLenker.map((lenke) => (
              <NavLink
                key={lenke.to}
                to={lenke.to}
                end={lenke.to === "/"}  // "end" hindrer at "/" alltid matcher alle under-URLer
                className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}
              >
                {lenke.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Verktøyknapper: tema og språk */}
        <div className="nav-tools">

          {/* Tema-knapp — viser sol i mørk modus, måne i lys modus */}
          <button
            aria-label={tekst.temaLabel}
            className="theme-toggle"
            onClick={onToggleTheme}
          >
            {theme === "dark" ? (
              <>
                <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden>
                  <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="2"/>
                  <path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                Dag
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" width="13" height="13" fill="none" aria-hidden>
                  <path d="M17 11.5A7 7 0 1 1 8.5 3c-.5 2.5.5 6 4.5 7.5 2 .7 3.5.5 4 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Natt
              </>
            )}
          </button>

          {/* Språk-knapp — viser neste tilgjengelige språk */}
          <button
            aria-label={tekst.språkLabel}
            className="theme-box"
            onClick={onToggleLanguage}
          >
            {lang === "no" ? "EN" : "NO"}
          </button>
        </div>
      </div>
    </header>
  )
}
