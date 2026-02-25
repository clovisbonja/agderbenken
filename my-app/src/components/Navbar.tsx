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
                style={{ background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}
              >
                <div style={{
                  position: "relative",
                  width: "48px",
                  height: "26px",
                  background: theme === "dark"
                    ? "linear-gradient(135deg, #1e3a5f, #0d1b4b)"
                    : "linear-gradient(135deg, #f0c040, #f97316)",
                  borderRadius: "999px",
                  border: theme === "dark" ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.1)",
                  transition: "background 0.4s ease",
                }}>
                  <div style={{
                    position: "absolute",
                    top: "3px",
                    left: theme === "dark" ? "23px" : "3px",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    background: theme === "dark"
                      ? "radial-gradient(circle at 35% 35%, #c8d8f8, #7aa7e8)"
                      : "radial-gradient(circle at 35% 35%, #fff8e0, #fde68a)",
                    transition: "left 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                  }}>
                    {theme === "dark" ? "🌙" : "☀️"}
                  </div>
                </div>
              </button>
        </nav>
      </div>
    </header>
  )
}