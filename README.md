# Sørblikket (Agderbenken)
Sørblikket er en datadrevet webapplikasjon som gir innsyn i politiske saker fra Stortinget, med særlig kontekst rundt Agderbenken (representantene valgt fra Agder).

## Hva prosjektet gjør
- Henter live saksdata fra Stortingets åpne XML API.
- Gjør saker søkbare og grupperer dem i tema for rask oversikt.
- Viser statistikk, statusfordeling, trender og komitéaktivitet.
- Gir detaljvisning av valgt sak med enkel forklaring.
- Har egne sider for representanter, partiprogrammer og om prosjektet.

## Navn og kontekst
- **Sørblikket** er prosjektets navn og beskriver innsyn fra Sørlandet-perspektiv.
- **Agderbenken** brukes der det er relevant i Storting-kontekst (gruppen av representanter fra Agder).

## Funksjoner
- Norsk/engelsk språkbytte i navbar.
- Dark mode / light mode på tvers av sider.
- Statistikk-side med tydelig toppseksjon, forklaringer og flere dashboards.
- Representantside med live data, filtrering på parti og biografi.
- Responsivt design for desktop og mobil.

## Teknologi
- React + TypeScript + Vite
- CSS (egen styling)
- React Router

## Prosjektstruktur
- `my-app/src/pages/ForsideTom.tsx` – enkel forside
- `my-app/src/pages/Forside.tsx` – statistikkside
- `my-app/src/pages/Representanter.tsx` – representantside
- `my-app/src/pages/Parti.tsx` – partiprogrammer
- `my-app/src/pages/Om.tsx` – om prosjektet
- `my-app/src/components/Navbar.tsx` – navigasjon, språk og tema
- `my-app/src/lib/categorizationEngine.ts` – kategorisering og søk

## Kom i gang lokalt
```bash
cd my-app
npm install
npm run dev
```
Åpne deretter adressen Vite skriver ut (som regel `http://localhost:5173`).

## Produksjonsbuild
```bash
cd my-app
npm run build
npm run preview
```

## Datakilde
Data hentes fra Stortingets åpne data (XML API), blant annet:
- `https://data.stortinget.no/eksport/saker`
- `https://data.stortinget.no/eksport/sak`
- `https://data.stortinget.no/eksport/dagensrepresentanter`
- `https://data.stortinget.no/eksport/kodetbiografi`

## Videre arbeid
- Justere kategoriseringsregler mot flere faktiske sakstyper.
- Videre forbedre språk/oversettelser i alle edge-cases.
- Utvide med flere forklarende visualiseringer for yngre brukere.
