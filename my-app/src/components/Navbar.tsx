import { NavLink } from "react-router-dom"

type NavIconName = "home" | "stats" | "representatives" | "programs" | "about"

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
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 10.2v6M12 7.4h.01" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

// Menypunkter for toppnavigasjonen.
const links = [
  { to: "/", label: "Forside", icon: "home" as NavIconName },
  { to: "/statistikk", label: "Statistikk", icon: "stats" as NavIconName },
  { to: "/representanter", label: "Representanter", icon: "representatives" as NavIconName },
  { to: "/parti", label: "Partiprogrammer", icon: "programs" as NavIconName },
  { to: "/om", label: "Om Agderbenken", icon: "about" as NavIconName },
]

type NavbarProps = {
  theme: "light" | "dark"
  lang: "no" | "en"
  onToggleTheme: () => void
  onToggleLanguage: () => void
}

export default function Navbar({ theme, lang, onToggleTheme, onToggleLanguage }: NavbarProps) {
  const text =
    lang === "no"
      ? {
          home: "Forside",
          stats: "Statistikk",
          reps: "Representanter",
          programs: "Partiprogrammer",
          about: "Om Agderbenken",
          themeLabel: "Bytt tema",
          languageLabel: "Bytt språk",
        }
      : {
          home: "Home",
          stats: "Statistics",
          reps: "Representatives",
          programs: "Party Programs",
          about: "About Agderbenken",
          themeLabel: "Toggle theme",
          languageLabel: "Toggle language",
        }

  const localizedLinks = [
    { ...links[0], label: text.home },
    { ...links[1], label: text.stats },
    { ...links[2], label: text.reps },
    { ...links[3], label: text.programs },
    { ...links[4], label: text.about },
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Klikk på logoen sender alltid brukeren til forsiden ("/"). */}
        <NavLink to="/" className="brand">
          <strong>Sørblikket</strong>
        </NavLink>

        <nav className="nav">
          {/* Navigasjonslenker:
              "to" er adressen siden åpnes på, og aktiv side får ekstra CSS-klasse. */}
          <div className="nav-links">
            {localizedLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) => `nav-btn ${isActive ? "active" : ""}`}
              >
                <span className="nav-icon" aria-hidden><NavIcon name={link.icon} /></span>
                <span>{link.label}</span>
              </NavLink>
            ))}
          </div>

          <div className="nav-tools">
            {/* Enkel toggle for light/dark mode */}
            <button
              aria-label={text.themeLabel}
              className="theme-toggle"
              onClick={onToggleTheme}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "48px",
                  height: "26px",
                  background:
                    theme === "dark"
                      ? "linear-gradient(135deg, #1e3a5f, #0d1b4b)"
                      : "linear-gradient(135deg, #f0c040, #f97316)",
                  borderRadius: "999px",
                  border:
                    theme === "dark"
                      ? "1px solid rgba(255,255,255,0.12)"
                      : "1px solid rgba(0,0,0,0.1)",
                  transition: "background 0.4s ease",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "3px",
                    left: theme === "dark" ? "23px" : "3px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background:
                      theme === "dark"
                        ? "radial-gradient(circle at 35% 35%, #c8d8f8, #7aa7e8)"
                        : "radial-gradient(circle at 35% 35%, #fff8e0, #fde68a)",
                    transition: "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}
                >
                  {theme === "dark" ? "🌙" : "☀️"}
                </div>
              </div>
            </button>

            <button
              aria-label={text.languageLabel}
              className="theme-box"
              onClick={onToggleLanguage}
              style={{ cursor: "pointer" }}
            >
              {lang === "no" ? "English" : "Norsk"}
            </button>
          </div>
        </nav>
      </div>
    </header>
  )
}
