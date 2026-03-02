import { Routes, Route, Navigate } from "react-router-dom"
import Navbar from "./components/Navbar"
import Forside from "./pages/Forside"
import Parti from "./pages/Parti"
import Representanter from "./pages/Representanter"
import Om from "./pages/Om"
import "./App.css"

export default function App() {
  return (
    <>
      {/* Fast toppnavigasjon som vises på alle sider */}
      <Navbar />

      {/* App-ruting:
          URL-en bestemmer hvilken sidekomponent som vises under menyen. */}
      <Routes>
        <Route path="/" element={<Forside />} />
        <Route path="/parti" element={<Parti />} />
        <Route path="/representanter" element={<Representanter />} />
        <Route path="/om" element={<Om />} />
        {/* Fallback for ukjente URL-er */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
