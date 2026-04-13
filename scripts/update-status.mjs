/**
 * update-status.mjs
 *
 * Bestemmer status på lofte_sak basert på faktisk voteringsdata
 * fra Stortingets åpne API — ingen AI-tolkning av status.
 *
 * VIKTIG: Sjekker kun AGDERBENKENS representanters stemmer — ikke hele partiet.
 * Henter Agder-representantene live fra /dagensrepresentanter ved oppstart,
 * og bruker person-ID (ikke parti-ID) ved oppslag i voteringsresultat.
 *
 * Logikk:
 *   Agder-repr stemte FOR majoriteten av voteringer på saken → fulfilled
 *   Agder-repr stemte MOT majoriteten                        → broken
 *   Ingen voteringsdata funnet                               → pending (uendret)
 *   Blandet (noen for, noen mot)                             → partial
 *
 * Kjør: node scripts/update-status.mjs
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"

// ── Last .env ────────────────────────────────────────────────────────────────
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
loadEnv(new URL("../.env.local", import.meta.url).pathname)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const BASE = "https://data.stortinget.no/eksport"

// ── Hent Agder-representantene live ──────────────────────────────────────────
// Returnerer en map: partiNavn (fullt) → [personId, personId, …]
// Vi bruker fullt partinavn fra API-et og matcher mot forkortelsekartet nedenfor.
const PARTI_NAVN_MAP = {
  "Arbeiderpartiet":           "Ap",
  "Høyre":                     "H",
  "Fremskrittspartiet":        "FrP",
  "Senterpartiet":             "Sp",
  "Sosialistisk Venstreparti": "SV",
  "Venstre":                   "V",
  "Kristelig Folkeparti":      "KrF",
  "Rødt":                      "R",
  "Miljøpartiet De Grønne":    "MDG",
}

async function fetchAgderRepresentanter() {
  console.log("🗺️  Henter Agder-representanter fra Stortingets API…")
  const xml = await fetchWithRetry(`${BASE}/dagensrepresentanter`)
  if (!xml) {
    console.error("❌ Klarte ikke hente representanter — avslutter")
    process.exit(1)
  }

  // Finn alle representant-noder
  const reprBlocks = extractAll(xml, "dagensrepresentant")

  // Bygg parti → [personId] for kun Agder-representanter
  const map = {}   // forkortelse → Set av personId-er

  for (const block of reprBlocks) {
    // Fylke kan ligge i <fylke><navn> eller <valgdistrikt><navn>
    const fylkeBlock = block.match(/<fylke>([\s\S]*?)<\/fylke>/)
    const valgBlock  = block.match(/<valgdistrikt>([\s\S]*?)<\/valgdistrikt>/)
    const fylkeNavn  = (fylkeBlock ? extractTag(fylkeBlock[0], "navn") : "")
                    || (valgBlock  ? extractTag(valgBlock[0],  "navn") : "")

    const normalFylke = fylkeNavn.toLowerCase().replace(/\s+/g, "")
    const erAgder = normalFylke.includes("agder")
    if (!erAgder) continue

    const personId  = extractTag(block, "id")
    const partiBlock = block.match(/<parti>([\s\S]*?)<\/parti>/)
    const partiNavn  = partiBlock ? extractTag(partiBlock[0], "navn") : ""
    const forkortelse = PARTI_NAVN_MAP[partiNavn] ?? partiNavn

    if (!personId || !forkortelse) continue

    if (!map[forkortelse]) map[forkortelse] = new Set()
    map[forkortelse].add(personId)
  }

  // Konverter Set → array
  const result = {}
  for (const [k, v] of Object.entries(map)) result[k] = [...v]

  const total = Object.values(result).flat().length
  console.log(`✅ Fant ${total} Agder-representanter fordelt på ${Object.keys(result).length} partier`)
  for (const [parti, ids] of Object.entries(result)) {
    console.log(`   ${parti}: ${ids.join(", ")}`)
  }
  console.log()
  return result
}

// ── XML-hjelper ───────────────────────────────────────────────────────────────
function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`))
  return m ? m[1].trim() : ""
}

function extractAll(xml, tag) {
  const re = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, "g")
  return [...xml.matchAll(re)].map((m) => m[0])
}

// ── Fetch med retry ved rate limit ───────────────────────────────────────────
async function fetchWithRetry(url, retries = 4) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      const xml = await res.text()
      if (xml.includes("grensen for antall spørringer")) {
        const wait = (i + 1) * 4000
        process.stdout.write(` [rate limit, venter ${wait / 1000}s]`)
        await new Promise((r) => setTimeout(r, wait))
        continue
      }
      return xml
    } catch (err) {
      if (i < retries - 1) {
        const wait = (i + 1) * 2000
        process.stdout.write(` [nettverksfeil, retry ${i + 1}]`)
        await new Promise((r) => setTimeout(r, wait))
      }
    }
  }
  return ""
}

// ── Hent voteringer for en sak ────────────────────────────────────────────────
async function fetchVoteringerForSak(sakId) {
  const xml = await fetchWithRetry(`${BASE}/voteringer?sakid=${sakId}`)
  if (!xml) return []

  return extractAll(xml, "sak_votering").map((block) => ({
    id: extractTag(block, "votering_id"),
    vedtatt: extractTag(block, "vedtatt"),
    antallFor: extractTag(block, "antall_for"),
  })).filter((v) => v.id && v.antallFor !== "-1") // hopp over saker uten reelle tall
}

// ── Hent Agder-representantenes stemmer i en votering ────────────────────────
// personIds: array av Stortinget person-ID-er for Agder-repr. fra dette partiet
async function fetchAgderStemmer(voteringId, personIds) {
  const xml = await fetchWithRetry(`${BASE}/voteringsresultat?voteringid=${voteringId}`)
  if (!xml) return null

  const representanter = extractAll(xml, "representant_voteringsresultat")

  let for_ = 0
  let mot = 0
  let fravaer = 0

  for (const block of representanter) {
    // Person-ID ligger direkte i <id> på representantnivå
    const personId = extractTag(block, "id")
    if (!personIds.includes(personId)) continue

    const stemme = extractTag(block, "votering").toLowerCase()
    if (stemme === "for") for_++
    else if (stemme === "mot") mot++
    else fravaer++
  }

  return { for: for_, mot, fravaer }
}

// ── Bestem status fra stemmer ─────────────────────────────────────────────────
function bestemStatus(stemmeResultater) {
  // stemmeResultater: array av { for, mot, fravaer } per votering
  if (stemmeResultater.length === 0) return null // ingen voteringsdata

  let totalFor = 0
  let totalMot = 0

  for (const r of stemmeResultater) {
    if (r.for > r.mot) totalFor++
    else if (r.mot > r.for) totalMot++
  }

  if (totalFor > 0 && totalMot === 0) return "fulfilled"
  if (totalMot > 0 && totalFor === 0) return "broken"
  if (totalFor > 0 && totalMot > 0) return "partial"
  return null
}

// ── Hent partiets kode fra lofte_id ──────────────────────────────────────────
async function fetchPartiForLofte(lofteId) {
  const { data } = await supabase
    .from("valgløfte")
    .select("parti")
    .eq("lofte_id", lofteId)
    .single()
  return data?.parti ?? null
}

// ── Hovedfunksjon ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🗳️  Starter statusoppdatering fra voteringsdata…\n")

  // Hent Agder-representantene live fra Stortinget
  const agderRepr = await fetchAgderRepresentanter()

  // Hent alle lofte_sak-koblinger
  const { data: koblinger, error } = await supabase
    .from("lofte_sak")
    .select("lofte_id, sak_id, sak_tittel, status")

  if (error) {
    console.error("Supabase feil:", error.message)
    process.exit(1)
  }

  console.log(`📋 ${koblinger.length} koblinger funnet\n`)

  let oppdatert = 0
  let uendret = 0
  let ingenData = 0
  let ingenRepr = 0

  // Cache parti per lofte_id
  const partiCache = {}

  for (let i = 0; i < koblinger.length; i++) {
    const k = koblinger[i]
    process.stdout.write(`[${i + 1}/${koblinger.length}] Sak ${k.sak_id}… `)

    // Hent parti
    if (!partiCache[k.lofte_id]) {
      partiCache[k.lofte_id] = await fetchPartiForLofte(k.lofte_id)
    }
    const parti = partiCache[k.lofte_id]

    if (!parti) {
      console.log("⚠️  Fant ikke parti")
      continue
    }

    // Sjekk om dette partiet har Agder-representanter
    const personIds = agderRepr[parti] ?? []
    if (personIds.length === 0) {
      console.log(`⚠️  Ingen Agder-repr for ${parti} — hopper over`)
      ingenRepr++
      continue
    }

    // Hent voteringer for saken
    const voteringer = await fetchVoteringerForSak(k.sak_id)

    if (voteringer.length === 0) {
      console.log("ingen voteringer")
      ingenData++
      continue
    }

    // Hent Agder-representantenes stemmer for hver votering
    const stemmeResultater = []
    for (const v of voteringer) {
      const stemmer = await fetchAgderStemmer(v.id, personIds)
      if (stemmer && (stemmer.for + stemmer.mot + stemmer.fravaer) > 0) {
        stemmeResultater.push(stemmer)
      }
      await new Promise((r) => setTimeout(r, 600))
    }

    const nyStatus = bestemStatus(stemmeResultater)

    if (!nyStatus) {
      console.log("ingen stemmedata for partiet")
      ingenData++
      continue
    }

    if (nyStatus === k.status) {
      console.log(`uendret (${nyStatus})`)
      uendret++
      continue
    }

    // Oppdater i Supabase
    const { error: updErr } = await supabase
      .from("lofte_sak")
      .update({ status: nyStatus })
      .eq("lofte_id", k.lofte_id)
      .eq("sak_id", k.sak_id)

    if (updErr) {
      console.log(`⚠️  Feil: ${updErr.message}`)
    } else {
      console.log(`✅ ${k.status} → ${nyStatus}`)
      oppdatert++
    }

    await new Promise((r) => setTimeout(r, 800))
  }

  console.log(`
📊 Resultat:
   Oppdatert:         ${oppdatert}
   Uendret:           ${uendret}
   Ingen voteringsdata: ${ingenData}
   Ingen Agder-repr:  ${ingenRepr}
  `)
  console.log("ℹ️  Status er basert på Agderbenkens egne representanters stemmer — ikke hele partiet.")
}

main().catch((err) => {
  console.error("Fatal feil:", err)
  process.exit(1)
})
