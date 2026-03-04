import { useState } from "react"

// Tre visningsvalg for samme innhold i visualiseringen.
type Version = "podium" | "bar" | "scoreboard"

// Felles datamodell for et tema i visualiseringene.
type ThemeItem = {
  name: string
  count: number
  desc?: string
}

function PodiumView({ themesProp }: { themesProp?: ThemeItem[] }) {
  // Midlertidige standarddata som brukes når vi ikke sender inn data utenfra.
  const defaultThemes: ThemeItem[] = [
    { name: "Samferdsel", count: 34, desc: "Veier, kollektiv og infrastruktur" },
    { name: "Energi", count: 28, desc: "Kraft, strømpriser og energisikkerhet" },
    { name: "Levekår", count: 18, desc: "Folkehelse, arbeid og sosial trygghet" },
    { name: "Klima og miljø", count: 10, desc: "Natur, klima og utslipp" },
  ]

  // Støtter live-data senere via props, men har lokale fallback-data nå.
  const themes = themesProp ?? defaultThemes

  // Sorter synkende slik at høyest antall kommer først.
  const sorted = [...themes].sort((a, b) => b.count - a.count)
  const max = sorted[0]?.count || 1

  // Visuell rekkefølge i podium: 2. plass, 1. plass, 3. plass, 4. plass.
  const visualOrder = [sorted[1], sorted[0], sorted[2], sorted[3]].filter(Boolean)

  // Høydeintervall for søylene.
  const maxBarHeight = 220
  const minBarHeight = 60

  return (
    <div className="viz podium">
      <div className="podium-stage">
        {visualOrder.map((theme, index) => {
          const rankMap = [2, 1, 3, 4]
          const rank = rankMap[index]
          const heightPx = Math.round(
            minBarHeight + (theme.count / max) * (maxBarHeight - minBarHeight)
          )

          return (
            <div className={`podium-block rank-${rank}`} key={theme.name}>
              <div className="block-top" style={{ height: `${heightPx}px` }}>
                <div className="trophy" aria-hidden>
                  {/* En enkel trofé-ikonform; farge styres per rank i CSS */}
                  <svg
                    viewBox="0 0 24 24"
                    width="56"
                    height="56"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7 3h10v2a4 4 0 0 1-4 4H11A4 4 0 0 1 7 5V3z"
                      fill="currentColor"
                    />
                    <path
                      d="M7 9a6 6 0 0 1-6 6v1a2 2 0 0 0 2 2h6"
                      stroke="currentColor"
                      strokeWidth="0"
                    />
                  </svg>
                </div>
              </div>

              <div className="block-base">
                <div className="place">{rank}</div>
                <div className="theme">{theme.name}</div>
                <div className="count">{theme.count} saker</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BarView() {
  // Statisk eksempeldata for barvisningen.
  const themes = [
    { name: "Samferdsel", pct: 100 },
    { name: "Helse", pct: 82 },
    { name: "Utdanning", pct: 53 },
    { name: "Miljø", pct: 29 },
  ]

  return (
    <div className="viz bar">
      {themes.map((theme) => (
        <div className="bar-row" key={theme.name}>
          <div className="bar-label">{theme.name}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${theme.pct}%` }} />
          </div>
          <div className="bar-value">{theme.pct}%</div>
        </div>
      ))}
    </div>
  )
}

function ScoreboardView() {
  // Statisk eksempeldata for tabellvisningen.
  const themes = [
    { name: "Samferdsel", count: 34 },
    { name: "Helse", count: 28 },
    { name: "Utdanning", count: 18 },
    { name: "Miljø", count: 10 },
  ]

  return (
    <div className="viz scoreboard">
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Tema</th>
            <th>Antall saker</th>
          </tr>
        </thead>
        <tbody>
          {themes.map((theme, index) => (
            <tr key={theme.name}>
              <td>{index + 1}</td>
              <td>{theme.name}</td>
              <td>{theme.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Forside() {
  // Bruker kan velge mellom tre visningsmåter for samme datagrunnlag.
  const [version, setVersion] = useState<Version>("podium")

  // Forklarende tekst per valgt visualisering.
  const descriptions: Record<Version, string> = {
    podium:
      "Podiumet viser hvilke temaer som har flest saker, rangert fra mest til minst aktivitet. Temaet med høyest aktivitet plasseres i midten som førsteplass, mens temaene med nest høyest og tredje høyest aktivitet plasseres på hver sin side. Podiumformatet gjør det lett å se rangeringen umiddelbart uten å lese tallene først. Barene og temaene bruker faste farger og ikoner for å skape gjenkjennelse og en tydelig visuell struktur.",
    bar: "Aktivitetsbaren visualiseringen viser de samme dataene som podiumet, men i form av horisontale barer. Barene gjør det enkelt å sammenligne lengden og dermed aktivitetsnivået mellom temaene direkte. Hvert tema får sin egen farge og et ikon som samsvarer med de andre versjonene. Aktivitetsbaren gir en tydelig og lineær presentasjon som gjør forskjellene i aktivitetsnivå svært lett å tolke.",
    scoreboard:
      "Scoreboard-visualiseringen presenterer de samme tallene som versjon 1 og 2, men i et mer formelt og strukturert oppsett. Tallene vises i tabellform med tema på venstre side og antall saker på høyre side. Scoreboard-formatet er beregnet for situasjoner der man ønsker en ren og nøytral fremstilling av dataene, med tydelig fokus på tall og sammenligning. Farger og ikoner brukes konsistent for å sikre helhet mellom alle tre visningsmåtene.",
  }

  return (
    <main className="page">
      {/* Hovedtittel for forsiden */}
      <h1>Hvordan leverer Agderbenken for regionen?</h1>

      <section className="section">
        {/* Kortene under forklarer hvilke tema appen følger med på */}
        <h2>Våre satsingsområder</h2>

        <div className="card-grid">
          <div className="card">
            <h3>Klima</h3>
            <p>
              Norge er forpliktet til å redusere utslipp og lede an i grønn
              omstilling. Klimapolitikken er sentral i moderne stortingspolitikk.
            </p>
          </div>

          <div className="card">
            <h3>Energi</h3>
            <p>
              Som et energiland er Norges energipolitikk avgjørende for både
              økonomi og miljø. Debatt om fornybar kraftproduksjon og
              krafteksport er sentralt.
            </p>
          </div>

          <div className="card">
            <h3>Samferdsel</h3>
            <p>
              Infrastruktur og transport er kritisk for regional utvikling.
              Investeringer i vei, rail og kollektivtransport påvirker både
              økonomisk vekst og miljø.
            </p>
          </div>

          <div className="card">
            <h3>Levekår</h3>
            <p>
              Folkehelse, arbeidsmarked og sosial trygghet er fundamentale for å
              skape gode forhold for alle. Politikken her formar samfunnet
              direkte.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        {/* Her bytter brukeren mellom tre måter å vise de samme tallene på */}
        <h2>Visualisering</h2>

        <p className="viz-intro">
          Viser hvilke politiske temaer Agderbenken jobber mest med, rangert etter
          antall saker.
        </p>

        <div className="viz-section card">
          <div className="viz-controls">
            <label htmlFor="viz-select">Velg visning:</label>
            <select
              id="viz-select"
              value={version}
              // Når brukeren velger ny versjon, oppdateres state og riktig visning rendres.
              onChange={(e) => setVersion(e.target.value as Version)}
            >
              <option value="podium">Versjon 1 — Podium</option>
              <option value="bar">Versjon 2 — Aktivitetsbar</option>
              <option value="scoreboard">Versjon 3 — Politisk Scoreboard</option>
            </select>
          </div>

          <h3 className="viz-heading">Hvilke tema har flest saker?</h3>

          <div className="viz-container">
            {/* Kun én av disse visningene vises av gangen, basert på valget over */}
            {version === "podium" && <PodiumView />}
            {version === "bar" && <BarView />}
            {version === "scoreboard" && <ScoreboardView />}
          </div>

          {/* Forklaringsteksten følger automatisk valgt visualisering */}
          <div className="viz-description">{descriptions[version]}</div>
        </div>
      </section>
    </main>
  )
}
