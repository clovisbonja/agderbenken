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
  "Hva lover Venstre om rusreform?",
  "Hva lover KrF om familie?",
  "Hva lover Rødt om bolig?",
  "Hva lover Sp om distrikt?",
  "Hva lover partiene om eldreomsorg?",
  "Hva lover partiene om innvandring?",
  "Hva lover partiene om samferdsel?",
  "Hva lover partiene om barn og unge?",
  "Hva lover FrP om bompenger?",
  "Hva lover AP om velferd?",
  "Hva lover Høyre om næringsliv?",
  "Hva lover SV om boligpolitikk?",
  "Hva lover MDG om kollektivtransport?",
  "Hva lover partiene om forsvar?",
]
const SUGGESTED_QUERIES_EN = [
  "What does FrP promise about taxes?",
  "What does SV promise on climate?",
  "Which parties promise more health funding?",
  "What does H promise on education?",
  "What does V promise on drug reform?",
  "What does KrF promise for families?",
  "What does R promise on housing?",
  "What does Sp promise for rural areas?",
  "What do parties promise on elderly care?",
  "What do parties promise on immigration?",
  "What does FrP promise on road tolls?",
  "What does AP promise on welfare?",
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

// ── Relevansrangering ─────────────────────────────────────────────────────────

function scoreResult(result: ChatResultLofte, keywords: string[], query: string): number {
  const text = result.tekst.toLowerCase()
  const kategori = (result.kategori ?? "").toLowerCase()
  const queryLower = query.toLowerCase()
  let score = 0

  // 1. Eksakt fraser-treff i teksten — høyest prioritet
  if (text.includes(queryLower)) score += 100

  // 2. Alle søkeord treffer i teksten (AND-logikk = svært relevant)
  const allMatch = keywords.every(k => text.includes(k))
  if (allMatch && keywords.length > 1) score += 60

  // 3. Poeng per enkelt søkeord som treffer i teksten
  for (const kw of keywords) {
    if (text.includes(kw)) {
      score += 20
      // Bonus for antall forekomster (maks 3 bonus)
      const count = (text.match(new RegExp(kw, "g")) ?? []).length
      score += Math.min(count - 1, 3) * 5
    }
    // Søkeord treffer i kategori (indikerer sterk tematisk relevans)
    if (kategori.includes(kw)) score += 15
  }

  // 4. Kortere tekst med treff er mer presis → lett bonus
  if (score > 0) score += Math.max(0, 30 - Math.floor(result.tekst.length / 20))

  return score
}

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
  const [expandedResults, setExpandedResults] = useState<string | null>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const lastUserMsgRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Chatbot scroll — scroller kun inni chat-containeren, ikke siden
  useEffect(() => {
    const container = chatContainerRef.current
    if (!container) return
    if (lastUserMsgRef.current) {
      const msgTop = lastUserMsgRef.current.offsetTop - container.offsetTop
      container.scrollTo({ top: msgTop, behavior: "smooth" })
    } else {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })
    }
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
    const { data, error: err } = await q

    const rawResults = (data ?? []) as ChatResultLofte[]

    // Ranger etter relevans — best treff øverst
    const results = [...rawResults].sort((a, b) =>
      scoreResult(b, keywords, query) - scoreResult(a, keywords, query)
    )

    let botText = ""
    if (err) {
      botText = lang === "no" ? "Beklager, noe gikk galt med søket." : "Sorry, something went wrong."
    } else if (results.length === 0) {
      // Bedre "no results" melding med forslag
      const suggestions = lang === "no"
        ? "Tips: Prøv et annet ord, eller spørr om ett parti om gangen."
        : "Tip: Try a different word or ask about one party at a time."
      botText = lang === "no"
        ? `Fant ingen løfter for "${query}".\n${suggestions}`
        : `No pledges found for "${query}".\n${suggestions}`
    } else {
      // Bedre resultatsammendrag med kategorier
      const byParti: Record<string, ChatResultLofte[]> = {}
      const byCategory: Record<string, number> = {}
      results.forEach(r => {
        if (!byParti[r.parti]) byParti[r.parti] = []
        byParti[r.parti].push(r)
        if (r.kategori) byCategory[r.kategori] = (byCategory[r.kategori] ?? 0) + 1
      })

      const partiList = Object.entries(byParti).map(([p, items]) => `${p} (${items.length})`).join(", ")
      const topCategories = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cat]) => cat)
        .join(", ")

      botText = lang === "no"
        ? `Fant ${results.length} løfte${results.length !== 1 ? "r" : ""}${parti ? ` fra ${parti}` : ""} – ${partiList}${topCategories ? ` • Tema: ${topCategories}` : ""}`
        : `Found ${results.length} pledge${results.length !== 1 ? "s" : ""}${parti ? ` from ${parti}` : ""} – ${partiList}${topCategories ? ` • Topics: ${topCategories}` : ""}`
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
            {lang === "no" ? "Spør chatboten" : "Ask the chatbot"}
          </button>
        </div>
        <p className="parti-tab-hint">
          {tab === "programs"
            ? (lang === "no" ? "Direktelenker til partienes offisielle programmer" : "Direct links to official party programs")
            : (lang === "no" ? "Still spørsmål direkte til chatboten om partiløfter" : "Ask the chatbot directly about party pledges")}
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
                <h2 className="chat-header-title">{lang === "no" ? "Spør chatboten om partiløfter" : "Ask the chatbot about party pledges"}</h2>
                <p className="chat-header-sub">{lang === "no" ? "Still spørsmål om hva partiene lover — chatboten søker blant 5 500+ løfter fra alle partiprogrammer 2025–2029" : "Ask what parties promise — the chatbot searches 5,500+ pledges from all 2025–2029 party programs"}</p>
              </div>
            </div>

            {/* Meldingsliste */}
            <div className="chat-messages" ref={chatContainerRef}>
              {chatMessages.length === 0 && (
                <div className="chat-empty">
                  <p className="chat-empty-title">{lang === "no" ? "Still chatboten et spørsmål om hva partiene lover" : "Ask the chatbot what parties promise"}</p>
                </div>
              )}
              {chatMessages.map((msg, idx) => {
                const isLastUserMsg = msg.role === "user" &&
                  chatMessages.slice(idx + 1).every(m => m.role !== "user")
                return (
                <div key={msg.id} ref={isLastUserMsg ? lastUserMsgRef : undefined} className={`chat-msg chat-msg--${msg.role}`}>
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
                            {(() => {
                              // Gruppér resultater etter parti
                              const grouped: Record<string, ChatResultLofte[]> = {}
                              msg.results.forEach(r => {
                                if (!grouped[r.parti]) grouped[r.parti] = []
                                grouped[r.parti].push(r)
                              })

                              // Vis maks 8 resultater per default, med "se mer" hvis det er mange
                              const maxPerParty = 3
                              const isExpanded = expandedResults === msg.id

                              // Sorter partigrupper etter første treff-posisjon
                              // (reflekterer relevansrangering fra søket)
                              const firstIndex = (partyId: string) =>
                                msg.results!.findIndex(r => r.parti === partyId)

                              return Object.entries(grouped)
                                .sort((a, b) => firstIndex(a[0]) - firstIndex(b[0]))
                                .map(([partyId, items]) => {
                                  const partyInfo = AGDER_PARTIER.find(p => p.forkortelse === partyId)
                                  const partyColor = partyInfo?.farge ?? "#6b7280"
                                  const displayItems = isExpanded ? items : items.slice(0, maxPerParty)
                                  const hasMore = items.length > maxPerParty && !isExpanded

                                  return (
                                    <div key={partyId} className="chat-result-group">
                                      <div className="chat-result-party-header">
                                        <span className="chat-result-party-badge"
                                          style={{ background: partyColor + "22", color: partyColor, borderColor: partyColor + "44" }}>
                                          {partyId} • {items.length}
                                        </span>
                                      </div>
                                      {displayItems.map((r) => (
                                        <div key={r.lofte_id} className="chat-result-item">
                                          {r.kategori && (
                                            <span className="chat-result-kat">{r.kategori}</span>
                                          )}
                                          <p className="chat-result-tekst">"{r.tekst}"</p>
                                        </div>
                                      ))}
                                      {hasMore && (
                                        <button
                                          type="button"
                                          className="chat-show-more"
                                          onClick={() => setExpandedResults(msg.id)}
                                        >
                                          {lang === "no" ? `Vis ${items.length - maxPerParty} til...` : `Show ${items.length - maxPerParty} more...`}
                                        </button>
                                      )}
                                    </div>
                                  )
                                })
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Forslag — alltid synlig */}
            <div className="chat-suggestions-bar">
              <span className="chat-suggestions-label">{lang === "no" ? "Prøv:" : "Try:"}</span>
              <div className="chat-suggestions-scroll">
                {(lang === "no" ? SUGGESTED_QUERIES_NO : SUGGESTED_QUERIES_EN).map((q) => (
                  <button key={q} type="button" className="chat-suggestion-chip"
                    onClick={() => sendChatMessage(q)}>
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <form className="chat-input-row"
              onSubmit={(e) => { e.preventDefault(); sendChatMessage(chatInput) }}>
              <input
                className="chat-input"
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={lang === "no" ? "Spør chatboten, f.eks. 'Hva lover Høyre om skatt?'" : "Ask the chatbot, e.g. 'What does H promise on tax?'"}
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
