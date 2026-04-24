# Sørblikket – Agderbenken

Et journalistikkverktøy for å følge med på Agder-representantene på Stortinget.

## Om prosjektet

Sørblikket gjør det enkelt å følge med på hva Agderbenkens stortingsrepresentanter faktisk gjør — ikke bare hva de lover. Dashboardet samler saker, stemmeoversikter, representantprofiler og partiinformasjon på ett sted, basert på åpne data fra Stortingets API.

---

## Teknisk stack

| Teknologi | Bruk |
|---|---|
| React 19 | Frontend-rammeverk |
| TypeScript | Typesikkerhet |
| Vite | Byggesystem og dev-server |
| React Router v7 | Klientside routing |
| Supabase | Database for valgløfter (kun Partiprogrammer-siden) |

---

## Sider og ruter

| URL | Side | Beskrivelse |
|---|---|---|
| `/` | Hjem | Forside med hero, feature-kort og temaoversikt |
| `/statistikk` | Saker | Saksliste, søk, temafilter og statistikk-dashboard |
| `/votering` | Stemmegivning | Voteringer per sak, Agder-representanters stemmer |
| `/representanter` | Representanter | Profiler, partier og biografier for Agder-benken |
| `/parti` | Partiprogrammer | Direktelenker til programmer + valgløfte-chatbot |
| `/om` | Om Sørblikket | Prosjektbeskrivelse |
| `/personvern` | Personvern | Personvernerklæring |

---

## Dataflyt og systemarkitektur

### Oversikt

```
Nettleser (React)
    │
    ├── fetch() direkte fra klient
    │       │
    │       ├── Stortingets XML-API  ──►  XML-parsing  ──►  React state
    │       │   data.stortinget.no
    │       │
    │       └── Supabase (kun Partiprogrammer)  ──►  JSON  ──►  React state
    │
    └── Vises i UI
```

Ingen serverproxy — alle API-kall skjer direkte fra nettleseren.

---

### Datakilde 1 – Stortingets åpne API

**Base-URL:** `https://data.stortinget.no/eksport/`

Åpen tilgang, ingen API-nøkkel kreves. Alle svar er **XML** (ikke JSON).

| Endepunkt | Brukes i | Hva du får |
|---|---|---|
| `/saker?sesjonid=2025-2026` | Saker & statistikk | Alle saker i sesjonen |
| `/sak?sakid=12345` | Saker & statistikk | Detaljinfo om én sak |
| `/voteringer?sesjonid=2025-2026` | Stemmegivning | Alle voteringer i sesjonen |
| `/voteringsresultat?voteringid=X` | Stemmegivning | Hvem stemte for/mot |
| `/voteringsforslag?voteringid=X` | Stemmegivning | Forslagstekstene |
| `/dagensrepresentanter` | Representanter | Alle nåværende representanter |
| `/kodetbiografi?personid=P123` | Representanter | Biografi for én representant |

---

### Sesjon-ID

Stortingets sesjon løper fra **oktober til september**. Sesjon-IDen beregnes automatisk i `src/config/sesjon.ts`:

```
Januar–september 2026  →  "2025-2026"
Oktober–desember 2026  →  "2026-2027"
```

---

### XML-parsing

Stortinget returnerer XML med namespaces. Appen bruker `DOMParser` (innebygd i nettleseren) og hjelpefunksjoner i `src/utils/xml.ts`:

```
fetch(url)
  → res.text()                         ← rå XML-streng
  → parseXml(tekst)                    ← DOMParser → Document
  → hentElementer(doc, "sak")          ← getElementsByTagNameNS("*", "sak")
  → hentTekst(element, "tittel")       ← barn-element → tekstinnhold
  → CaseItem[]                         ← TypeScript-objekt
```

`getElementsByTagNameNS("*", navn)` brukes istedenfor `querySelector` for å håndtere namespace-variasjon i XML-svaret.

---

### Automatisk oppdatering

Alle sider som henter live-data bruker `setInterval` til å re-fetche hvert **5. minutt**:

```ts
useEffect(() => {
  hentData()
  const intervall = setInterval(hentData, 5 * 60 * 1000)
  return () => clearInterval(intervall)
}, [])
```

`AbortController` brukes i Votering og Representanter for å kansellere pågående fetch ved unmount eller ny parameter.

---

### Kategoriseringsmotor

Saker fra API-et har ingen temaer — disse beregnes lokalt i `src/lib/categorizationEngine.ts` ved hjelp av **fuzzy matching (Levenshtein-distanse)**:

```
For hver sak:
  1. Slå sammen tittel + korttittel + komiténavn
  2. Sammenlign mot nøkkelordlister per tema (src/config/temaer.ts)
  3. Beregn score per tema
  4. Plasser saken i temaet med høyest score
```

Temaer og nøkkelord konfigureres i `src/config/temaer.ts`.

---

### Datakilde 2 – Supabase (kun Partiprogrammer)

Brukes på Partiprogrammer-siden for chatboten som svarer på spørsmål om valgløfter.

**Tabell: `valgløfte`**

| Kolonne | Type | Beskrivelse |
|---|---|---|
| `lofte_id` | uuid | Primærnøkkel |
| `parti` | text | Partiforkortelse (AP, H, FrP osv.) |
| `tekst` | text | Løfteteksten fra partiprogrammet |
| `kategori` | text | Tema (Klima, Helse, Økonomi osv.) |
| `program_periode` | text | F.eks. "2025-2029" |
| `kilde_url` | text | Kilde-URL til partiprogrammet |

---

### Valgløfte-pipeline

Løfter hentes ut én gang og lagres i Supabase. Det skjer **ikke** live i appen.

```
Partiprogrammer (PDF / HTML)
    │
    ↓  extract-promises.mjs  (kjøres manuelt, bruker Claude AI)
    │
    └──► valgløfte-tabellen i Supabase
              │
              ↓  Parti.tsx chatbot  (live i appen)
              │
              └──► Bruker spør → Supabase-søk → rangerte resultater
```

**Chatboten bruker ikke Claude API ved spørretid.** Den gjør et direkte Supabase-spørring med `ilike`-filtre på nøkkelord og `eq`-filter på parti, og rangerer treffene lokalt med en relevansscore.

---

## Scripts

Kjøres manuelt fra prosjektroten (ikke del av appen).

| Script | Beskrivelse |
|---|---|
| `extract-promises.mjs` | Laster ned partiprogrammer (PDF/HTML), sender til Claude AI, lagrer løfter i `valgløfte`-tabellen |
| `extract-agder-promises.mjs` | Henter skriftlige spørsmål fra Agder-representanter, reformulerer som løfter, lagrer i `agder_lofte`-tabellen |
| `retry-failed.mjs` | Gjenprøver partier som feilet i extract-promises |
| `retry-missing.mjs` | Gjenprøver partier med manglende data |
| `retry-sp-r.mjs` | Gjenprøver Sp og R spesifikt |
| `agder-lofte-tabell.sql` | SQL-skjema for `agder_lofte`-tabellen |

---

## Prosjektstruktur

```
src/
├── components/
│   └── Navbar.tsx
├── config/
│   ├── partier.ts          # Partiliste og farger
│   ├── sesjon.ts           # Sesjon-ID beregning og API-URLer
│   └── temaer.ts           # Temaer og nøkkelord for kategorisering
├── hooks/
│   ├── useLokalLagring.ts  # localStorage-hook
│   ├── useNettStatus.ts    # Online/offline-deteksjon
│   └── useStortingetData.ts # Hoved-hook for saker fra API
├── lib/
│   ├── categorizationEngine.ts  # Fuzzy-kategorisering av saker
│   └── supabase.ts              # Supabase-klient
├── pages/
│   ├── Hjem.tsx
│   ├── Om.tsx
│   ├── Parti.tsx                # Partiprogrammer + valgløfte-chatbot
│   ├── Personvern.tsx
│   ├── Representanter.tsx
│   ├── Statistikk.tsx           # Hero-wrapper for saker-siden
│   ├── StatistikkDashboard.tsx  # Saker + statistikk dashboard
│   └── Votering.tsx
├── styles/                 # CSS per side
├── types/
│   └── sak.ts              # TypeScript-typer
└── utils/
    ├── dato.ts             # Datoformatering og månedstrend
    ├── status.ts           # Saksstatussjekker
    └── xml.ts              # XML-parsing hjelper
```

---

## Kom i gang

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # Produksjonsbygg
```

## Miljøvariabler

```env
VITE_SUPABASE_URL=din_supabase_url
VITE_SUPABASE_ANON_KEY=din_supabase_anon_key
```

Appen fungerer uten disse — kun valgløfte-chatboten i Partiprogrammer er da utilgjengelig.
