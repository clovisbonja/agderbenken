/**
 * retry-failed.mjs
 *
 * Gjenprøver partiene som feilet i extract-promises.mjs:
 *   - Ap  (overloaded)
 *   - H   (JSON-parsefeil)
 *   - V   (JSON-parsefeil)
 *   - KrF (JS-rendret side → bytter til PDF)
 *   - R   (rate limited → venter lenger)
 *   - MDG (overloaded + JS-rendret → bytter til PDF)
 *
 * Kjør: node scripts/retry-failed.mjs
 */

import { readFileSync, existsSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

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

const supabase  = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Partier som skal retries — med fikset URLer ───────────────────────────────
const PARTIER = [
  // Ap er allerede done (675 løfter) — fjernet fra lista
  {
    forkortelse: "H",
    navn: "Høyre",
    url: "https://hoyre.no/content/uploads/sites/83/2025/04/Hoyres_stortingsvalgprogram_2025-2029_-_tekstversjon.pdf",
    type: "pdf",
  },
  {
    forkortelse: "V",
    navn: "Venstre",
    url: "https://www.venstre.no/politikk/partiprogram/",
    type: "html",
  },
  {
    forkortelse: "KrF",
    navn: "Kristelig Folkeparti",
    url: "https://krf.no/content/uploads/2020/09/Partiprogram-2025-2029.pdf",
    type: "pdf",
  },
  {
    forkortelse: "R",
    navn: "Rødt",
    url: "/Users/clovisbonja/Downloads/arbeidsprogram25-29_skjerm (2).pdf",
    type: "pdf_local",
  },
  {
    forkortelse: "MDG",
    navn: "Miljøpartiet De Grønne",
    url: "https://mdg.no/_service/505809/download/id/1506077/name/MDGs+arbeidsprogram+2025-2029.pdf",
    type: "pdf",
  },
]

const KATEGORIER = [
  "Klima", "Helse", "Utdanning", "Økonomi", "Samferdsel",
  "Justis", "Familie", "Bistand", "Distrikt", "Landbruk",
  "Innvandring", "Sosial", "Næring", "Annet",
]

// ── HTML-renser ───────────────────────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, "\n\n")
    .trim()
}

async function fetchHtmlText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; research bot)" },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const html = await res.text()
  return stripHtml(html).slice(0, 120000)
}

async function fetchPdfBase64(url, retries = 5) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; research bot)" },
    })
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      return Buffer.from(buffer).toString("base64")
    }
    if (res.status === 429) {
      const wait = (i + 1) * 20000  // lengre ventetid enn originalen
      console.log(`   Rate limited, venter ${wait / 1000}s…`)
      await new Promise((r) => setTimeout(r, wait))
    } else {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }
  }
  throw new Error(`Ga opp etter ${retries} forsøk`)
}

// ── Prompt ────────────────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = (parti, kategorier) => `
Du analyserer ${parti}s partiprogram for stortingsperioden 2025–2029.

Din oppgave: Ekstraker ABSOLUTT ALLE konkrete politiske løfter, forpliktelser og tiltak fra hele programmet.
Ingen øvre grense — jo flere jo bedre. Gå gjennom hvert eneste kapittel og avsnitt.

Inkluder ALT som er:
- En konkret handling ("vi vil innføre", "vi vil øke", "vi vil avvikle", "vi vil styrke")
- Et tallfestet mål ("2 politifolk per 1000 innbyggere", "10 mrd til forsvar")
- En lovmessig forpliktelse ("endre loven om X", "innføre rett til Y")
- Et budsjettløfte ("bevilge mer til", "fjerne avgiften på")
- Et forbudsløfte ("forby", "avvikle", "fjerne")
- En garantiforpliktelse ("sikre", "bevare", "opprettholde")
- Satsinger og planer ("prioritere", "satse på", "legge til rette for")

Kategorier: ${kategorier.join(", ")}

Svar KUN med et JSON-array — ingen tekst før eller etter. Eksempel:
[
  {"tekst": "Innføre gratis SFO for 1.-4. trinn", "kategori": "Utdanning"},
  {"tekst": "Øke forsvarsbudsjettet til 2% av BNP innen 2026", "kategori": "Økonomi"}
]
`

// ── Ekstraksjon via Claude (med retry ved terminated) ─────────────────────────
async function extractPromisesOnce(parti) {
  const isPdf = parti.type === "pdf" || parti.type === "pdf_local"
  let content

  if (parti.type === "pdf_local") {
    console.log(`   Leser lokal PDF: ${parti.url}`)
    content = readFileSync(parti.url).toString("base64")
    console.log("   Lokal PDF lest ✓")
  } else if (isPdf) {
    console.log("   Laster ned PDF…")
    content = await fetchPdfBase64(parti.url)
    console.log("   PDF lastet ned ✓")
  } else {
    console.log("   Henter nettside…")
    content = await fetchHtmlText(parti.url)
    console.log(`   Nettside hentet (${content.length} tegn) ✓`)
  }

  console.log("   Sender til Claude for ekstraksjon…")

  const messageContent = isPdf
    ? [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: content } },
        { type: "text", text: EXTRACTION_PROMPT(parti.navn, KATEGORIER) },
      ]
    : [
        { type: "text", text: `PROGRAMTEKST FOR ${parti.navn.toUpperCase()}:\n\n${content}` },
        { type: "text", text: EXTRACTION_PROMPT(parti.navn, KATEGORIER) },
      ]

  const stream = anthropic.messages.stream({
    model: "claude-opus-4-6",
    max_tokens: 32000,
    messages: [{ role: "user", content: messageContent }],
  })
  const msg = await stream.finalMessage()
  const text = msg.content[0].text.trim()

  // Strip markdown code fences
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim()

  // 1. Prøv full parse
  try { return JSON.parse(cleaned) } catch {}

  // 2. Prøv å trekke ut komplett JSON-array
  const arrMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]) } catch {}
  }

  // 3. JSON trunkert (nådde token-grensen) — trekk ut alle komplette objekter
  const objekter = []
  const re = /\{\s*"tekst"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"kategori"\s*:\s*"([^"]+)"\s*\}/g
  let m
  while ((m = re.exec(cleaned)) !== null) {
    try {
      objekter.push(JSON.parse(m[0]))
    } catch {}
  }
  if (objekter.length > 0) {
    console.log(`   ⚠️  JSON trunkert — reddet ${objekter.length} komplette objekter`)
    return objekter
  }

  console.log("   Råsvar fra Claude (første 500 tegn):", text.slice(0, 500))
  throw new Error("Klarte ikke parse JSON fra Claude")
}

async function extractPromises(parti, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractPromisesOnce(parti)
    } catch (err) {
      const isTerminated = err.message?.toLowerCase().includes("terminated") ||
                           err.message?.toLowerCase().includes("overloaded")
      if (isTerminated && attempt < maxRetries) {
        const wait = attempt * 30000
        console.log(`   ⚠️  ${err.message} — forsøk ${attempt}/${maxRetries}, venter ${wait/1000}s…`)
        await new Promise((r) => setTimeout(r, wait))
      } else {
        throw err
      }
    }
  }
}

// ── Lagre i Supabase ──────────────────────────────────────────────────────────
async function savePromises(forkortelse, promises) {
  const { error: delErr } = await supabase.from("valgløfte").delete().eq("parti", forkortelse)
  if (delErr) { console.error(`  Feil ved sletting: ${delErr.message}`); return 0 }

  const rows = promises.map((p) => ({
    parti: forkortelse,
    tekst: p.tekst,
    kategori: p.kategori,
    program_periode: "2025-2029",
  }))

  const chunkSize = 100
  let saved = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase.from("valgløfte").insert(chunk)
    if (error) { console.error(`  Feil ved insert: ${error.message}`); continue }
    saved += chunk.length
  }
  return saved
}

// ── Hovedfunksjon ─────────────────────────────────────────────────────────────
async function main() {
  console.log("🔄 Starter retry for feilede partier…\n")

  for (const parti of PARTIER) {
    console.log(`\n🔹 ${parti.navn} (${parti.forkortelse})`)
    console.log(`   Kilde: ${parti.url}`)

    try {
      const promises = await extractPromises(parti)
      console.log(`   Claude fant ${promises.length} løfter ✓`)
      const saved = await savePromises(parti.forkortelse, promises)
      console.log(`   ✅ ${saved} løfter lagret i Supabase`)
    } catch (err) {
      console.log(`   ⚠️  Feil: ${err.message}`)
    }

    // Vent mellom hvert parti for å unngå overloaded
    if (PARTIER.indexOf(parti) < PARTIER.length - 1) {
      console.log("   Venter 10s før neste parti…")
      await new Promise((r) => setTimeout(r, 10000))
    }
  }

  console.log("\n✅ Retry fullført!")
}

main().catch((err) => { console.error("Fatal feil:", err); process.exit(1) })
