export default function Forside() {
  return (
    <main className="page">
      <h1>Hvordan leverer Agderbenken for regionen?</h1>

      <section className="section">
        <h2>Våre satsingsområder</h2>

        <div className="card-grid">
          <div className="card">
            <h3>Klima</h3>
            <p>Satsing på fornybar energi og grønn omstilling i regionen.</p>
          </div>

          <div className="card">
            <h3>Energi</h3>
            <p>Sikre stabil krafttilgang og konkurransedyktige priser.</p>
          </div>

          <div className="card">
            <h3>Samferdsel</h3>
            <p>Bedre infrastruktur og kortere reisevei mellom byene i Agder.</p>
          </div>

          <div className="card">
            <h3>Levekår</h3>
            <p>Tiltak for å bedre folkehelsen og redusere utenforskap.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Visualisering</h2>
      </section>
    </main>
  )
}