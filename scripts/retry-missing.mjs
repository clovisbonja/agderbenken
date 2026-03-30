/**
 * retry-missing.mjs
 * Kjører ekstraksjon på nytt for KrF, Rødt og MDG som feilet.
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

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PARTIER = [
  {
    forkortelse: "R",
    navn: "Rødt",
    // Direkte URL blokkert av bot-vern (429) — bruker Wayback Machine-snapshot
    url: "https://web.archive.org/web/20250419045143/https://roedt.no/fil/29796b043eb866e5315c03ee379bb3de40a32208.pdf",
    type: "pdf",
  },
]

const KATEGORIER = [
  "Klima", "Helse", "Utdanning", "Økonomi", "Samferdsel",
  "Justis", "Familie", "Bistand", "Distrikt", "Landbruk",
  "Innvandring", "Sosial", "Næring",
]

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/\s{3,}/g, "\n\n").trim()
}

async function fetchHtmlText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; research bot)" } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return stripHtml(await res.text()).slice(0, 60000)
}

async function fetchPdfBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer()).toString("base64")
}

const PROMPT = (parti, kategorier) => `
Du analyserer ${parti}s partiprogram for stortingsperioden 2025–2029.

Din oppgave: Ekstraker ALLE KONKRETE politiske løfter fra programmet. Ingen øvre grense — hent absolutt alt som er en konkret forpliktelse eller handling. Dekk alle politikkområder.

Krav:
1. Konkret handling eller forpliktelse (ikke vage visjoner)
2. Verbatim sitat fra kildeteksten, maks 250 tegn
3. Kategori fra: ${kategorier.join(", ")}

Returner KUN gyldig JSON:
[{"tekst": "...", "kategori": "..."}]
`

function parsePartialJson(text) {
  // Prøv ren parse først
  try { return JSON.parse(text) } catch {}
  // Finn array-start
  const start = text.indexOf("[")
  if (start === -1) throw new Error("Ingen JSON-array funnet")
  let raw = text.slice(start)
  // Prøv å parse det som finnes
  try { return JSON.parse(raw) } catch {}
  // Klipp til siste fullstendige objekt (avsluttet med })
  const lastBrace = raw.lastIndexOf("},")
  if (lastBrace > 0) {
    raw = raw.slice(0, lastBrace + 1) + "]"
    try { return JSON.parse(raw) } catch {}
  }
  // Prøv å avslutte uferdig array
  const lastBrace2 = raw.lastIndexOf("}")
  if (lastBrace2 > 0) {
    raw = raw.slice(0, lastBrace2 + 1) + "]"
    try { return JSON.parse(raw) } catch {}
  }
  throw new Error("Klarte ikke parse JSON — selv med reparasjon")
}

async function extract(parti, content, isPdf) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    messages: [{
      role: "user",
      content: isPdf
        ? [{ type: "document", source: { type: "base64", media_type: "application/pdf", data: content } }, { type: "text", text: PROMPT(parti.navn, KATEGORIER) }]
        : [{ type: "text", text: `PROGRAMTEKST:\n\n${content}\n\n${PROMPT(parti.navn, KATEGORIER)}` }],
    }],
  })
  const text = msg.content[0].text.trim()
  return parsePartialJson(text)
}

async function save(forkortelse, promises, kilde_url) {
  await supabase.from("valgløfte").delete().eq("parti", forkortelse)
  const { error } = await supabase.from("valgløfte").insert(
    promises.map(p => ({ parti: forkortelse, tekst: p.tekst, kategori: p.kategori, program_periode: "2025-2029", kilde_url }))
  )
  if (error) throw new Error(error.message)
  return promises.length
}

async function main() {
  console.log("🔄 Kjører retry for KrF, Rødt og MDG…\n")
  for (const parti of PARTIER) {
    console.log(`\n🔹 ${parti.navn} (${parti.forkortelse})`)
    try {
      const isPdf = parti.type === "pdf"
      const content = isPdf ? await fetchPdfBase64(parti.url) : await fetchHtmlText(parti.url)
      console.log(`   Hentet ✓`)
      const promises = await extract(parti, content, isPdf)
      console.log(`   Claude fant ${promises.length} løfter ✓`)
      const n = await save(parti.forkortelse, promises, parti.url)
      console.log(`   ✅ ${n} løfter lagret`)
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      console.error(`   ⚠️  ${err.message}`)
    }
  }
  console.log("\n✅ Ferdig!")
}

main().catch(err => { console.error(err); process.exit(1) })
