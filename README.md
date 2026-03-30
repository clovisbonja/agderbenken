# Sørblikket

Et journalistisk innsyn-verktøy for Agderbenkens arbeid på Stortinget.
Utviklet som bacheloroppgave i samarbeid med **Digin** og **Fædrelandsvennen**.

---

## Hva er Sørblikket?

Sørblikket henter live data direkte fra Stortingets åpne API og gjør politikk lettere å forstå for innbyggere, unge velgere og journalister i Agder. Ingen datainnsamling, ingen innlogging — alt er offentlig tilgjengelig informasjon.

**Sider i appen:**

| Side | URL | Beskrivelse |
|---|---|---|
| Forside | `/` | Oversikt og navigasjon |
| Statistikk | `/statistikk` | Nøkkeltall, temafordeling og aktivitetstrend |
| Stemmegivning | `/votering` | Voteringer og representantstemmer |
| Representanter | `/representanter` | Alle 9 Agder-representanter med biografi |
| Partiprogrammer | `/parti` | Programmer og valgløfter per parti |
| Om | `/om` | Om prosjektet og samarbeidspartnere |

---

## Kom i gang

### Krav

- [Node.js](https://nodejs.org/) versjon 18 eller nyere
- Git

### 1. Klon repoet

```bash
git clone https://github.com/clovisbonja/agderbenken.git
cd agderbenken/my-app
```

### 2. Installer avhengigheter

```bash
npm install
```

### 3. Start utviklingsserver

```bash
npm run dev
```

Åpne [`http://localhost:5173`](http://localhost:5173) i nettleseren.

> **Merk:** Appen henter data fra Stortingets åpne API ved oppstart. Første lasting kan ta noen sekunder avhengig av nettverk.

---

## Supabase (valgfritt)

Supabase brukes **kun** for valgløfte-fanen på Parti-siden. Resten av appen fungerer uten det.

**Uten Supabase:** appen starter uten problemer. Valgløfter vises ikke, men du ser en tydelig melding.

**Med Supabase:** kopier eksempelfilen og fyll inn nøklene:

```bash
cp .env.example .env.local
```

Åpne `.env.local` og sett inn verdiene fra [Supabase-dashbordet](https://supabase.com/dashboard) ditt:

```
VITE_SUPABASE_URL=https://ditt-prosjekt-id.supabase.co
VITE_SUPABASE_ANON_KEY=din-anon-public-key-her
```

> **Viktig:** `.env.local` er gitignored og skal aldri commites. Del aldri nøkler offentlig.

---

## Bygge for produksjon

```bash
npm run build
```

Outputen havner i `dist/`. For å forhåndsvise produksjonsbygget lokalt:

```bash
npm run preview
```

---

## Prosjektstruktur

```
my-app/
├── public/                  # Statiske filer (bilder, ikoner)
│   └── logo-images/         # Partier og partnerlogoer
│
├── src/
│   ├── pages/               # Én fil per side i appen
│   │   ├── Hjem.tsx         # Forsiden
│   │   ├── Statistikk.tsx   # Statistikk-siden
│   │   ├── StatistikkDashboard.tsx  # Dashboard-komponenten
│   │   ├── Votering.tsx     # Stemmegivningssiden
│   │   ├── Representanter.tsx
│   │   ├── Parti.tsx        # Partiprogrammer + valgløfter
│   │   └── Om.tsx           # Om-siden
│   │
│   ├── components/
│   │   └── Navbar.tsx       # Toppmeny med hamburgermeny på mobil
│   │
│   ├── hooks/
│   │   ├── useStortingetData.ts   # Henter og cacher data fra Stortinget
│   │   └── useLokalLagring.ts     # localStorage-wrapper (tema, språk)
│   │
│   ├── config/
│   │   ├── partier.ts       # Alle Agder-partier med metadata
│   │   ├── temaer.ts        # De 7 politiske temaene
│   │   └── sesjon.ts        # Aktiv stortingssesjon + API-URLer
│   │
│   ├── lib/
│   │   ├── categorizationEngine.ts  # AI-kategorisering av saker per tema
│   │   └── supabase.ts              # Supabase-klient (null hvis ikke konfigurert)
│   │
│   ├── types/
│   │   └── sak.ts           # TypeScript-typer for saker og voteringer
│   │
│   ├── utils/
│   │   ├── xml.ts           # Parser for Stortingets XML-svar
│   │   ├── dato.ts          # Datoformatering og trendsberegning
│   │   └── status.ts        # Saksstatus-hjelpere
│   │
│   ├── styles/              # Én CSS-fil per side/komponent
│   │   ├── basis.css        # Design tokens, reset, .page-layout
│   │   ├── navbar.css
│   │   ├── hjem.css
│   │   ├── statistikk.css
│   │   ├── votering.css
│   │   ├── representanter.css
│   │   ├── parti.css
│   │   ├── om.css
│   │   └── felleskomponenter.css   # Hero-banner og footer
│   │
│   └── App.tsx              # Rot: ruting, tema, språk, footer
│
├── .env.example             # Mal for miljøvariabler — kopier til .env.local
└── package.json
```

---

## Teknologi

| Verktøy | Versjon | Brukes til |
|---|---|---|
| React | 19 | UI-komponenter |
| TypeScript | 5.9 | Type-sikkerhet |
| Vite | 7 | Byggverktøy og dev-server |
| React Router | 7 | Klient-side ruting |
| Supabase JS | 2 | Valgløfte-database (valgfritt) |

---

## API-datakilder

Alt hentes fra **Stortingets åpne API** — ingen nøkkel kreves.
Svar er i XML-format og parseres i `src/utils/xml.ts`.

| Endepunkt | Brukes til |
|---|---|
| `/saker?sesjonid=ÅÅÅÅ-ÅÅÅÅ` | Alle saker i en sesjon |
| `/voteringer?sesjonid=ÅÅÅÅ-ÅÅÅÅ` | Voteringer per sesjon |
| `/voteringsresultat?voteringid=X` | Hvem stemte hva |
| `/dagensrepresentanter` | Nåværende stortingsrepresentanter |
| `/kodetbiografi?personid=P123` | Komiteer og verv |
| `/personbilde?personid=P123` | Profilbilde |

---

## Vanlige problemer

**Appen starter ikke / krasjer med Supabase-feil**
→ Sørg for at `.env.local` eksisterer med gyldige verdier, _eller_ la den være tom — appen fungerer uten Supabase.

**`node_modules` mangler**
→ Kjør `npm install` inne i `my-app/`-mappen.

**Port 5173 er opptatt**
→ Vite velger automatisk neste ledige port og skriver det ut i terminalen.

**Ingen data lastes inn**
→ Stortingets API kan av og til være tregt. Sjekk nettverkstilgang og prøv igjen.

**TypeScript-feil**
→ Kjør `npx tsc --noEmit` for å se alle feil samlet.

---

## Bidra

1. Lag en ny branch: `git checkout -b feature/det-du-jobber-med`
2. Gjør endringer og commit
3. Push og åpne en Pull Request mot `main`

Partier og temaer konfigureres i `src/config/` — ingen kodeendringer i selve sidene er nødvendig for å legge til/fjerne data der.
