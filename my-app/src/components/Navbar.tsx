import { NavLink } from "react-router-dom"
import { useEffect, useState } from "react"

const links = [
  { to: "/", label: "Forside" },
  { to: "/parti", label: "Parti" },
  { to: "/representanter", label: "Representanter" },
  { to: "/om", label: "Om Agderbenken" },
]

export default function Navbar() {
  const [theme, setTheme] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("theme")
      if (stored) return stored
      if (
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      ) {
        return "dark"
      }
    } catch {}
    return "light"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    try {
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme])

  function toggleTheme() {
    setTheme((t) => (t === "light" ? "dark" : "light"))
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="brand">
          Agderbenken
        </NavLink>

        <nav className="nav">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `nav-btn ${isActive ? "active" : ""}`
              }
            >
              {l.label}
            </NavLink>
          ))}
              <button
                aria-label="Bytt tema"
                className="theme-toggle"
                onClick={toggleTheme}
              >
                <span className="theme-box">{theme === "light" ? "Light mode" : "Dark mode"}</span>
              </button>
        </nav>
      </div>
    </header>
  )
}
