/*
 * ═══════════════════════════════════════════════════════════════════════════
 * PARTI — src/pages/Parti.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Viser partier representert på Agderbenken, med partiprogrammer og
 * valgløfter. Bruker Supabase for å laste valgløftedata.
 *
 * Faner per parti:
 *   - "Partiprogram" — lenke til partiets offisielle program
 *   - "Valgløfter"  — løfter fra Supabase med oppfyllelsesstatus
 *
 * Konfigurasjon:
 *   - Partidata (navn, farge, logo, lenker) er i src/config/partier.ts
 *   - Supabase-tilkobling er i src/lib/supabase.ts
 *
 * Støtter norsk (no) og engelsk (en) via lang-prop.
 * CSS finnes i src/styles/parti.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState } from "react"
import type { CSSProperties } from "react"
import { supabase } from "../lib/supabase"
import { AGDER_PARTIER } from "../config/partier"

// Partidata importeres fra src/config/partier.ts — legg til/fjern partier der.

type Lang = "no" | "en"

// ── Supabase-typer ────────────────────────────────────────────────────────────

type LofteSak = {
  id: string
  lofte_id: string
  sak_id: string
  sak_tittel: string | null
  sak_dato: string | null
  notat: string | null
  status: "pending" | "fulfilled" | "broken" | "partial"
}



// ── Chatbot-typer ─────────────────────────────────────────────────────────────

type ChatResultLofte = {
  lofte_id: string
  tekst: string
  kategori: string | null
  parti: string
}

type ChatMessage = {
  id: string
  role: "user" | "bot"
  text: string
  results?: ChatResultLofte[]
  loading?: boolean
}

// Mapping fra forkortelse/alias → parti-id i databasen
const PARTI_ALIAS: Record<string, string> = {
  ap: "AP", arbeiderpartiet: "AP", "arbeider": "AP",
  h: "H", høyre: "H", hoyre: "H",
  frp: "FrP", fremskrittspartiet: "FrP", fremskritt: "FrP",
  sp: "Sp", senterpartiet: "Sp", senter: "Sp",
  sv: "SV", sosialistisk: "SV",
  v: "V", venstre: "V",
  krf: "KrF", "kristelig": "KrF", krf_: "KrF",
  r: "R", rødt: "R", rodt: "R",
  mdg: "MDG", grønne: "MDG", grone: "MDG",
}

function parseQuery(query: string): { parti: string | null; keywords: string[] } {
  const q = query.toLowerCase().replace(/[?,!.]/g, "")
  const words = q.split(/\s+/).filter(Boolean)
  let parti: string | null = null
  const keywords: string[] = []
  for (const w of words) {
    const mapped = PARTI_ALIAS[w]
    if (mapped && !parti) { parti = mapped; continue }
    const skipWords = new Set(["hva", "hvem", "hvilke", "lover", "lovet", "om", "for", "og", "er", "har", "de", "en", "et", "i", "til", "fra", "med", "på", "av", "som"])
    if (!skipWords.has(w) && w.length > 2) keywords.push(w)
  }
  return { parti, keywords }
}

const SUGGESTED_QUERIES_NO = [
  "Hva lover FrP om skatter?",
  "Hva lover SV om klima?",
  "Hvilke partier lover mer til helse?",
  "Hva lover Høyre om utdanning?",
  "Hva lover AP om arbeid?",
  "Hva lover MDG om miljø?",
]
const SUGGESTED_QUERIES_EN = [
  "What does FrP promise about taxes?",
  "What does SV promise on climate?",
  "Which parties promise more health funding?",
  "What does H promise on education?",
]

// GDPR — Sensitiv informasjon som aldri skal søkes
const GDPR_BLOCK_PATTERNS = [
  /\b\d{11}\b/,  // fødselsnummer (11 siffer)
  /\b\d{6}\s?\d{5}\b/,  // норвегиаиска personnummer
  /barnehage|skole\s+navn/i,  // barn-identifisering
  /pasient|helse\s+opplysning/i,  // helseopplysninger
  /medicin|resept|diagnose/i,
  /religion|politisk|overbevisning/i,
  /fagforening|streik|lønn\s+opplysning/i,
  /lønnsliste|ansatt|personale/i,  // personell
  /hemmelighet|konfidensiell|intern/i,
  /kildekode|system|password|nøkkel/i,
  /bankkonto|kredittkort|ssn/i,
  /hjemmeadresse|hjemmeavtal|familje\s+forhold/i,
]

function validateGDPR(query: string): { valid: boolean; reason?: string } {
  const q = query.toLowerCase()
  for (const pattern of GDPR_BLOCK_PATTERNS) {
    if (pattern.test(q)) {
      return { valid: false, reason: "sensitiv_info" }
    }
  }
  // Hvis spørsmålet har < 3 ord og ingen partinavn/nøkkelord, er det trolig upassende
  const words = query.trim().split(/\s+/)
  if (words.length < 2) return { valid: false, reason: "too_short" }
  return { valid: true }
}

function getGDPRResponse(lang: Lang, reason?: string): string {
  if (reason === "sensitiv_info") {
    return lang === "no"
      ? "Jeg kan ikke søke etter personopplysninger, helseopplysninger eller andre sensitive data. Spør heller om partiprogram og valgløfter."
      : "I cannot search for personal information, health data, or other sensitive information. Please ask about party programs and pledges instead."
  }
  if (reason === "too_short") {
    return lang === "no"
      ? "Spørsmålet ditt er for kort. Prøv: 'Hva lover FrP om skatter?' eller 'Klima-løfter fra Venstre'"
      : "Your question is too short. Try: 'What does FrP promise about taxes?' or 'Climate pledges from Venstre'"
  }
  return lang === "no"
    ? "Jeg forstår ikke spørsmålet. Spør om partiprogram og valgløfter, f.eks. 'Hva lover Høyre om skatt?'"
    : "I don't understand the question. Ask about party programs and pledges, e.g. 'What does H promise on tax?'"
}

// ── Hjelpere ──────────────────────────────────────────────────────────────────

// ── Komponent ─────────────────────────────────────────────────────────────────

type PartiProps = { lang: Lang }

export default function Parti({ lang }: PartiProps) {
  const t =
    lang === "no"
      ? {
          title: "Partiprogrammer",
          subtitle: "Oversikt over partienes programmer med direkte lenke til originalkildene.",
          open: "Åpne program",
          read: "Les partiprogram",
          tabPrograms: "Partiprogrammer",
          tabPromises: "Løfter vs. handling",
          tabAgder: "Agderbenken",
          promisesIntro: "Velg et parti for å se hva de lovet i sitt program — og om de har fulgt opp.",
          selectParty: "Velg parti",
          loading: "Laster løfter…",
          noPromises: "Ingen løfter registrert for dette partiet ennå.",
          linkedCases: "Relaterte saker",
          noCases: "Ingen saker koblet ennå.",
          status: "Status",
          note: "Notat",
          caseLink: "Se sak",
        }
      : {
          title: "Party Programs",
          subtitle: "Overview of party programs with direct links to the original sources.",
          open: "Open program",
          read: "Read party program",
          tabPrograms: "Party Programs",
          tabPromises: "Promises vs. action",
          tabAgder: "Agder Bench",
          promisesIntro: "Select a party to see what they promised — and whether they followed through.",
          selectParty: "Select party",
          loading: "Loading promises…",
          noPromises: "No promises registered for this party yet.",
          linkedCases: "Related cases",
          noCases: "No cases linked yet.",
          status: "Status",
          note: "Note",
          caseLink: "View case",
        }

  const [tab, setTab] = useState<"programs" | "chatbot">("programs")
  const [selectedParti, setSelectedParti] = useState<string | null>(null)

  // Chatbot state
  const [chatInput, setChatInput] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const chatEndRef = useRef<HTMLDivElement>(null)


  // Chatbot scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  async function sendChatMessage(query: string) {
    if (!query.trim() || !supabase) return
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: query }
    const botPlaceholder: ChatMessage = { id: Date.now().toString() + "_bot", role: "bot", text: "", loading: true }
    setChatMessages(prev => [...prev, userMsg, botPlaceholder])
    setChatInput("")

    // GDPR validation — blokkér sensitive queries
    const gdprCheck = validateGDPR(query)
    if (!gdprCheck.valid) {
      const gdprResponse = getGDPRResponse(lang, gdprCheck.reason)
      setChatMessages(prev => prev.map(m =>
        m.id === botPlaceholder.id ? { ...m, text: gdprResponse, loading: false } : m
      ))
      return
    }

    const { parti, keywords } = parseQuery(query)
    let q = supabase.from("valgløfte").select("lofte_id, tekst, kategori, parti")
    if (parti) q = q.eq("parti", parti)
    if (keywords.length > 0) {
      // ilike på hvert keyword kombinert
      const filter = keywords.map(k => `tekst.ilike.%${k}%`).join(",")
      q = q.or(filter)
    }
    q = q.limit(15)
    const { data, error: err } = await q

    const results = (data ?? []) as ChatResultLofte[]
    let botText = ""
    if (err) {
      botText = lang === "no" ? "Beklager, noe gikk galt med søket." : "Sorry, something went wrong."
    } else if (results.length === 0) {
      botText = lang === "no"
        ? `Fant ingen løfter for "${query}". Prøv et annet søkeord eller parti.`
        : `No pledges found for "${query}". Try a different keyword or party.`
    } else {
      const byParti: Record<string, number> = {}
      results.forEach(r => { byParti[r.parti] = (byParti[r.parti] ?? 0) + 1 })
      const partiSummary = Object.entries(byParti).map(([p, n]) => `${p} (${n})`).join(", ")
      botText = lang === "no"
        ? `Fant ${results.length} løfter${parti ? ` fra ${parti}` : ""}: ${partiSummary}`
        : `Found ${results.length} pledges${parti ? ` from ${parti}` : ""}: ${partiSummary}`
    }

    setChatMessages(prev => prev.map(m =>
      m.id === botPlaceholder.id ? { ...m, text: botText, results, loading: false } : m
    ))
  }

  return (
    <>
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">Stortinget · Agder</p>
          <h1 className="ed-page-hero-heading">{lang === "no" ? "Partiprogrammer" : "Party Programs"}</h1>
          <p className="ed-page-hero-lead">{lang === "no" ? "Hva lovet partiene velgerne? Programmer og valgløfter i én oversikt." : "What did parties promise voters? Programs and pledges in one overview."}</p>
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>
    <main className="page parti-page">
      {/* Tab-navigasjon — sentrert og tydelig */}
      <div className="parti-tab-wrapper">
        <div className="parti-tabs">
          <button
            type="button"
            className={`parti-tab${tab === "programs" ? " parti-tab-active" : ""}`}
            onClick={() => setTab("programs")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>
            </svg>
            {t.tabPrograms}
          </button>
          <button
            type="button"
            className={`parti-tab${tab === "chatbot" ? " parti-tab-active" : ""}`}
            onClick={() => setTab("chatbot")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            {lang === "no" ? "Spør om løfter" : "Ask about pledges"}
          </button>
        </div>
        <p className="parti-tab-hint">
          {tab === "programs"
            ? (lang === "no" ? "Direktelenker til partienes offisielle programmer" : "Direct links to official party programs")
            : (lang === "no" ? "Søk blant 5 500+ valgløfter fra alle partier" : "Search across 5,500+ election pledges from all parties")}
        </p>
      </div>

      {/* Tab: Partiprogrammer */}
      {tab === "programs" && (
        <section className="parti-grid">
          {AGDER_PARTIER.map((parti) => (
            <article
              key={parti.navn}
              className="parti-card"
              style={{ "--party-color": parti.farge } as CSSProperties}
            >
              <a
                className="parti-link"
                href={parti.partiprogram ?? parti.nettside}
                target="_blank"
                rel="noopener noreferrer"
              >
                <header className="parti-card-head">
                  <span className="parti-pill">{parti.forkortelse}</span>
                  <span className="parti-open">{t.open}</span>
                </header>
                <div className="parti-logo-wrap">
                  <img src={parti.logo} alt={parti.navn} className="parti-logo" />
                </div>
                <footer className="parti-card-foot">
                  <strong>{parti.navn}</strong>
                  <small>{t.read}</small>
                </footer>
              </a>
            </article>
          ))}
        </section>
      )}

      {/* Tab: Chatbot — spør om løfter */}
      {tab === "chatbot" && (
        <section className="lofter-section">
          <div className="chat-shell">
            <div className="chat-header">
              <div className="chat-header-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <h2 className="chat-header-title">{lang === "no" ? "Spør om partiløfter" : "Ask about party pledges"}</h2>
                <p className="chat-header-sub">{lang === "no" ? "Søk blant 5 500+ løfter fra alle partiprogrammer 2025–2029" : "Search across 5,500+ pledges from all 2025–2029 party programs"}</p>
              </div>
            </div>

            {/* Meldingsliste */}
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <p className="chat-empty-title">{lang === "no" ? "Still et spørsmål om hva partiene lover" : "Ask a question about what parties promise"}</p>
                  <p className="chat-empty-sub">{lang === "no" ? "Eksempler:" : "Examples:"}</p>
                  <div className="chat-suggestions">
                    {(lang === "no" ? SUGGESTED_QUERIES_NO : SUGGESTED_QUERIES_EN).map((q) => (
                      <button key={q} type="button" className="chat-suggestion-btn"
                        onClick={() => sendChatMessage(q)}>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
                  {msg.role === "bot" && (
                    <div className="chat-bot-avatar" aria-hidden>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                  )}
                  <div className="chat-bubble">
                    {msg.loading ? (
                      <span className="chat-typing"><span/><span/><span/></span>
                    ) : (
                      <>
                        <p className="chat-bubble-text">{msg.text}</p>
                        {msg.results && msg.results.length > 0 && (
                          <div className="chat-results">
                            {msg.results.map((r) => {
                              const partyInfo = AGDER_PARTIER.find(p => p.forkortelse === r.parti)
                              const partyColor = partyInfo?.farge ?? "#6b7280"
                              return (
                                <div key={r.lofte_id} className="chat-result-item">
                                  <div className="chat-result-top">
                                    <span className="chat-result-parti"
                                      style={{ background: partyColor + "18", color: partyColor, borderColor: partyColor + "44" }}>
                                      {r.parti}
                                    </span>
                                    {r.kategori && (
                                      <span className="chat-result-kat">{r.kategori}</span>
                                    )}
                                  </div>
                                  <p className="chat-result-tekst">"{r.tekst}"</p>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form className="chat-input-row"
              onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput) }}>
              <input
                className="chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === "no" ? "Spør om partiløfter, f.eks. 'Hva lover FrP om skatt?'" : "Ask about pledges, e.g. 'What does FrP promise on tax?'"}
                autoComplete="off"
              />
              <button type="submit" className="chat-send-btn" disabled={!chatInput.trim()}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
    </>
  )
}
