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
// ── Partinavn-gjenkjenning ────────────────────────────────────────────────────
// Alle nøkler er lowercase. Verdiene er forkortelsene lagret i DB.
// DB-verdier bekreftet fra extract-promises.mjs: Ap, H, FrP, Sp, SV, V, KrF, R, MDG
const PARTI_ALIAS: Record<string, string> = {
  // Arbeiderpartiet
  ap: "Ap", "a-p": "Ap", arbeiderpartiet: "Ap", arbeiderp: "Ap",
  arbeider: "Ap", arbeiderne: "Ap", arbp: "Ap", apb: "Ap",
  arbeidspartiet: "Ap",  // vanlig feilstaving
  sosialdemokratene: "Ap", "den røde tråden": "Ap",

  // Høyre
  h: "H", høyre: "H", hoyre: "H", høyere: "H",
  hoyer: "H", hyre: "H", hoyere: "H", høy: "H",
  konservative: "H",

  // Fremskrittspartiet
  frp: "FrP", "frp.": "FrP", fremskrittspartiet: "FrP",
  fremskritt: "FrP", fremskritts: "FrP", fremskrittspart: "FrP",
  "fr.p": "FrP", frps: "FrP",
  populistene: "FrP", progress: "FrP",

  // Senterpartiet
  sp: "Sp", senterpartiet: "Sp", senter: "Sp",
  senterp: "Sp", "s.p": "Sp", sps: "Sp",
  bondelaget: "Sp", distrikt: "Sp",

  // Sosialistisk Venstreparti
  sv: "SV", sosialistisk: "SV", sosialistiskvenstreparti: "SV",
  venstreparti: "SV", venstresiden: "SV", svp: "SV",
  sosialister: "SV",

  // Venstre
  v: "V", venstre: "V", venst: "V", venstres: "V",
  liberale: "V", liberalerne: "V",

  // Kristelig Folkeparti
  krf: "KrF", "kr.f": "KrF", kristelig: "KrF",
  kristeligfolkeparti: "KrF", krfs: "KrF",
  kristendemokratene: "KrF", kd: "KrF",
  folkeparti: "KrF",

  // Rødt
  r: "R", rødt: "R", rodt: "R", rød: "R",
  "rødt!": "R", rødes: "R", radikale: "R",
  kommunister: "R", revolusjonære: "R",

  // Miljøpartiet De Grønne
  mdg: "MDG", grønne: "MDG", grone: "MDG", gronn: "MDG",
  grønn: "MDG", miljøpartiet: "MDG", miljopartiet: "MDG",
  "de grønne": "MDG", miljø: "MDG", miljo: "MDG",
  mdgs: "MDG", grønnes: "MDG",
}

// ── Stoppord ──────────────────────────────────────────────────────────────────
const STOPPORD = new Set([
  "hva", "hvem", "hvilke", "hvilken", "hvilkett", "hvis", "hvor", "hvordan", "hvorfor",
  "sier", "sagt", "mener", "ment", "synes", "syntes", "tenker", "tenkt", "tror", "trodd",
  "gjør", "gjøre", "gjort", "får", "få", "fått", "tar", "ta", "tatt", "gir", "gi", "gitt",
  "lover", "lovet", "loves", "løfte", "løfter", "program", "partiprogram", "valgløfte", "valgløfter",
  "om", "for", "og", "er", "har", "hadde", "de", "den", "det", "en", "et", "i", "til", "fra", "med",
  "på", "av", "som", "ikke", "kan", "kunne", "vil", "ville", "skal", "skulle", "bør", "burde", "må", "måtte",
  "meg", "deg", "seg", "sin", "sitt", "sine", "min", "mitt", "mine", "din", "ditt", "dine",
  "vår", "vårt", "våre", "deres", "hans", "hennes",
  "disse", "dem", "denne", "dette", "her", "der",
  "forskjell", "forskjellen", "mellom", "forklare", "forklaring", "definer", "definerer",
  "hjelp", "svar", "fortell", "beskriv", "vis", "finn", "søk", "søker", "spør", "spørsmål",
  "politikk", "parti", "partiene", "partiet", "partier", "angående", "vedrørende", "omkring", "rundt",
  "mer", "mest", "mindre", "minst", "bedre", "best", "dårligere", "dårligst", "god", "gode", "godt",
  "større", "størst", "flere", "flest", "mye", "mange", "færre", "færrest",
  "norge", "norsk", "norske", "land", "landet", "nasjonal", "nasjonalt",
  "ny", "nye", "nytt", "særlig", "spesielt", "helt", "ganske", "veldig", "ekstra",
])

// ── Engelsk → Norsk nøkkelord-mapping ────────────────────────────────────────
const EN_TO_NO: Record<string, string[]> = {
  // Generelle politiske ord (filtreres bort)
  what: [], does: [], do: [], promise: [], promises: [], pledge: [], pledges: [],
  parties: [], party: [], about: [], say: [], want: [], plan: [], plans: [],
  // Politiske emner
  tax: ["skatt", "avgift"], taxes: ["skatt", "avgifter"],
  health: ["helse", "sykehus"], healthcare: ["helse", "sykehus", "fastlege"],
  climate: ["klima", "miljø"], environment: ["miljø", "natur", "klima"],
  school: ["skole", "utdanning"], education: ["utdanning", "skole"],
  housing: ["bolig", "husleie"], rent: ["husleie", "leie"],
  welfare: ["velferd", "trygd"], pension: ["pensjon", "alderspensjon"],
  immigration: ["innvandring", "asyl", "flyktning"],
  asylum: ["asyl", "flyktning"], refugee: ["flyktning"],
  defense: ["forsvar", "militær", "nato"], military: ["militær", "forsvar"],
  nato: ["nato"], security: ["beredskap", "forsvar"],
  energy: ["energi", "strøm", "fornybar"], electricity: ["strøm", "energi"],
  renewable: ["fornybar", "energi"],
  work: ["arbeid", "jobb"], jobs: ["arbeid", "arbeidsplasser"],
  unemployment: ["nav", "permittering"], economy: ["økonomi", "budsjett"],
  traffic: ["samferdsel", "vei", "jernbane"], transport: ["samferdsel", "tog", "buss"],
  train: ["tog", "jernbane"], road: ["vei", "samferdsel"],
  children: ["barn", "familie"], elderly: ["eldre", "pensjon"],
  youth: ["ungdom"], family: ["familie", "barn"],
  digital: ["digitalisering", "teknologi"], technology: ["teknologi", "innovasjon"],
  police: ["politi", "kriminalitet"], crime: ["kriminalitet", "justis"],
  agriculture: ["landbruk"], farming: ["landbruk"],
  fishing: ["fisk"], fish: ["fisk"],
  oil: ["olje", "gass"], gas: ["gass", "olje"],
  nature: ["natur", "miljø"], forest: ["natur"],
  poverty: ["fattigdom", "sosial"],
  democracy: ["demokrati"],
  innovation: ["innovasjon", "gründer"],
  district: ["distrikt", "kommune"],
  municipality: ["kommune", "distrikt"],
}

// Oversett engelske nøkkelord til norsk for DB-søk
function translateKeywords(keywords: string[], lang: string): string[] {
  if (lang !== "en") return keywords
  const result = new Set<string>()
  for (const k of keywords) {
    const lower = k.toLowerCase()
    if (Object.prototype.hasOwnProperty.call(EN_TO_NO, lower)) {
      // Kjent engelsk ord: bruk norske oversettelser (tomt array = filtrer bort)
      EN_TO_NO[lower].forEach(t => result.add(t))
    } else {
      // Ukjent ord: behold (kan være norsk, egennavn, osv.)
      result.add(k)
    }
  }
  return [...result]
}

// ── Åpenbart ikke-politiske mønstre ──────────────────────────────────────────
// Kun brukt til å fange spørsmål som åpenbart ikke handler om partiprogrammer.
// Listen skal være KORT og PRESIS — tvilstilfeller skal slippe gjennom.
const IKKE_POLITISK = new Set([
  "vær", "været", "temperatur", "regn", "sol", "vind", "snø",
  "fotball", "sport", "kamp", "film", "musikk", "sang", "oppskrift",
  "matoppskrift", "middag", "frokost", "lunsj",
  "hei", "heisann", "hallo", "god", "morgen", "kveld",
  "vits", "spøk", "humor", "joke",
  "hva", "hvem", "hvordan", "hvorfor",  // bare disse alene, filtreres av stoppord anyway
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

// Ny logikk: tillat ALT med minst ett meningsbærende ord.
// "Friluftsbåter", "elsparkesykkel", "barnetrygd" — alt er lov å søke på.
// La databasen avgjøre om det finnes treff. Bare avvis helt tomme spørsmål
// eller de som åpenbart ikke handler om politikk (vær, mat, sport...).
function erPolitisk(keywords: string[], parti: string | null): boolean {
  if (parti) return true
  if (keywords.length === 0) return false
  // Avvis bare hvis ALLE meningsbærende ord er åpenbart upolitiske
  const alleUpolitisk = keywords.every(k => IKKE_POLITISK.has(k))
  return !alleUpolitisk
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

// ── Fallback-svar uten AI ─────────────────────────────────────────────────────
// Brukes når Claude-API-kreditter er tomme eller et annet API-problem oppstår.
function fallbackSvar(
  query: string,
  lang: string,
  løfter: { tekst: string; kategori: string | null; parti: string }[]
): string {
  const top = løfter.slice(0, 50)
  if (top.length === 0) {
    return lang === "en"
      ? `No pledges found for "${query}".`
      : `Ingen løfter funnet for «${query}».`
  }

  // Grupper etter parti
  const byParti: Record<string, string[]> = {}
  for (const l of top) {
    if (!byParti[l.parti]) byParti[l.parti] = []
    byParti[l.parti].push(l.tekst.length > 160 ? l.tekst.slice(0, 157) + "…" : l.tekst)
  }

  const intro = lang === "en"
    ? `Here are the most relevant party pledges found for your query:`
    : `Her er de mest relevante valgløftene funnet for spørsmålet ditt:`

  const body = Object.entries(byParti)
    .map(([parti, tekster]) => `**${parti}:** ${tekster[0]}`)
    .join("\n\n")

  return `${intro}\n\n${body}`
}

// ── Claude-svar ───────────────────────────────────────────────────────────────
async function genererSvar(
  query: string,
  lang: string,
  løfter: { tekst: string; kategori: string | null; parti: string }[]
): Promise<string> {
  // Send så mange løfter som mulig til Claude (begrenset av kontekstvinduet)
  const top = løfter.slice(0, 300)
  const ctx = top
    .map(l => `[${l.parti}${l.kategori ? ` – ${l.kategori}` : ""}] "${l.tekst}"`)
    .join("\n")

  const system = lang === "en"
    ? `You are a factual assistant for Sørblikket, a Norwegian political transparency tool.
Answer questions about Norwegian party programs 2025–2029.
Rules:
- Answer ONLY based on the party pledges provided. Never invent information.
- Pick the TOP 5 most important pledges maximum — ignore the rest.
- Use short bullet points (•). Each bullet: max 8 words.
- Rank by most relevant to the question first.
- One section per party. Drop parties with no relevant pledges.
- No intro, no conclusion, no dashes between items.
- Answer in English.`
    : `Du er en faktabasert assistent for Sørblikket, et verktøy for politisk innsyn.
Du svarer på spørsmål om norske partiers valgløfter 2025–2029.
Regler:
- Svar KUN basert på løftene nedenfor. Finn aldri opp informasjon.
- Velg MAKS 5 av de viktigste løftene — ignorer resten.
- Bruk korte kulepunkter (•). Hvert punkt: maks 8 ord.
- Ranger etter mest relevant for spørsmålet øverst.
- Én seksjon per parti. Utelat partier uten relevante løfter.
- Ingen innledning, ingen konklusjon, ingen tankestreker mellom punkter.
- Svar på norsk.`

  const user = lang === "en"
    ? `User question: "${query}"\n\nRelevant party pledges:\n${ctx}`
    : `Brukerens spørsmål: "${query}"\n\nRelevante valgløfter:\n${ctx}`

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
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

    // 1. Sjekk at spørsmålet har meningsbærende innhold
    if (!erPolitisk(keywords, parti)) {
      const svar = lang === "en"
        ? `Try asking about a specific topic — for example:\n• "What does FrP promise on taxes?"\n• "Climate pledges from SV"\n• "What do parties promise on leisure boats?"\n• "What does Høyre say about schools?"`
        : `Prøv å spørre om et konkret tema — for eksempel:\n• "Hva lover FrP om skatter?"\n• "Klima-løfter fra SV"\n• "Hva sier partiene om friluftsbåter?"\n• "Hva lover Høyre om skole?"`
      return Response.json({ response: svar, results: [] }, { headers: CORS })
    }

    // 2. Databasesøk
    // Strategi A: Parti oppgitt → hent alle løfter fra dette partiet (la Claude+scoring finne emnet)
    // Strategi B: Ingen parti → tekstsøk med norske nøkkelord
    let rawData: { lofte_id: number; tekst: string; kategori: string | null; parti: string }[] = []

    if (parti) {
      // Hent ALLE løfter fra partiet — ingen grense (maks ~759 per parti)
      const { data, error: dbErr } = await supabase
        .from("valgløfte")
        .select("lofte_id, tekst, kategori, parti")
        .ilike("parti", parti)
        .limit(10000)

      if (dbErr) {
        console.error("DB (parti):", dbErr.message)
        const feil = lang === "en" ? "Database error, try again." : "Databasefeil, prøv igjen."
        return Response.json({ response: feil, results: [] }, { status: 500, headers: CORS })
      }
      rawData = data ?? []
    } else {
      const dbKeywords = translateKeywords(keywords, lang)

      if (dbKeywords.length === 0) {
        const svar = lang === "en"
          ? `Couldn't find relevant pledges for "${query}". Try specifying a party or topic — e.g. "What does H promise on school?"`
          : `Fant ingen relevante løfter for "${query}". Prøv å spesifisere parti eller tema — f.eks. "Hva lover Høyre om skole?"`
        return Response.json({ response: svar, results: [] }, { headers: CORS })
      }

      // Primærstrategi: full-tekst søk (ingen limit — hent alt som matcher)
      const sokeord = dbKeywords.join(" | ")
      const { data: tsData, error: tsErr } = await supabase
        .from("valgløfte")
        .select("lofte_id, tekst, kategori, parti")
        .textSearch("tekst", sokeord, { type: "websearch", config: "norwegian" })
        .limit(10000)

      if (tsErr) {
        console.error("DB (textSearch):", tsErr.message)
      }

      rawData = tsData ?? []

      // Supplerende ilike-søk — fanger sammensatte ord som "skattelette", "klimamål" o.l.
      const ilikeFilter = dbKeywords
        .flatMap(kw => [`tekst.ilike.*${kw}*`, `kategori.ilike.*${kw}*`])
        .join(",")

      const { data: ilikeData } = await supabase
        .from("valgløfte")
        .select("lofte_id, tekst, kategori, parti")
        .or(ilikeFilter)
        .limit(10000)

      // Slå sammen og dedupliser på lofte_id
      if (ilikeData && ilikeData.length > 0) {
        const seen = new Set(rawData.map(r => r.lofte_id))
        for (const r of ilikeData) {
          if (!seen.has(r.lofte_id)) {
            rawData.push(r)
            seen.add(r.lofte_id)
          }
        }
      }

      // Siste utvei: ingenting funnet — søk bredt i hele databasen
      if (rawData.length === 0) {
        const { data: broadData } = await supabase
          .from("valgløfte")
          .select("lofte_id, tekst, kategori, parti")
          .limit(10000)
        rawData = broadData ?? []
      }
    }

    // 3. Ranger resultater med scoring
    // Bygg norske søkeord for scoring (oversett om engelske)
    const scoreKeywords = translateKeywords(keywords, lang)

    const results = rawData
      .map(r => {
        const score = scoreResult(r.tekst, r.kategori, scoreKeywords, query)
        return { ...r, _s: parti ? Math.max(score, 1) : score }
      })
      .filter(r => r._s > 0)
      .sort((a, b) => b._s - a._s)
      .map(({ _s: _, ...rest }) => rest)

    // 4. Ingen relevante treff
    if (results.length === 0) {
      const svar = lang === "en"
        ? `No relevant pledges found for "${query}".\n\nTip: Try a more specific topic, or combine party and theme — e.g. "What does H promise on school?"`
        : `Fant ingen relevante løfter for "${query}".\n\nTips: Prøv et mer spesifikt emne, eller kombiner parti og tema — f.eks. "Hva lover Høyre om skole?"`
      return Response.json({ response: svar, results: [] }, { headers: CORS })
    }

    // 5. Claude genererer naturlig svar — med fallback hvis API-kreditter er tomme
    let claudeSvar: string
    try {
      claudeSvar = await genererSvar(query, lang, results)
    } catch (aiErr: any) {
      console.error("Claude API:", aiErr?.message ?? aiErr)
      // Fallback: returner strukturert svar uten AI
      claudeSvar = fallbackSvar(query, lang, results)
    }

    return Response.json({ response: claudeSvar, results }, { headers: CORS })

  } catch (err: any) {
    console.error("Edge function crash:", err?.message ?? err)
    const feil = lang === "no"
      ? "Noe gikk galt på serveren. Prøv igjen om litt."
      : "Server error. Please try again shortly."
    return Response.json({ response: feil, results: [] }, { status: 500, headers: CORS })
  }
})
