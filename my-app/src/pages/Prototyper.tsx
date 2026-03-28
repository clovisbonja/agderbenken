import { useState } from "react"
import { NavLink } from "react-router-dom"

/* ── Mock data ── */
interface Case {
  id: string
  title: string
  short: string
  type: string
  date: string
  theme: string
  vedtatt: boolean
  for: number
  mot: number
}

interface Rep {
  name: string
  parti: string
  partiColor: string
  partiTextColor?: string
  vote: "for" | "mot" | "absent"
}

const CASES: Case[] = [
  { id: "1", title: "Lov om endringer i arbeidsmiljøloven mv.", short: "Arbeidsmiljøloven", type: "LOVSAK", date: "10. mars 2026", theme: "Økonomi", vedtatt: true, for: 89, mot: 80 },
  { id: "2", title: "Representantforslag om styrking av fastlegeordningen", short: "Fastlegeordningen", type: "REPRESENTANTFORSLAG", date: "5. mars 2026", theme: "Helse", vedtatt: false, for: 45, mot: 124 },
  { id: "3", title: "Norges arbeid med bærekraftsmålene", short: "Bærekraftsmålene", type: "ALMINNELIGSAK", date: "24. feb 2026", theme: "Klima", vedtatt: true, for: 169, mot: 0 },
  { id: "4", title: "Endringer i domstolloven mv. (saksfordeling m.m.)", short: "Domstolloven", type: "LOVSAK", date: "10. feb 2026", theme: "Justis", vedtatt: true, for: 110, mot: 59 },
  { id: "5", title: "Trygg oppvekst i et digitalt samfunn", short: "Trygg oppvekst", type: "ALMINNELIGSAK", date: "24. feb 2026", theme: "Utdanning", vedtatt: true, for: 169, mot: 0 },
  { id: "6", title: "Endringer i vergemålsloven", short: "Vergemålsloven", type: "LOVSAK", date: "17. jan 2026", theme: "Justis", vedtatt: true, for: 98, mot: 71 },
]

const REPS: Rep[] = [
  { name: "Nicolai Astrup", parti: "H", partiColor: "#2A6ABC", vote: "for" },
  { name: "Sara Bell", parti: "Ap", partiColor: "#E30613", vote: "mot" },
  { name: "Kjell Ingolf Ropstad", parti: "KrF", partiColor: "#FEEF32", partiTextColor: "#111", vote: "for" },
  { name: "Åse Holen", parti: "FrP", partiColor: "#003F7F", vote: "for" },
  { name: "Line Henriette Hjemdal", parti: "KrF", partiColor: "#FEEF32", partiTextColor: "#111", vote: "for" },
]

const DESIGNS = ["1 Editorial", "2 Kort-grid", "3 Timeline", "4 Tabell", "5 Forbedret"]

/* ── Helper components ── */
function VerdiktBadge({ vedtatt }: { vedtatt: boolean }) {
  return (
    <span className={`proto-verdikt-badge ${vedtatt ? "proto-verdikt-yes" : "proto-verdikt-no"}`}>
      {vedtatt ? "VEDTATT" : "IKKE VEDTATT"}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = {
    LOVSAK: "Lovsak",
    REPRESENTANTFORSLAG: "Repr.forslag",
    ALMINNELIGSAK: "Alminnelig sak",
  }
  return <span className="proto-type-badge">{labels[type] ?? type}</span>
}

function VoteBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="proto-vote-bar-row">
      <span className="proto-vote-bar-label">{label}</span>
      <div className="proto-vote-bar-track">
        <div className="proto-vote-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="proto-vote-bar-num">{count}</span>
    </div>
  )
}

function RepCard({ rep }: { rep: Rep }) {
  const icon = rep.vote === "for" ? "✓" : rep.vote === "mot" ? "✗" : "–"
  const cls = rep.vote === "for" ? "proto-rep-for" : rep.vote === "mot" ? "proto-rep-mot" : "proto-rep-abs"
  return (
    <div className={`proto-rep-card ${cls}`}>
      <span className="proto-rep-dot" style={{ background: rep.partiColor, color: rep.partiTextColor ?? "#fff" }}>
        {rep.parti}
      </span>
      <span className="proto-rep-name">{rep.name}</span>
      <span className="proto-rep-icon">{icon}</span>
    </div>
  )
}

/* ════════════════════════════════════════════
   DESIGN 1 — Editorial Split
════════════════════════════════════════════ */
function Design1() {
  const [selectedId, setSelectedId] = useState("1")
  const selected = CASES.find(c => c.id === selectedId) ?? CASES[0]
  const total = selected.for + selected.mot

  return (
    <div className="proto-d1-shell">
      {/* Sidebar */}
      <aside className="proto-d1-sidebar">
        <div className="proto-d1-sidebar-header">
          <span className="proto-d1-sidebar-title">Saker · 2026</span>
        </div>
        <ul className="proto-d1-list">
          {CASES.map(c => (
            <li
              key={c.id}
              className={`proto-d1-item ${c.id === selectedId ? "proto-d1-item--active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span className="proto-d1-item-type">{c.type}</span>
              <span className="proto-d1-item-title">{c.short}</span>
              <span className="proto-d1-item-date">{c.date}</span>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main content */}
      <main className="proto-d1-main">
        <div className="proto-d1-content">
          <div className="proto-d1-meta-row">
            <TypeBadge type={selected.type} />
            <span className="proto-d1-theme-chip">{selected.theme}</span>
            <span className="proto-d1-date">{selected.date}</span>
          </div>
          <h2 className="proto-d1-heading">{selected.title}</h2>
          <div className="proto-d1-verdict-row">
            <VerdiktBadge vedtatt={selected.vedtatt} />
            <span className="proto-d1-verdict-counts">{selected.for} for · {selected.mot} mot</span>
          </div>

          <div className="proto-d1-bars">
            <VoteBar label="For" count={selected.for} total={total} color="#22c55e" />
            <VoteBar label="Mot" count={selected.mot} total={total} color="#ef4444" />
          </div>

          <div className="proto-d1-reps-section">
            <h3 className="proto-d1-reps-heading">Agder-representantenes stemmer</h3>
            <div className="proto-d1-reps-grid">
              {REPS.map(r => <RepCard key={r.name} rep={r} />)}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ════════════════════════════════════════════
   DESIGN 2 — Card Grid + Drawer
════════════════════════════════════════════ */
function Design2() {
  const [drawerCase, setDrawerCase] = useState<Case | null>(null)

  return (
    <div className="proto-d2-shell">
      <div className="proto-d2-grid">
        {CASES.map(c => {
          const total = c.for + c.mot
          return (
            <div
              key={c.id}
              className="proto-d2-card"
              onClick={() => setDrawerCase(c)}
            >
              <div className="proto-d2-card-top">
                <span className="proto-d2-theme-pill" data-theme={c.theme}>{c.theme}</span>
              </div>
              <p className="proto-d2-card-title">{c.short}</p>
              <p className="proto-d2-card-long">{c.title}</p>
              <p className="proto-d2-card-date">{c.date}</p>
              <div className="proto-d2-card-bottom">
                <VerdiktBadge vedtatt={c.vedtatt} />
                <span className="proto-d2-card-counts">{c.for} for · {c.mot} mot</span>
              </div>
              <div className="proto-d2-mini-bars">
                <div className="proto-d2-mini-for" style={{ width: total > 0 ? `${Math.round(c.for / total * 100)}%` : "0%" }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Drawer */}
      {drawerCase && (
        <div className="proto-d2-drawer-backdrop" onClick={() => setDrawerCase(null)}>
          <div className="proto-d2-drawer" onClick={e => e.stopPropagation()}>
            <button className="proto-d2-drawer-close" onClick={() => setDrawerCase(null)}>✕</button>
            <div className="proto-d2-drawer-meta">
              <TypeBadge type={drawerCase.type} />
              <span className="proto-d2-drawer-date">{drawerCase.date}</span>
            </div>
            <h2 className="proto-d2-drawer-title">{drawerCase.title}</h2>
            <VerdiktBadge vedtatt={drawerCase.vedtatt} />
            <div className="proto-d2-drawer-bars">
              <VoteBar label="For" count={drawerCase.for} total={drawerCase.for + drawerCase.mot} color="#22c55e" />
              <VoteBar label="Mot" count={drawerCase.mot} total={drawerCase.for + drawerCase.mot} color="#ef4444" />
            </div>
            <h3 className="proto-d2-drawer-reps-heading">Agder-representanter</h3>
            <div className="proto-d2-drawer-reps">
              {REPS.map(r => <RepCard key={r.name} rep={r} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   DESIGN 3 — Timeline Feed
════════════════════════════════════════════ */
function Design3() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="proto-d3-shell">
      <div className="proto-d3-feed">
        {CASES.map(c => {
          const isExpanded = expandedId === c.id
          const total = c.for + c.mot
          const summary = c.vedtatt
            ? `Vedtatt med ${c.for} mot ${c.mot} stemmer`
            : `Ikke vedtatt — ${c.mot} mot ${c.for} for`
          return (
            <div
              key={c.id}
              className={`proto-d3-item ${c.vedtatt ? "proto-d3-item--vedtatt" : "proto-d3-item--nei"}`}
              onClick={() => setExpandedId(isExpanded ? null : c.id)}
            >
              <div className="proto-d3-item-header">
                <span className="proto-d3-item-date">{c.date}</span>
                <TypeBadge type={c.type} />
              </div>
              <p className="proto-d3-item-title">{c.title}</p>
              <p className="proto-d3-item-summary">{summary}</p>

              <div className={`proto-d3-expand ${isExpanded ? "proto-d3-expand--open" : ""}`}>
                <div className="proto-d3-expand-inner">
                  <div className="proto-d3-bars">
                    <VoteBar label="For" count={c.for} total={total} color="#22c55e" />
                    <VoteBar label="Mot" count={c.mot} total={total} color="#ef4444" />
                  </div>
                  <div className="proto-d3-reps-row">
                    <span className="proto-d3-reps-label">Agder:</span>
                    {REPS.map(r => (
                      <span
                        key={r.name}
                        className="proto-d3-rep-chip"
                        title={`${r.name} (${r.parti}) — ${r.vote}`}
                        style={{ background: r.partiColor, color: r.partiTextColor ?? "#fff" }}
                      >
                        {r.parti} {r.vote === "for" ? "✓" : r.vote === "mot" ? "✗" : "–"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <span className="proto-d3-toggle">{isExpanded ? "▲ Skjul" : "▼ Vis detaljer"}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ════════════════════════════════════════════
   DESIGN 4 — Dashboard Table
════════════════════════════════════════════ */
function Design4() {
  const [modalCase, setModalCase] = useState<Case | null>(null)

  return (
    <div className="proto-d4-shell">
      <div className="proto-d4-table-wrap">
        <table className="proto-d4-table">
          <thead>
            <tr>
              <th>Sak</th>
              <th>Tema</th>
              <th>Dato</th>
              <th>Resultat</th>
              <th>Agder-stemmer</th>
            </tr>
          </thead>
          <tbody>
            {CASES.map((c, i) => (
              <tr
                key={c.id}
                className={`proto-d4-row ${i % 2 === 1 ? "proto-d4-row--alt" : ""}`}
                onClick={() => setModalCase(c)}
              >
                <td className="proto-d4-sak-cell">
                  <span className="proto-d4-sak-title">{c.short}</span>
                  <TypeBadge type={c.type} />
                </td>
                <td><span className="proto-d4-theme">{c.theme}</span></td>
                <td className="proto-d4-date">{c.date}</td>
                <td><VerdiktBadge vedtatt={c.vedtatt} /></td>
                <td>
                  <div className="proto-d4-dots">
                    {REPS.map(r => (
                      <span
                        key={r.name}
                        className="proto-d4-dot"
                        title={`${r.name}: ${r.vote}`}
                        style={{ background: r.partiColor, outline: r.vote === "mot" ? "2px solid #ef4444" : r.vote === "for" ? "2px solid #22c55e" : "2px solid #999" }}
                      />
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalCase && (
        <div className="proto-d4-modal-backdrop" onClick={() => setModalCase(null)}>
          <div className="proto-d4-modal" onClick={e => e.stopPropagation()}>
            <button className="proto-d4-modal-close" onClick={() => setModalCase(null)}>✕</button>
            <div className="proto-d4-modal-meta">
              <TypeBadge type={modalCase.type} />
              <span className="proto-d4-modal-theme">{modalCase.theme}</span>
              <span className="proto-d4-modal-date">{modalCase.date}</span>
            </div>
            <h2 className="proto-d4-modal-title">{modalCase.title}</h2>
            <div className="proto-d4-modal-verdict">
              <VerdiktBadge vedtatt={modalCase.vedtatt} />
              <span className="proto-d4-modal-counts">{modalCase.for} for · {modalCase.mot} mot</span>
            </div>
            <div className="proto-d4-modal-bars">
              <VoteBar label="For" count={modalCase.for} total={modalCase.for + modalCase.mot} color="#22c55e" />
              <VoteBar label="Mot" count={modalCase.mot} total={modalCase.for + modalCase.mot} color="#ef4444" />
            </div>
            <h3 className="proto-d4-modal-reps-heading">Agder-representanter</h3>
            <div className="proto-d4-modal-reps">
              {REPS.map(r => <RepCard key={r.name} rep={r} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ════════════════════════════════════════════
   DESIGN 5 — Improved Two-Column
════════════════════════════════════════════ */
function Design5() {
  const [selectedId, setSelectedId] = useState("1")
  const [search, setSearch] = useState("")
  const selected = CASES.find(c => c.id === selectedId) ?? CASES[0]
  const total = selected.for + selected.mot

  const filtered = CASES.filter(c =>
    c.short.toLowerCase().includes(search.toLowerCase()) ||
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.theme.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="proto-d5-shell">
      {/* Left panel */}
      <aside className="proto-d5-sidebar">
        <div className="proto-d5-controls">
          <select className="proto-d5-session-select">
            <option>Stortingsperiode 2025–2026</option>
            <option>Stortingsperiode 2024–2025</option>
          </select>
          <div className="proto-d5-search-wrap">
            <span className="proto-d5-search-icon">⌕</span>
            <input
              className="proto-d5-search"
              placeholder="Søk i saker…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
        <ul className="proto-d5-list">
          {filtered.map(c => (
            <li
              key={c.id}
              className={`proto-d5-item ${c.id === selectedId ? "proto-d5-item--active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <span
                className="proto-d5-item-dot"
                style={{ background: c.vedtatt ? "#22c55e" : "#9ca3af" }}
              />
              <div className="proto-d5-item-body">
                <span className="proto-d5-item-title">{c.short}</span>
                <div className="proto-d5-item-chips">
                  <TypeBadge type={c.type} />
                  <span className="proto-d5-item-theme">{c.theme}</span>
                  <span className="proto-d5-item-date">{c.date}</span>
                </div>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="proto-d5-empty">Ingen saker funnet</li>
          )}
        </ul>
      </aside>

      {/* Right panel */}
      <main className="proto-d5-main">
        <div className="proto-d5-top-card">
          <div className="proto-d5-top-meta">
            <TypeBadge type={selected.type} />
            <span className="proto-d5-top-theme">{selected.theme}</span>
            <span className="proto-d5-top-date">{selected.date}</span>
          </div>
          <h2 className="proto-d5-heading">{selected.title}</h2>
          <div className="proto-d5-verdict-row">
            <VerdiktBadge vedtatt={selected.vedtatt} />
            <span className="proto-d5-counts">
              <span className="proto-d5-count-for">{selected.for} for</span>
              <span> · </span>
              <span className="proto-d5-count-mot">{selected.mot} mot</span>
            </span>
          </div>
        </div>

        <div className="proto-d5-section">
          <h3 className="proto-d5-section-heading">Votering</h3>
          <div className="proto-d5-bars">
            <VoteBar label="For" count={selected.for} total={total} color="#22c55e" />
            <VoteBar label="Mot" count={selected.mot} total={total} color="#ef4444" />
            <VoteBar label="Fraværende" count={169 - selected.for - selected.mot} total={169} color="#9ca3af" />
          </div>
        </div>

        <div className="proto-d5-section">
          <h3 className="proto-d5-section-heading">Agder-representantenes stemmer</h3>
          <div className="proto-d5-reps-grid">
            {REPS.map(r => <RepCard key={r.name} rep={r} />)}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ════════════════════════════════════════════
   ROOT COMPONENT
════════════════════════════════════════════ */
export default function Prototyper() {
  const [activeDesign, setActiveDesign] = useState(1)

  return (
    <div className="proto-page">
      {/* Page header */}
      <div className="proto-page-header">
        <NavLink to="/votering" className="proto-back-link">← Tilbake</NavLink>
        <h1 className="proto-page-title">Stemmegivning — Designprototyper</h1>
        <p className="proto-page-desc">5 redesign-konsepter basert på statiske mockdata. Klikk mellom faner for å sammenligne.</p>
      </div>

      {/* Tab switcher */}
      <div className="proto-tabs-bar">
        {DESIGNS.map((label, i) => (
          <button
            key={i}
            className={`proto-tab-btn ${activeDesign === i + 1 ? "proto-tab-btn--active" : ""}`}
            onClick={() => setActiveDesign(i + 1)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Design panels */}
      <div className="proto-design-area">
        {activeDesign === 1 && <Design1 />}
        {activeDesign === 2 && <Design2 />}
        {activeDesign === 3 && <Design3 />}
        {activeDesign === 4 && <Design4 />}
        {activeDesign === 5 && <Design5 />}
      </div>
    </div>
  )
}
