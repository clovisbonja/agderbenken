/**
 * match-promises.mjs (v3)
 *
 * Forbedringer fra v2:
 *   1. Parser <dokumentgruppe> → Claude vet om saken er representantforslag,
 *      proposisjon, melding osv. (viktig for å vurdere hvem som fremmet hva)
 *   2. Partirolle-bevissthet:
 *      - Ap (regjering): matcher mot regjeringens plan for Norge 2025-29 + saker
 *      - Sp, SV, R, MDG (støttepartier): matcher mot saker + merket som støtteparti
 *      - H, FrP, V, KrF (opposisjon): fokus på representantforslag de selv fremmet
 *   3. Henter "Regjeringens plan for Norge" (regjeringens-plan-for-norge.pdf)
 *      og bruker det som ekstra kontekst for Ap-løfter
 *   4. Beholder alle v2-forbedringer (kategorifiltrering, Lovdata, emner, max_tokens)
 *
 * Kjør: node scripts/match-promises.mjs
 *
 * Krever .env med:
 *   ANTHROPIC_API_KEY=sk-ant-...
 *   VITE_SUPABASE_URL=https://...supabase.co
 *   SUPABASE_SERVICE_KEY=eyJ...
 *   LOVDATA_API_KEY=...  (valgfri)
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

// ── Last .env ─────────────────────────────────────────────────────────────────
function loadEnv(path) {
  try {
    readFileSync(path, "utf8")
      .split("\n")
      .forEach((line) => {
        const eq = line.indexOf("=")
        if (eq < 1 || line.startsWith("#")) return
        const key = line.slice(0, eq).trim()
        const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "")
        if (!process.env[key]) process.env[key] = val
      })
  } catch {}
}
loadEnv(new URL("../my-app/.env.local", import.meta.url).pathname)
loadEnv(new URL("../my-app/.env", import.meta.url).pathname)
loadEnv(new URL("../.env.local", import.meta.url).pathname)
loadEnv(new URL("../.env", import.meta.url).pathname)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const LOVDATA_KEY  = process.env.LOVDATA_API_KEY

if (!SUPABASE_URL || !SUPABASE_KEY || !ANTHROPIC_KEY) {
  console.error("Mangler env-variabler. Sjekk .env.local / .env")
  process.exit(1)
}
if (!LOVDATA_KEY) console.warn("⚠️  LOVDATA_API_KEY ikke satt — Lovdata-søk deaktivert\n")

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

// ── Partiroller (etter valget 2025) ──────────────────────────────────────────
// Ap vant valget og leder mindretallsregjering.
// Sp, SV, R, MDG gir parlamentarisk støtte (ikke i regjering).
// H, FrP, V, KrF er i opposisjon.
const PARTI_ROLLE = {
  Ap:  "regjering",
  Sp:  "støtteparti",
  SV:  "støtteparti",
  R:   "støtteparti",
  MDG: "støtteparti",
  H:   "opposisjon",
  FrP: "opposisjon",
  V:   "opposisjon",
  KrF: "opposisjon",
}

// ── Kategori → nøkkelord ──────────────────────────────────────────────────────
const KATEGORI_NOKKELORD = {
  Klima:       ["klima", "miljø", "utslipp", "co2", "natur", "skog", "forurensing",
                 "grønn", "fossil", "fornybar", "energi", "naturvern", "biodiversitet"],
  Helse:       ["helse", "sykehus", "legemiddel", "fastlege", "psykisk", "omsorg",
                 "medisin", "helsetjeneste", "pasient", "lege", "sykepleier", "rus"],
  Utdanning:   ["utdanning", "skole", "barnehage", "universitet", "høyskole",
                 "forskning", "studenter", "lærer", "elev", "opplæring", "fagskole"],
  Økonomi:     ["økonomi", "skatt", "avgift", "budsjett", "arbeid", "næring",
                 "trygd", "pensjon", "nav", "sysselsetting", "lønn", "bevilgning"],
  Samferdsel:  ["samferdsel", "vei", "jernbane", "tog", "buss", "kollektiv",
                 "ferje", "bro", "tunnel", "transport", "trafikk", "sykkel", "luftfart"],
  Justis:      ["justis", "politi", "domstol", "kriminalitet", "rettsvesen",
                 "fengsel", "lovgivning", "straff", "lov ", "juridisk"],
  Distrikt:    ["distrikt", "landbruk", "fiskeri", "bygd", "kommune", "regional",
                 "rural", "jordbruk", "havbruk", "kyst", "matproduksjon"],
  Familie:     ["familie", "barn", "foreldre", "barnetrygd", "foreldrepermisjon",
                 "barnevern", "kontantstøtte", "adopsjon"],
  Innvandring: ["innvandring", "asyl", "flyktning", "integrering", "utlending", "migrasjon"],
  Næring:      ["næring", "bedrift", "industri", "handel", "eksport", "innovasjon",
                 "gründer", "reiseliv", "maritim"],
  Bistand:     ["bistand", "utenriks", "utvikling", "humanitær", "u-hjelp", "diplomati"],
  Sosial:      ["sosial", "fattigdom", "velferd", "stønad", "ulikhet", "sosialhjelp"],
  Landbruk:    ["landbruk", "jordbruk", "matproduksjon", "bonde", "gård"],
}

// ── XML-hjelpere ──────────────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? m[1].trim() : ""
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "g")
  return [...xml.matchAll(re)].map((m) => m[0])
}

// ── Hent saker fra Stortinget (med emner og dokumentgruppe) ──────────────────
async function fetchSaker(sesjon) {
  console.log(`  Henter saker for sesjon ${sesjon}…`)
  const url = `https://data.stortinget.no/eksport/saker?sesjonid=${sesjon}&antall=500&start=0`
  const res = await fetch(url)
  const xml = await res.text()

  const listeMatch = xml.match(/<saker_liste>([\s\S]*?)<\/saker_liste>/)
  if (!listeMatch) return []

  const saker = listeMatch[1]
    .split(/<sak>/)
    .slice(1)
    .map((block) => {
      const emneNavn = extractAll(block, "emne")
        .map((e) => extractTag(e, "navn"))
        .filter(Boolean)
        .join(", ")
        .toLowerCase()

      // Hvem fremmet saken? (forslagstiller_liste)
      const forslagsstillere = extractAll(block, "representant")
        .map((r) => extractTag(r, "id"))
        .filter(Boolean)
        .join(", ")

      return {
        id:             extractTag(block, "sak_fremmet_id"),
        tittel:         extractTag(block, "tittel") || extractTag(block, "korttittel"),
        korttittel:     extractTag(block, "korttittel"),
        emner:          emneNavn,
        dokumentgruppe: extractTag(block, "dokumentgruppe"), // proposisjon, representantforslag, melding, osv.
        forslagsstillere,
        sesjon,
      }
    })
    .filter((s) => s.id && s.tittel)

  // Tell typer
  const typer = {}
  saker.forEach(s => { typer[s.dokumentgruppe] = (typer[s.dokumentgruppe] || 0) + 1 })
  const typeSummary = Object.entries(typer).map(([k,v]) => `${k}:${v}`).join(", ")
  console.log(`  → ${saker.length} saker (${typeSummary})`)
  return saker
}

// ── Hent regjeringens plan som tekst (for Ap-løfter) ─────────────────────────
// "Regjeringens plan for Norge 2025–29" — Ap mindretallsregjering
async function fetchRegjeringsplan() {
  const url = "https://www.regjeringen.no/no/om-regjeringa/noverande/regjeringens-plan-for-norge/id3142802/"
  try {
    console.log("  Henter regjeringens plan for Norge…")
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; research bot)" },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()

    // Strip HTML til ren tekst
    const tekst = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s{3,}/g, "\n")
      .trim()
      .slice(0, 15000) // Hold konteksten nede

    console.log(`  → Regjeringsplan hentet (${tekst.length} tegn)`)
    return tekst
  } catch (err) {
    console.warn(`  ⚠️  Klarte ikke hente regjeringsplan: ${err.message}`)
    return null
  }
}

// ── Filtrer saker per kategori + løftenøkkelord ───────────────────────────────
function filterSakerForKategori(saker, kategori, loefteTekst, parti) {
  const kategoriOrd = KATEGORI_NOKKELORD[kategori] || []
  const rolle = PARTI_ROLLE[parti] ?? "ukjent"

  const STOPPORD = new Set([
    "ville", "skulle", "kunne", "sikre", "styrke", "bedre", "ønsker",
    "arbeide", "bidra", "sørge", "legge", "gjøre", "norsk", "norske",
    "alle", "denne", "dette", "være", "innen", "etter",
  ])
  const loefteOrd = loefteTekst
    .toLowerCase()
    .replace(/[,.;:!?()«»]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 5 && !STOPPORD.has(w))
    .slice(0, 6)

  const alleOrd = [...new Set([...kategoriOrd, ...loefteOrd])]

  let kandidater = saker.filter((s) => {
    const tekst = `${s.tittel} ${s.emner}`.toLowerCase()
    return alleOrd.some((kw) => tekst.includes(kw))
  })

  // For opposisjonspartier: prioriter representantforslag (de har fremmet disse selv)
  if (rolle === "opposisjon") {
    const representantforslag = kandidater.filter(
      s => s.dokumentgruppe === "representantforslag"
    )
    // Legg representantforslag øverst
    const resten = kandidater.filter(s => s.dokumentgruppe !== "representantforslag")
    kandidater = [...representantforslag, ...resten]
  }

  return kandidater.length >= 15 ? kandidater : saker
}

// ── Lovdata-søk (valgfri) ─────────────────────────────────────────────────────
async function searchLovdata(loefteTekst, kategori) {
  if (!LOVDATA_KEY) return []

  const STOPPORD = new Set([
    "ville", "skal", "bør", "alle", "norsk", "norske", "sikre", "mer",
    "bedre", "gode", "dette", "innen", "etter", "være", "slik",
  ])
  const sokord = loefteTekst
    .toLowerCase()
    .replace(/[,.;:!?()«»]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 4 && !STOPPORD.has(w))
    .slice(0, 3)

  if (sokord.length === 0) return []

  const resultater = []
  for (const base of ["STV", "NL"]) {
    const params = new URLSearchParams({ base, fromDate: "2025-10-01" })
    sokord.forEach((ord, i) => params.set(`emne${i + 1}`, ord))
    try {
      const res = await fetch(`https://api.lovdata.no/v1/search?${params}`, {
        headers: { "X-API-Key": LOVDATA_KEY },
      })
      if (!res.ok) continue
      const data = await res.json()
      const hits = Array.isArray(data) ? data : (data.hits ?? data.results ?? data.dokumenter ?? [])
      hits.slice(0, 4).forEach((h) => {
        const tittel = h.tittel ?? h.title ?? h.navn ?? ""
        if (tittel) resultater.push({ tittel, type: base, dato: h.dato ?? h.date ?? "", ref: h.referanse ?? h.dokID ?? "" })
      })
    } catch {}
  }
  return resultater
}

// ── Hent løfter fra Supabase ──────────────────────────────────────────────────
async function fetchPromises() {
  const { data, error } = await supabase
    .from("valgløfte")
    .select("lofte_id, parti, tekst, kategori")
  if (error) throw new Error("Supabase feil: " + error.message)
  console.log(`  → ${data.length} løfter hentet fra Supabase`)
  return data
}

// ── Hent eksisterende koblinger ───────────────────────────────────────────────
async function fetchExisting() {
  const { data } = await supabase.from("lofte_sak").select("lofte_id, sak_id")
  return new Set((data ?? []).map((r) => `${r.lofte_id}|${r.sak_id}`))
}

// ── Claude: match løfter mot saker ────────────────────────────────────────────
async function matchWithClaude(promise, relevantSaker, lovdataHits, regjeringsplan) {
  const rolle = PARTI_ROLLE[promise.parti] ?? "ukjent"

  // Rollebeskrivelse til Claude
  const rolleKontekst = {
    regjering:    "REGJERINGSPARTI (Ap leder mindretallsregjeringen — kan gjennomføre løfter via proposisjoner og budsjett)",
    støtteparti:  "STØTTEPARTI (gir parlamentarisk støtte til Ap-regjeringen — kan påvirke via forhandlinger, men fremmer egne representantforslag for opposisjonssaker)",
    opposisjon:   "OPPOSISJON (H/FrP/V/KrF er i opposisjon — kan kun fremme representantforslag og stemme, ikke styre gjennom regjering)",
    ukjent:       "UKJENT ROLLE",
  }[rolle]

  // Saksliste med dokumentgruppe-type
  const sakerList = relevantSaker
    .map((s) => {
      const typeStr   = s.dokumentgruppe ? ` [${s.dokumentgruppe}]` : ""
      const emnerStr  = s.emner ? ` {${s.emner}}`  : ""
      const sesjonStr = ` (${s.sesjon})`
      return `${s.id}: ${s.tittel}${typeStr}${emnerStr}${sesjonStr}`
    })
    .join("\n")

  // Lovdata-avsnitt
  let lovdataAvsnitt = ""
  if (lovdataHits.length > 0) {
    lovdataAvsnitt = `\n\nLOVDATA-TREFF (lover/vedtak etter okt 2025):\n` +
      lovdataHits.map(h => `- ${h.tittel} [${h.type}${h.dato ? ", " + h.dato : ""}]`).join("\n")
  }

  // Regjeringsplan-avsnitt (kun for Ap og støttepartier)
  let regjeringAvsnitt = ""
  if (regjeringsplan && (rolle === "regjering" || rolle === "støtteparti")) {
    regjeringAvsnitt = `\n\nREGJERINGENS PLAN FOR NORGE 2025–29 (utdrag — relevant for å vurdere om løftet er i tråd med regjeringens prioriteringer):\n${regjeringsplan.slice(0, 4000)}`
  }

  const prompt = `Du er ekspert på norsk stortingspolitikk og partiprogram-analyse.

PARTILØFTE (${promise.parti}, ${rolleKontekst}):
Kategori: ${promise.kategori ?? "ukjent"}
Løfte: "${promise.tekst}"

VIKTIG KONTEKST:
- Dette er et løfte fra 2025–2029-programmet. Regjeringen startet oktober 2025.
- Det er tidlig i perioden — mange løfter vil naturlig ikke være behandlet ennå (bruk "pending").
- For opposisjonspartier: se spesielt etter representantforslag [representantforslag] de har fremmet.
- For regjerings-/støttepartier: sjekk om løftet er i tråd med regjeringens plan og proposisjoner.
${lovdataAvsnitt}
${regjeringAvsnitt}

STORTINGSSAKER (format: sak_id: tittel [dokumenttype] {fagkategorier} (sesjon)):
${sakerList}

Finn ALLE saker som har noen som helst relevans for dette løftet — direkte eller indirekte.
Vær inkluderende: ta med saker som berører samme tema, lovområde, budsjettpost eller politikkfelt.
Ingen øvre grense på antall treff.

Vurder status:
  "fulfilled" — saken er konkret bevis på at løftet ble fulgt opp
  "broken"    — saken tyder på at løftet ble aktivt brutt eller motarbeidet
  "partial"   — delvis relevant eller blandet utfall
  "pending"   — relatert sak, men utfall ikke avklart ennå

Svar KUN med gyldig JSON (ingen markdown):
[
  {
    "sak_id": "...",
    "sak_tittel": "...",
    "status": "fulfilled" | "broken" | "partial" | "pending",
    "notat": "Kort norsk forklaring (maks 120 tegn)"
  }
]

Returner [] kun hvis absolutt ingen saker har noen relevans.`

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  })

  const text = msg.content[0].text.trim()
  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\[[\s\S]*\]/)
    if (m) return JSON.parse(m[0])
    return []
  }
}

// ── Skriv koblinger til Supabase ──────────────────────────────────────────────
async function insertMatches(lofte_id, matches, existing) {
  const seen = new Set()
  const rows = matches
    .filter((m) => {
      const key = `${lofte_id}|${m.sak_id}`
      if (existing.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((m) => ({
      lofte_id,
      sak_id:     String(m.sak_id),
      sak_tittel: m.sak_tittel,
      status:     m.status,
      notat:      m.notat,
    }))

  if (rows.length === 0) return 0

  const { error } = await supabase
    .from("lofte_sak")
    .upsert(rows, { onConflict: "lofte_id,sak_id", ignoreDuplicates: true })

  if (error) {
    console.error("    Insert feil:", error.message)
    return 0
  }
  return rows.length
}

// ── Hovedfunksjon ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🔍 Starter løfte-matching (v3)…\n")

  console.log("📥 Henter data…")
  const [promises, existing, saker2526, saker2425, regjeringsplan] = await Promise.all([
    fetchPromises(),
    fetchExisting(),
    fetchSaker("2025-2026"),
    fetchSaker("2024-2025"),
    fetchRegjeringsplan(),
  ])

  const alleSaker = [...saker2526, ...saker2425]
  console.log(`  → Totalt ${alleSaker.length} saker\n`)

  if (regjeringsplan) {
    console.log("  ✅ Regjeringsplan lastet — brukes for Ap og støttepartier\n")
  }

  // Vis partifordeling
  const partier = [...new Set(promises.map(p => p.parti))]
  partier.forEach(parti => {
    const rolle = PARTI_ROLLE[parti] ?? "ukjent"
    const antall = promises.filter(p => p.parti === parti).length
    console.log(`  ${parti}: ${antall} løfter (${rolle})`)
  })
  console.log()

  let totalInserted = 0

  for (let i = 0; i < promises.length; i++) {
    const promise = promises[i]
    const rolle = PARTI_ROLLE[promise.parti] ?? "ukjent"
    console.log(`[${i + 1}/${promises.length}] ${promise.parti} (${rolle}) — "${promise.tekst.slice(0, 55)}…"`)

    try {
      const relevantSaker = alleSaker
      const rfCount = relevantSaker.filter(s => s.dokumentgruppe === "representantforslag").length
      console.log(`    → ${relevantSaker.length} saker totalt (${rfCount} representantforslag)`)

      const lovdataHits = await searchLovdata(promise.tekst, promise.kategori)
      if (lovdataHits.length > 0) {
        console.log(`    → ${lovdataHits.length} Lovdata-treff`)
      }

      const matches = await matchWithClaude(promise, relevantSaker, lovdataHits, regjeringsplan)
      console.log(`    Claude fant ${matches.length} treff`)

      const inserted = await insertMatches(promise.lofte_id, matches, existing)
      if (inserted > 0) {
        console.log(`    ✅ Satte inn ${inserted} nye koblinger`)
        totalInserted += inserted
        matches.forEach((m) => existing.add(`${promise.lofte_id}|${m.sak_id}`))
      }
    } catch (err) {
      console.error("    ⚠️  Feil:", err.message)
    }

    if (i < promises.length - 1) await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`\n✅ Ferdig! ${totalInserted} nye koblinger lagt til.`)
}

main().catch((err) => {
  console.error("Fatal feil:", err)
  process.exit(1)
})
