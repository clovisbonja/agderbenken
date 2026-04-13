/**
 * extract-agder-promises.mjs
 *
 * Henter skriftlige spørsmål fra Agder-representanter i stortingsperioden 2025-2029,
 * filtrerer på Agder-spesifikt innhold, og bruker Claude til å reformulere
 * dem som klare løfter/krav. Lagrer i Supabase-tabellen agder_lofte.
 *
 * Forutsetning: tabellen agder_lofte er opprettet (kjør agder-lofte-tabell.sql)
 *
 * Kjør: node scripts/extract-agder-promises.mjs
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

function loadEnv(path) {
  try {
    readFileSync(path, "utf8").split("\n").forEach((line) => {
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

const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Agder-representanter 2025-2029 ────────────────────────────────────────────
const AGDER_REPS = {
  ALFAND: { navn: "Alf Erik Andersen",        parti: "FrP" },
  AMAGUN: { navn: "Amalie Gunnufsen",          parti: "H"   },
  HSP:    { navn: "Haagen Poppe",              parti: "H"   },
  JLO:    { navn: "Jorunn Gleditsch Lossius",  parti: "KrF" },
  JRGKRI: { navn: "Jørgen H. Kristiansen",    parti: "KrF" },
  KOS:    { navn: "Kai Steffen Østensen",      parti: "A"   },
  MARNIL: { navn: "Marius Arion Nilsen",       parti: "FrP" },
  MIREHB: { navn: "Mirell Høyer-Berntsen",    parti: "SV"  },
  STISTO: { navn: "Stian Storbukås",           parti: "FrP" },
  TIM:    { navn: "Tellef Inge Mørland",       parti: "A"   },
}

// Agder-spesifikke nøkkelord for filtrering
const AGDER_KORD = [
  "agder", "kristiansand", "farsund", "mandal", "flekkefjord",
  "lindesnes", "lister", "sørlandet", "sørlandsbanen", "arendal",
  "grimstad", "lillesand", "risør", "tvedestrand", "aust-agder",
  "vest-agder", "otra", "bykle", "valle", "statsforvalteren i agder",
  "sørlandet sykehus", "uia ", "universitetet i agder",
]

const KATEGORIER = [
  "Klima", "Helse", "Utdanning", "Økonomi", "Samferdsel",
  "Justis", "Familie", "Bistand", "Distrikt", "Landbruk",
  "Innvandring", "Sosial", "Næring", "Annet",
]

// ── Hent spørsmål fra Stortingets API ─────────────────────────────────────────
async function hentSpørsmål(sesjonId) {
  const url = `https://data.stortinget.no/eksport/skriftligesporsmal?sesjonid=${sesjonId}&format=json`
  const res = await fetch(url, { headers: { "User-Agent": "Sørblikket research bot" } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const d = await res.json()
  return d.sporsmal_liste || []
}

// ── Filtrer på Agder-reps + Agder-nøkkelord ───────────────────────────────────
function filtrerAgder(spørsmål) {
  return spørsmål.filter((s) => {
    const fraId = s.sporsmal_fra?.id
    if (!AGDER_REPS[fraId]) return false
    const tekst = ((s.tittel || "") + " " + (s.sporsmal_tekst || "")).toLowerCase()
    return AGDER_KORD.some((k) => tekst.includes(k))
  })
}

// ── Claude: reformuler spørsmål som løfte/krav ────────────────────────────────
async function tilLøfte(spørsmål) {
  const repId   = spørsmål.sporsmal_fra?.id
  const repInfo = AGDER_REPS[repId]

  const prompt = `
Du er en politisk analytiker. Representanten ${repInfo.navn} (${repInfo.parti}) stilte dette skriftlige spørsmålet på Stortinget om en Agder-spesifikk sak:

TITTEL: ${spørsmål.tittel}

Din oppgave: Skriv om dette til et konkret og handlingsorientert løfte eller krav fra representanten.
Formuler det som: "Jeg vil [konkret handling] for [Agder-spesifikk referanse]"
Maks 200 tegn. Velg én kategori: ${KATEGORIER.join(", ")}

Svar KUN med JSON (ingen markdown):
{"tekst": "...", "kategori": "..."}
`

  const msg = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const raw = msg.content[0].text.trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  return JSON.parse(raw)
}

// ── Lagre i Supabase ──────────────────────────────────────────────────────────
async function lagreLøfter(rader) {
  const { error } = await supabase.from("agder_lofte").insert(rader)
  if (error) throw new Error(error.message)
}

// ── Hoved ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🗺️  Henter Agder-spesifikke løfter fra Stortinget…\n")

  // Slett eksisterende data (for å kjøre på nytt)
  await supabase.from("agder_lofte").delete().neq("id", 0)

  const sesjonId = "2025-2026"
  console.log(`📋 Henter skriftlige spørsmål for sesjon ${sesjonId}…`)
  const alle = await hentSpørsmål(sesjonId)
  console.log(`   Totalt: ${alle.length} spørsmål`)

  const agder = filtrerAgder(alle)
  console.log(`   Agder-spesifikke: ${agder.length} spørsmål\n`)

  const rader = []
  for (const s of agder) {
    const repId   = s.sporsmal_fra?.id
    const repInfo = AGDER_REPS[repId]
    const dato = s.datert_dato
      ? new Date(parseInt(s.datert_dato.match(/\d+/)[0])).toISOString().slice(0, 10)
      : null

    console.log(`🔹 ${repInfo.navn} (${repInfo.parti})`)
    console.log(`   ${s.tittel?.slice(0, 100)}…`)

    try {
      const lofteObj = await tilLøfte(s)
      console.log(`   → ${lofteObj.tekst.slice(0, 100)}`)
      console.log(`   → Kategori: ${lofteObj.kategori}\n`)

      rader.push({
        representant_id:   repId,
        representant_navn: repInfo.navn,
        parti:             repInfo.parti,
        tekst:             lofteObj.tekst,
        kategori:          lofteObj.kategori,
        kilde_type:        "sporsmal",
        kilde_url:         `https://www.stortinget.no/no/Saker-og-publikasjoner/Sporsmal/Skriftlige-sporsmal-og-svar/Skriftlig-sporsmal/?qid=${s.id}`,
        stortinget_id:     s.id,
        dato,
        status:            "ikke_behandlet",
      })
    } catch (err) {
      console.error(`   ⚠️  Feil: ${err.message}\n`)
    }

    await new Promise((r) => setTimeout(r, 500)) // rate limiting
  }

  console.log(`\n💾 Lagrer ${rader.length} løfter i Supabase…`)
  if (rader.length > 0) {
    await lagreLøfter(rader)
    console.log(`✅ ${rader.length} Agder-løfter lagret!`)
  } else {
    console.log("Ingen løfter å lagre.")
  }
}

main().catch((err) => { console.error("Fatal feil:", err); process.exit(1) })
