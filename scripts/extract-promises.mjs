/**
 * extract-promises.mjs
 *
 * Henter partiprogrammer (PDF eller HTML), bruker Claude til å
 * ekstrahere konkrete løfter som verbatim sitater, og lagrer
 * dem i Supabase valgløfte-tabellen.
 *
 * Kjør: node scripts/extract-promises.mjs
 */

import { readFileSync } from "fs"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

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
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Partier med programmer ────────────────────────────────────────────────────
const PARTIER = [
  {
    forkortelse: "Ap",
    navn: "Arbeiderpartiet",
    url: "https://res.cloudinary.com/arbeiderpartiet/image/upload/fl_attachment:partiprogram-2025-2029/v1/ievv_filestore/130322a45ccf45889bfc6fa4116c5b480cadc1e93e51491f8199451dd231c7c5",
    type: "pdf",
  },
  {
    forkortelse: "H",
    navn: "Høyre",
    url: "https://hoyre.no/content/uploads/sites/83/2025/04/Hoyres_stortingsvalgprogram_2025-2029_-_tekstversjon.pdf",
    type: "pdf",
  },
  {
    forkortelse: "FrP",
    navn: "Fremskrittspartiet",
    url: "https://www.frp.no/files/Program/2025/Program-2025-2029.pdf",
    type: "pdf",
  },
  {
    forkortelse: "Sp",
    navn: "Senterpartiet",
    url: "https://www.senterpartiet.no/politikk/_/attachment/inline/ea7e4063-1374-47bf-8b10-839bf68904c0:3c54bc9ec99b5e017f069f2312b3962bd934c78a/Senterpartiets%20stortingsvalgprogram%202025-2029%20bokm%C3%A5l%20i%20PDF.pdf",
    type: "pdf",
  },
  {
    forkortelse: "SV",
    navn: "Sosialistisk Venstreparti",
    url: "https://www.sv.no/wp-content/uploads/2025/04/svs-arbeidsprogram-2025-29-bm.pdf",
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
    url: "https://krf.no/politikk/politisk-program/",
    type: "html",
  },
  {
    forkortelse: "R",
    navn: "Rødt",
    url: "https://roedt.no/fil/25ba75b90597df613816bd5c6c77dc7d49192e20.pdf",
    type: "pdf",
  },
  {
    forkortelse: "MDG",
    navn: "Miljøpartiet De Grønne",
    url: "https://mdg.no/politikk/",
    type: "html",
  },
]

const KATEGORIER = [
  "Klima", "Helse", "Utdanning", "Økonomi", "Samferdsel",
  "Justis", "Familie", "Bistand", "Distrikt", "Landbruk",
  "Innvandring", "Sosial", "Næring",
]

// ── Hent og rens HTML ─────────────────────────────────────────────────────────
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
  const text = stripHtml(html)
  // Kutt til maks ~60 000 tegn for å holde seg under kontekstgrensen
  return text.slice(0, 60000)
}

async function fetchPdfBase64(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  const buffer = await res.arrayBuffer()
  return Buffer.from(buffer).toString("base64")
}

// ── Claude: ekstraksjon av løfter ────────────────────────────────────────────
const EXTRACTION_PROMPT = (parti, kategorier) => `
Du analyserer ${parti}s partiprogram for stortingsperioden 2025–2029.

Din oppgave: Ekstraker ALLE KONKRETE politiske løfter fra programmet. Ikke ha noen øvre grense — hent absolutt alt som er en konkret forpliktelse eller handling.

Krav til hvert løfte:
1. Det må være en KONKRET handling eller forpliktelse (ikke vage visjoner som "vi vil ha et bedre samfunn")
2. Bruk så nært verbatim sitat som mulig fra kildeteksten
3. Maks 250 tegn per løfte
4. Velg kategori fra denne listen: ${kategorier.join(", ")}
5. Dekk ALLE deler av programmet — ikke bare klimapolitikk, men også økonomi, helse, samferdsel, justis, familie, distrikt osv.

Returner KUN gyldig JSON (ingen markdown, ingen forklaring):
[
  {
    "tekst": "Konkret løfte fra programteksten",
    "kategori": "En av kategoriene over"
  }
]

Fokuser på løfter som er MÅLBARE og SPORBARE mot Stortingets saker.
`

async function extractPromises(parti, content, isPdf) {
  const messageContent = isPdf
    ? [
        {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: content },
        },
        { type: "text", text: EXTRACTION_PROMPT(parti.navn, KATEGORIER) },
      ]
    : [
        { type: "text", text: `PROGRAMTEKST FOR ${parti.navn.toUpperCase()}:\n\n${content}` },
        { type: "text", text: EXTRACTION_PROMPT(parti.navn, KATEGORIER) },
      ]

  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: messageContent }],
  })

  const text = msg.content[0].text.trim()

  try {
    return JSON.parse(text)
  } catch {
    const m = text.match(/\[[\s\S]*\]/)
    if (m) return JSON.parse(m[0])
    throw new Error("Klarte ikke parse JSON fra Claude")
  }
}

// ── Lagre i Supabase ──────────────────────────────────────────────────────────
async function savePromises(forkortelse, promises, kilde_url) {
  // Slett gamle løfter for dette partiet
  const { error: delErr } = await supabase
    .from("valgløfte")
    .delete()
    .eq("parti", forkortelse)

  if (delErr) {
    console.error(`  Feil ved sletting: ${delErr.message}`)
    return 0
  }

  const rows = promises.map((p) => ({
    parti: forkortelse,
    tekst: p.tekst,
    kategori: p.kategori,
    program_periode: "2025-2029",
    kilde_url,
  }))

  const { error: insErr } = await supabase.from("valgløfte").insert(rows)
  if (insErr) {
    console.error(`  Feil ved insert: ${insErr.message}`)
    return 0
  }
  return rows.length
}

// ── Hovedfunksjon ─────────────────────────────────────────────────────────────
async function main() {
  console.log("📋 Starter ekstraksjon av partiløfter…\n")

  for (const parti of PARTIER) {
    console.log(`\n🔹 ${parti.navn} (${parti.forkortelse})`)
    console.log(`   Kilde: ${parti.url}`)

    try {
      let content
      let isPdf = parti.type === "pdf"

      if (isPdf) {
        console.log("   Laster ned PDF…")
        content = await fetchPdfBase64(parti.url)
        console.log("   PDF lastet ned ✓")
      } else {
        console.log("   Henter nettside…")
        content = await fetchHtmlText(parti.url)
        console.log(`   Nettside hentet (${content.length} tegn) ✓`)
      }

      console.log("   Sender til Claude for ekstraksjon…")
      const promises = await extractPromises(parti, content, isPdf)
      console.log(`   Claude fant ${promises.length} løfter ✓`)

      const saved = await savePromises(parti.forkortelse, promises, parti.url)
      console.log(`   ✅ ${saved} løfter lagret i Supabase`)

      // Pause mellom partier
      await new Promise((r) => setTimeout(r, 1000))
    } catch (err) {
      console.error(`   ⚠️  Feil: ${err.message}`)
    }
  }

  console.log("\n✅ Ekstraksjon fullført!")
}

main().catch((err) => {
  console.error("Fatal feil:", err)
  process.exit(1)
})
