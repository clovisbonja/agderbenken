import { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import ForsideTom from "./pages/ForsideTom"
import Statistikk from "./pages/Statistikk"
import Parti from "./pages/Parti"
import Representanter from "./pages/Representanter"
import Om from "./pages/Om"
import "./App.css"

export default function App() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const stored = localStorage.getItem("theme")
      if (stored === "light" || stored === "dark") return stored

      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches
      return prefersDark ? "dark" : "light"
    } catch {
      return "light"
    }
  })

  const [lang, setLang] = useState<"no" | "en">(() => {
    try {
      const stored = localStorage.getItem("lang")
      return stored === "en" ? "en" : "no"
    } catch {
      return "no"
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
    document.documentElement.setAttribute("data-home-theme", theme)
    try {
      localStorage.setItem("theme", theme)
    } catch {}
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem("lang", lang)
    } catch {}
  }, [lang])

  return (
    <>
      {/* Fast toppnavigasjon som vises på alle sider */}
      <Navbar
        theme={theme}
        lang={lang}
        onToggleTheme={() => setTheme((current) => (current === "light" ? "dark" : "light"))}
        onToggleLanguage={() => setLang((current) => (current === "no" ? "en" : "no"))}
      />

      {/* App-ruting:
          URL-en bestemmer hvilken sidekomponent som vises under menyen. */}
      <Routes>
        <Route path="/" element={<ForsideTom lang={lang} />} />
        <Route path="/statistikk" element={<Statistikk lang={lang} />} />
        <Route path="/parti" element={<Parti lang={lang} />} />
        <Route path="/representanter" element={<Representanter lang={lang} />} />
        <Route path="/om" element={<Om lang={lang} />} />
        {/* Fallback for ukjente URL-er */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
