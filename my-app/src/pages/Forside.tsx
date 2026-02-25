import { useState } from "react";

type Version = "podium" | "bar" | "scoreboard";

function PodiumView({
  themesProp,
}: {
  themesProp?: { name: string; count: number; desc?: string }[];
}) {
  const defaultThemes = [
  { name: "Samferdsel", count: 34, desc: "Veier, kollektiv og infrastruktur" },
  { name: "Energi", count: 28, desc: "Kraft, strømpriser og energisikkerhet" },
  { name: "Levekår", count: 18, desc: "Folkehelse, arbeid og sosial trygghet" },
  { name: "Klima og miljø", count: 10, desc: "Natur, klima og utslipp" },
];


  // allow injecting live data later via props
  const themes = themesProp ?? defaultThemes;

  // sort descending so largest is first; keep all four
  const sorted = [...themes].sort((a, b) => b.count - a.count);
  const max = sorted[0]?.count || 1;

  // reorder for visual layout: rank 2, rank 1 (center), rank 3, rank 4
  const visOrder = [sorted[1], sorted[0], sorted[2], sorted[3]];

  // sizing: map counts to px heights for the podium bars
  const maxBarHeight = 220; // px for the tallest
  const minBarHeight = 60; // px for smallest

  return (
    <div className="viz podium">
      <div className="podium-stage">
        {visOrder.map((t, i) => {
          // map visual position back to rank
          const rankMap = [2, 1, 3, 4];
          const rank = rankMap[i];
          const heightPx = Math.round(
            minBarHeight + ((t.count / max) * (maxBarHeight - minBarHeight))
          );

          return (
            <div className={`podium-block rank-${rank}`} key={t.name}>
              <div className="block-top" style={{ height: `${heightPx}px` }}>
                <div className="trophy" aria-hidden>
                  {/* simple trophy icon; color varies by rank via CSS */}
                  <svg viewBox="0 0 24 24" width="56" height="56" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 3h10v2a4 4 0 0 1-4 4H11A4 4 0 0 1 7 5V3z" fill="currentColor" />
                    <path d="M7 9a6 6 0 0 1-6 6v1a2 2 0 0 0 2 2h6" stroke="currentColor" strokeWidth="0" />
                  </svg>
                </div>
              </div>

              <div className="block-base">
                <div className="place">{rank}</div>
                <div className="theme">{t.name}</div>
                <div className="count">{t.count} saker</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarView() {
  const themes = [
    { name: "Samferdsel", pct: 100 },
    { name: "Helse", pct: 82 },
    { name: "Utdanning", pct: 53 },
    { name: "Miljø", pct: 29 },
  ];

  return (
    <div className="viz bar">
      {themes.map((t) => (
        <div className="bar-row" key={t.name}>
          <div className="bar-label">{t.name}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${t.pct}%` }} />
          </div>
          <div className="bar-value">{t.pct}%</div>
        </div>
      ))}
    </div>
  );
}

function ScoreboardView() {
  const themes = [
    { name: "Samferdsel", count: 34 },
    { name: "Helse", count: 28 },
    { name: "Utdanning", count: 18 },
    { name: "Miljø", count: 10 },
  ];

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
          {themes.map((t, i) => (
            <tr key={t.name}>
              <td>{i + 1}</td>
              <td>{t.name}</td>
              <td>{t.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Forside() {
  const [version, setVersion] = useState<Version>("podium");

  const descriptions: Record<Version, string> = {
    podium:
      "Podiumet viser hvilke temaer som har flest saker, rangert fra mest til minst aktivitet. Temaet med høyest aktivitet plasseres i midten som førsteplass, mens temaene med nest høyest og tredje høyest aktivitet plasseres på hver sin side. Podiumformatet gjør det lett å se rangeringen umiddelbart uten å lese tallene først. Barene og temaene bruker faste farger og ikoner for å skape gjenkjennelse og en tydelig visuell struktur.",
    bar: "Aktivitetsbaren visualiseringen viser de samme dataene som podiumet, men i form av horisontale barer. Barene gjør det enkelt å sammenligne lengden og dermed aktivitetsnivået mellom temaene direkte. Hvert tema får sin egen farge og et ikon som samsvarer med de andre versjonene. Aktivitetsbaren gir en tydelig og lineær presentasjon som gjør forskjellene i aktivitetsnivå svært lett å tolke.",
    scoreboard:
      "Scoreboard-visualiseringen presenterer de samme tallene som versjon 1 og 2, men i et mer formelt og strukturert oppsett. Tallene vises i tabellform med tema på venstre side og antall saker på høyre side. Scoreboard-formatet er beregnet for situasjoner der man ønsker en ren og nøytral fremstilling av dataene, med tydelig fokus på tall og sammenligning. Farger og ikoner brukes konsistent for å sikre helhet mellom alle tre visningsmåtene.",
  };

  return (
    <main className="page">
      <h1>Hvordan leverer Agderbenken for regionen?</h1>

      <section className="section">
        <h2>Våre satsingsområder</h2>

        <div className="card-grid">
          <div className="card">
            <h3>Klima</h3>
            <p>Norge er forpliktet til å redusere utslipp og lede an i grønn omstilling. Klimapolitikken er sentral i moderne stortingspolitikk.</p>
          </div>

          <div className="card">
            <h3>Energi</h3>
            <p>Som et energiland er Norges energipolitikk avgjørende for både økonomi og miljø. Debatt om fornybar kraftproduksjon og krafteksport er sentralt.</p>
          </div>

          <div className="card">
            <h3>Samferdsel</h3>
            <p>Infrastruktur og transport er kritisk for regional utvikling. Investeringer i vei, rail og kollektivtransport påvirker både økonomisk vekst og miljø.</p>
          </div>

          <div className="card">
            <h3>Levekår</h3>
            <p>Folkehelse, arbeidsmarked og sosial trygghet er fundamentale for å skape gode forhold for alle. Politikken her formar samfunnet direkte.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Visualisering</h2>

        <p className="viz-intro">Viser hvilke politiske temaer Agderbenken jobber mest med, rangert etter antall saker.</p>

        <div className="viz-section card">
          <div className="viz-controls">
            <label htmlFor="viz-select">Velg visning:</label>
            <select
              id="viz-select"
              value={version}
              onChange={(e) => setVersion(e.target.value as Version)}
            >
              <option value="podium">Versjon 1 — Podium</option>
              <option value="bar">Versjon 2 — Aktivitetsbar</option>
              <option value="scoreboard">Versjon 3 — Politisk Scoreboard</option>
            </select>
            <div className="viz-tooltip">Hold musen over elementer for forklaring</div>
          </div>

          <h3 className="viz-heading">Hvilke tema har flest saker?</h3>

          <div className="viz-container">
            {version === "podium" && <PodiumView />}
            {version === "bar" && <BarView />}
            {version === "scoreboard" && <ScoreboardView />}
          </div>

          <div className="viz-description">{descriptions[version]}</div>
        </div>
      </section>
    </main>
  );
}