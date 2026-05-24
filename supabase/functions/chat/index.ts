/**
 * chat — Supabase Edge Function
 *
 * Backend for Sørblikket-chatboten på Partiprogrammer-siden.
 *
 * Mottar:    POST { query: string, lang: "no" | "en" }
 * Returnerer: { response: string, results: Lofte[] }
 *
 * Steg:
 *  1. Valider lengde
 *  2. Sjekk politisk intent (regelbasert, ingen KI-kostnad)
 *  3. Søk i Supabase valgløfte-tabellen med rangering
 *  4. Send spørsmål + relevante løfter til Claude Haiku
 *  5. Returner Claudes svar + rådata til frontend
 */

import "@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Anthropic from "https://esm.sh/@anthropic-ai/sdk"

// ── Klienter ──────────────────────────────────────────────────────────────────
// Supabase injiserer SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY automatisk
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
)
const anthropic = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! })

// ── CORS ──────────────────────────────────────────────────────────────────────
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

// ── Partinavn → databasenøkkel ────────────────────────────────────────────────
const PARTI_ALIAS: Record<string, string> = {
  ap: "AP", arbeiderpartiet: "AP", arbeider: "AP",
  h: "H", høyre: "H", hoyre: "H",
  frp: "FrP", fremskrittspartiet: "FrP", fremskritt: "FrP",
  sp: "Sp", senterpartiet: "Sp", senter: "Sp",
  sv: "SV", sosialistisk: "SV",
  v: "V", venstre: "V",
  krf: "KrF", kristelig: "KrF",
  r: "R", rødt: "R", rodt: "R",
  mdg: "MDG", grønne: "MDG", grone: "MDG",
}

// ── Stoppord ──────────────────────────────────────────────────────────────────
const STOPPORD = new Set([
  "hva", "hvem", "hvilke", "hvilken", "lover", "lovet", "loves",
  "om", "for", "og", "er", "har", "de", "en", "et", "i", "til",
  "fra", "med", "på", "av", "som", "ikke", "kan", "vil", "skal",
  "bør", "må", "meg", "deg", "seg", "sin", "sitt", "sine", "den",
  "det", "disse", "dem", "denne", "forskjell", "forskjellen",
  "mellom", "forklare", "forklaring", "definer", "hjelp", "svar",
  "fortell", "beskriv", "vis", "finn", "søk",
])

// ── Politiske emneord ─────────────────────────────────────────────────────────
const POLITISKE_ORD = new Set([
  "løfte", "løfter", "politikk", "valg", "program", "partiprogram",
  "partiene", "partiet", "stortinget", "regjering", "storting",
  "skatt", "skatter", "avgift", "avgifter", "bompenge", "bompenger", "moms",
  "økonomi", "budsjett", "bevilge", "subsidie", "støtte",
  "helse", "sykehus", "lege", "fastlege", "psykisk", "rus", "rusreform",
  "utdanning", "skole", "barnehage", "universitet", "studiestøtte", "lærling",
  "bolig", "boliger", "leie", "husleie", "studentbolig",
  "arbeid", "jobb", "lønn", "arbeidsplasser", "permittering", "nav",
  "pensjon", "trygd", "uføre", "alderspensjon", "velferd",
  "innvandring", "asyl", "flyktning", "integrering",
  "forsvar", "militær", "nato", "beredskap", "politi", "kriminalitet", "justis",
  "næring", "industri", "gründer", "olje", "gass", "landbruk", "fisk",
  "klima", "miljø", "natur", "energi", "strøm", "fornybar",
  "samferdsel", "vei", "jernbane", "tog", "buss",
  "distrikt", "sentralisering", "kommune",
  "familie", "barn", "ungdom", "eldre", "sosial", "fattigdom",
  "demokrati", "digitalisering", "teknologi", "innovasjon",
])

// ── Query-parsing ─────────────────────────────────────────────────────────────
function parseQuery(query: string): { parti: string | null; keywords: string[] } {
  const q = query.toLowerCase().replace(/[?,!.]/g, "")
  const words = q.split(/\s+/).filter(Boolean)
  let parti: string | null = null
  const keywords: string[] = []
  for (const w of words) {
    const mapped = PARTI_ALIAS[w]
    if (mapped && !parti) { parti = mapped; continue }
    if (!STOPPORD.has(w) && w.length > 2) keywords.push(w)
  }
  return { parti, keywords }
}

function erPolitisk(keywords: string[], parti: string | null): boolean {
  if (parti) return true
  return keywords.some(k => POLITISKE_ORD.has(k))
}

// ── Relevansrangering ─────────────────────────────────────────────────────────
function scoreResult(tekst: string, kategori: string | null, keywords: string[], query: string): number {
  const t = tekst.toLowerCase()
  const kat = (kategori ?? "").toLowerCase()
  const q = query.toLowerCase()
  let s = 0
  if (t.includes(q)) s += 100
  const allMatch = keywords.every(k => t.includes(k))
  if (allMatch && keywords.length > 1) s += 60
  for (const kw of keywords) {
    if (t.includes(kw)) {
      s += 20
      const count = (t.match(new RegExp(kw, "g")) ?? []).length
      s += Math.min(count - 1, 3) * 5
    }
    if (kat.includes(kw)) s += 15
  }
  if (s > 0) s += Math.max(0, 30 - Math.floor(tekst.length / 20))
  return s
}

// ── Claude-svar ───────────────────────────────────────────────────────────────
async function genererSvar(
  query: string,
  lang: string,
  løfter: { tekst: string; kategori: string | null; parti: string }[]
): Promise<string> {
  const top = løfter.slice(0, 12)
  const ctx = top
    .map(l => `[${l.parti}${l.kategori ? ` – ${l.kategori}` : ""}] "${l.tekst}"`)
    .join("\n")

  const system = lang === "en"
    ? `You are a factual assistant for Sørblikket, a political transparency tool about Agder's representatives in the Norwegian Parliament.
Answer questions about Norwegian party programs 2025–2029.
Rules:
- Answer ONLY based on the party pledges provided. Never invent information.
- Be concise: max 3 sentences.
- If pledges don't directly answer the question, say so honestly.
- Do not evaluate which party is best.
- Name specific parties when relevant.
- Answer in English.`
    : `Du er en faktabasert assistent for Sørblikket, et verktøy for politisk innsyn om Agderbenkens representanter på Stortinget.
Du svarer på spørsmål om norske partiers valgløfter 2025–2029.
Regler:
- Svar KUN basert på løftene som er oppgitt nedenfor. Finn aldri opp informasjon.
- Vær konsis: maks 3 setninger.
- Hvis løftene ikke direkte besvarer spørsmålet, si det ærlig.
- Ikke vurder hvilket parti som er best.
- Nevn konkrete partier med navn når det er relevant.
- Svar på norsk.`

  const user = lang === "en"
    ? `User question: "${query}"\n\nRelevant party pledges:\n${ctx}`
    : `Brukerens spørsmål: "${query}"\n\nRelevante valgløfter:\n${ctx}`

  const msg = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 512,
    system,
    messages: [{ role: "user", content: user }],
  })

  return (msg.content[0] as { type: string; text: string }).text.trim()
}

// ── Handler ───────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS })
  }

  try {
    const { query, lang = "no" } = await req.json() as { query: string; lang?: string }

    if (!query?.trim() || query.trim().split(/\s+/).length < 2) {
      const svar = lang === "en"
        ? "The question is too short. Try: \"What does FrP promise on taxes?\" or \"Climate pledges from SV\""
        : "Spørsmålet er for kort. Prøv: \"Hva lover FrP om skatter?\" eller \"Klima-løfter fra SV\""
      return Response.json({ response: svar, results: [] }, { headers: CORS })
    }

    const { parti, keywords } = parseQuery(query)

    // 1. Politisk intentsjekk
    if (!erPolitisk(keywords, parti)) {
      const svar = lang === "en"
        ? `"${query}" doesn't look like a question about party programs.\n\nThe chatbot searches pledges from all nine parties' programs for 2025–2029. Try:\n• "What does FrP promise on taxes?"\n• "Climate pledges from SV"\n• "What do parties promise on health?"`
        : `"${query}" ser ikke ut som et spørsmål om partiprogrammer.\n\nChatboten søker i valgløfter fra alle ni partienes programmer for 2025–2029. Prøv for eksempel:\n• "Hva lover FrP om skatter?"\n• "Klima-løfter fra SV"\n• "Hva lover partiene om helse?"`
      return Response.json({ response: svar, results: [] }, { headers: CORS })
    }

    // 2. Databasesøk med Postgres Full-Text Search (norsk konfigurasjon)
    let q = supabase.from("valgløfte").select("lofte_id, tekst, kategori, parti")
    if (parti) q = q.eq("parti", parti)
    if (query) {
      q = q.textSearch("tekst", query, {
        type: "websearch",
        config: "norwegian",
      })
    }
    const { data, error: dbErr } = await q

    if (dbErr) {
      console.error("DB:", dbErr.message)
      const feil = lang === "en" ? "Database error, try again." : "Databasefeil, prøv igjen."
      return Response.json({ response: feil, results: [] }, { status: 500, headers: CORS })
    }

    // 3. Ranger og filtrer nulltreff
    const results = (data ?? [])
      .map(r => {
        const score = scoreResult(r.tekst, r.kategori, keywords, query)
        return { ...r, _s: score > 0 ? score : 1 }
      })
      .sort((a, b) => b._s - a._s)
      .map(({ _s: _, ...rest }) => rest)

    // 4. Ingen relevante treff
    if (results.length === 0) {
      const svar = lang === "en"
        ? `No relevant pledges found for "${query}".\n\nTip: Try a more specific topic, or combine party and theme — e.g. "What does H promise on school?"`
        : `Fant ingen relevante løfter for "${query}".\n\nTips: Prøv et mer spesifikt emne, eller kombiner parti og tema — f.eks. "Hva lover Høyre om skole?"`
      return Response.json({ response: svar, results: [] }, { headers: CORS })
    }

    // 5. Claude genererer naturlig svar
    const claudeSvar = await genererSvar(query, lang, results)

    return Response.json({ response: claudeSvar, results }, { headers: CORS })

  } catch (err) {
    console.error("Edge function:", err)
    const feil = "Noe gikk galt. Prøv igjen."
    return Response.json({ response: feil, results: [] }, { status: 500, headers: CORS })
  }
})
