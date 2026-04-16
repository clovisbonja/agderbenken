# Sørblikket – Agderbenken

Et journalistikkverktøy for å følge med på Agder-representantene på Stortinget.

## Om prosjektet

Sørblikket gir en enkel og oversiktlig måte å følge med på hva Agders stortingsrepresentanter gjør i Stortinget. Tjenesten henter data fra Stortingets åpne API og presenterer:

- **Representanter** – Oversikt over alle representanter fra Agder
- **Partier** – Partiinformasjon med AI-drevet chatbot for spørsmål og svar
- **Votering** – Stemmeoversikt med resultater og partifordeling
- **Statistikk** – Dashboard med aktivitetsdata
- **Om** – Informasjon om tjenesten

## Teknisk stack

| Teknologi | Bruk |
|---|---|
| React 19 | Frontend-rammeverk |
| TypeScript | Typesikkerhet |
| Vite | Byggesystem og dev-server |
| React Router v7 | Klientside routing |
| Supabase | Backend / database |
| CSS Modules | Styling |

## Kom i gang

### Krav
- Node.js 18+
- npm

### Installasjon

```bash
npm install
```

### Utvikling

```bash
npm run dev
```

Åpne [http://localhost:5173](http://localhost:5173) i nettleseren.

### Bygg for produksjon

```bash
npm run build
```

### Forhåndsvisning av produksjonsbygg

```bash
npm run preview
```

## Prosjektstruktur

```
src/
├── components/     # Gjenbrukbare komponenter (Navbar, m.m.)
├── pages/          # Sidekomponenter
│   ├── Hjem.tsx
│   ├── Representanter.tsx
│   ├── Parti.tsx
│   ├── Votering.tsx
│   ├── Statistikk.tsx
│   └── Personvern.tsx
├── styles/         # CSS-stilark per side
└── main.tsx        # Inngangspunkt
```

## Miljøvariabler

Opprett en `.env`-fil i rotkatalogen:

```env
VITE_SUPABASE_URL=din_supabase_url
VITE_SUPABASE_ANON_KEY=din_supabase_anon_key
```
