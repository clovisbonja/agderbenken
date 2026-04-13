/**
 * retry-sp-r.mjs
 * Kjør kun Sp og R på nytt med fikser:
 *   - Sp: økt max_tokens + strengere JSON-ekstraksjon
 *   - R:  alternativ PDF-URL + forsinkelse
 */

import { readFileSync } from "fs"
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

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const KATEGORIER = [
  "Klima", "Helse", "Utdanning", "Økonomi", "Samferdsel",
  "Justis", "Familie", "Bistand", "Distrikt", "Landbruk",
  "Innvandring", "Sosial", "Næring",
]

const PARTIER = [
  {
    forkortelse: "Sp",
    navn: "Senterpartiet",
    url: "https://www.senterpartiet.no/politikk/_/attachment/inline/ea7e4063-1374-47bf-8b10-839bf68904c0:3c54bc9ec99b5e017f069f2312b3962bd934c78a/Senterpartiets%20stortingsvalgprogram%202025-2029%20bokm%C3%A5l%20i%20PDF.pdf",
    type: "pdf",
  },
  {
    forkortelse: "R",
    navn: "Rødt",
    // Alternativ PDF-URL
    url: "https://roedt.no/fil/add2676c08676a581952a12f8f072e2126f9eb5b.pdf",
    type: "pdf",
  },
]

async function fetchPdfBase64(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    const res = await fetch(url)
    if (res.ok) {
      const buffer = await res.arrayBuffer()
      return Buffer.from(buffer).toString("base64")
    }
    if (res.status === 429) {
      const wait = (i + 1) * 10000
      console.log(`   Rate limited, venter ${wait / 1000}s…`)
      await new Promise((r) => setTimeout(r, wait))
    } else {
      throw new Error(`HTTP ${res.status} for ${url}`)
    }
  }
  throw new Error(`Ga opp etter ${retries} forsøk`)
}

const PROMPT = (parti, kategorier) => `
Du analyserer ${parti}s partiprogram for stortingsperioden 2025–2029.

Din oppgave: Ekstraker 20–25 KONKRETE politiske løfter fra programmet.

Krav til hvert løfte:
1. Konkret handling eller forpliktelse (ikke vage mål)
2. Verbatim sitat fra kildeteksten, maks 200 tegn
3. Kategori fra: ${kategorier.join(", ")}

Returner KUN et gyldig JSON-array. Ingen markdown, ingen forklaring, ingen tekst utenfor JSON:
[{"tekst":"...","kategori":"..."}]
`

async function extractPromises(parti, content) {
  const msg = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 8192, // økt fra 4096 for å unngå avkuttet JSON
    messages: [{
      role: "user",
      content: [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: content } },
        { type: "text", text: PROMPT(parti.navn, KATEGORIER) },
      ],
    }],
  })

  const raw = msg.content[0].text.trim()

  // Prøv direkte parse
  try { return JSON.parse(raw) } catch {}

  // Finn første komplette JSON-array
  const m = raw.match(/\[[\s\S]*?\](?=\s*$)/) || raw.match(/\[[\s\S]*\]/)
  if (m) {
    try { return JSON.parse(m[0]) } catch {}
  }

  throw new Error("Klarte ikke parse JSON fra Claude:\n" + raw.slice(0, 200))
}

async function savePromises(forkortelse, promises, kilde_url) {
  const { error: delErr } = await supabase.from("valgløfte").delete().eq("parti", forkortelse)
  if (delErr) { console.error("  Sletting feil:", delErr.message); return 0 }

  const rows = promises.map((p) => ({
    parti: forkortelse,
    tekst: p.tekst,
    kategori: p.kategori,
    program_periode: "2025-2029",
    kilde_url,
  }))

  const { error: insErr } = await supabase.from("valgløfte").insert(rows)
  if (insErr) { console.error("  Insert feil:", insErr.message); return 0 }
  return rows.length
}

async function main() {
  console.log("🔁 Kjører Sp og R på nytt…\n")

  for (const parti of PARTIER) {
    console.log(`\n🔹 ${parti.navn} (${parti.forkortelse})`)
    console.log(`   URL: ${parti.url}`)
    try {
      console.log("   Laster ned PDF…")
      const content = await fetchPdfBase64(parti.url)
      console.log("   PDF lastet ned ✓")
      console.log("   Sender til Claude…")
      const promises = await extractPromises(parti, content)
      console.log(`   Claude fant ${promises.length} løfter ✓`)
      const saved = await savePromises(parti.forkortelse, promises, parti.url)
      console.log(`   ✅ ${saved} løfter lagret`)
    } catch (err) {
      console.error(`   ⚠️  Feil: ${err.message}`)
    }
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log("\n✅ Ferdig!")
}

main().catch((err) => { console.error("Fatal:", err); process.exit(1) })
