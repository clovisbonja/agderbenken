const partners = [
  { name: "Digin", short: "Digin", bg: "#1a1a2e", textColor: "white", url: "https://digin.no", img: "/logo-images/digin-blaa-2x.png" },
  { name: "Bølgen Bærekraft", short: "Bølgen\nBærekraft", bg: "#ffffff", textColor: "white", url: "https://bolgenbarekraft.no", img: "/logo-images/bolgenlogo.jpg" },
  { name: "Fædrelandsvennen", short: "FVN", bg: "#ffffff", textColor: "#333", url: "https://www.fvn.no", img: "/logo-images/fvnlogo.png" },
  { name: "Universitetet i Agder", short: "UiA", bg: "#ffffff", textColor: "white", url: "https://www.uia.no", img: "/logo-images/uialogo.jpg" },
  { name: "Ki Nå", short: "Ki Nå", bg: "#f5f5f5", textColor: "#333", url: "#", img: "/logo-images/kinaalogo.webp" },
]

const values = [
  { title: "Innovasjon", desc: "Vi søker nye løsninger på Agders utfordringer." },
  { title: "Åpenhet", desc: "Vi er åpne om vårt arbeid og hvilke prosesser vi prioriterer." },
  { title: "Nøytralitet", desc: "Vi legger partipolitikken til side for regionens beste." },
];

function HeroSection() {
  return (
    <section className="om-hero">
      <h1>Om Agderbenken</h1>
      <div className="om-underline" />
      <p className="om-intro">
        Agderbenken består av stortingsrepresentantene som er valgt inn fra Agder fylke.
        De representerer ulike politiske partier, men har et felles ansvar for å ivareta
        interessene til innbyggerne i regionen. I saker som er spesielt viktige for Agder,
        samarbeider de på tvers av partigrenser. Agderbenken spiller derfor en sentral rolle
        i å løfte regionale utfordringer og muligheter opp på nasjonalt nivå.
      </p>
    </section>
  );
}

function ValuesSection() {
  return (
    <section className="section">
      <div className="om-values">
        {values.map((v) => (
          <div className="om-card" key={v.title}>
            <h3>{v.title}</h3>
            <p>{v.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ProjectSection() {
  return (
    <section className="section project-section">
  <h2>Om prosjektet</h2>
      <p>
        Dette prosjektet er utviklet som en bacheloroppgave i samarbeid med <strong>Digin</strong> –
        landets største IT- og digitaliseringsklynge. Målet er å lage en digital løsning som viser
        hvordan Agderbenken leverer for regionen, ved hjelp av åpen data, KI og datavisualisering.
      </p>
      <p>
        Løsningen belyser stemmemønstre, politiske prioriteringer og forholdet mellom politiske løfter
        og faktisk handling. Vi ønsker å gjøre politikken mer gjennomsiktig og forståelig for unge
        velgere, innbyggere i Agder, journalister og regionale aktører.
      </p>
      <p>
        Dataene hentes fra Stortingets åpne API, Valgdirektoratet, partiprogrammer og andre offentlige
        kilder. KI-analyse og visualiseringer gir nye muligheter for innsikt i hva Agderbenken faktisk gjør.
      </p>
    </section>
  );
}

function PartnersSection() {
  return (
    <footer className="om-partners">
      <h3>Våre Samarbeidspartnere</h3>
      <div className="om-partners-underline" />
      <div className="om-partners-grid">
        {partners.map((p) => (
          <a href={p.url} target="_blank" rel="noreferrer" className="partner-card" key={p.name}>
            <div className="partner-logo-box" style={{ background: p.bg }}>
              {p.img ? (
                <img
                  src={p.img}
                  alt={p.name}
                  style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }}
                />
              ) : (
                <span style={{
                  color: p.textColor,
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  textAlign: "center",
                  padding: "0 0.75rem",
                  whiteSpace: "pre-line",
                }}>
                  {p.short}
                </span>
              )}
            </div>
            <span className="partner-name">{p.name}</span>
            <span className="partner-link">Besøk nettside</span>
          </a>
        ))}
      </div>
    </footer>
  );
}

export default function Om() {
  return (
    <main className="page om-page">
      <HeroSection />
      <ValuesSection />
      <ProjectSection />
      <PartnersSection />

      <style>{`
        .om-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
        }
        .om-hero {
          text-align: center;
          padding: 3rem 2rem 2rem;
          max-width: 780px;
        }
        .om-hero h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .om-underline {
          width: 80px;
          height: 3px;
          background: #3b82f6;
          margin: 0 auto 1.5rem;
          border-radius: 2px;
        }
        .om-intro {
          font-size: 1rem;
          line-height: 1.7;
          color: #333;
        }
        .om-values {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .om-card {
          background: #60a5fa;
          border-radius: 12px;
          padding: 2rem 1.5rem;
          flex: 1 1 220px;
          max-width: 280px;
          min-height: 180px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          cursor: default;
          text-align: center;
        }
        .om-card:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }
        .om-card h3 { font-size: 1.3rem; font-weight: 700; color: #000; }
        .om-card p  { font-size: 0.95rem; color: #000; line-height: 1.5; }
        .project-section {
          text-align: center;
          max-width: 780px;
          padding: 2rem;
        }
        .project-section h2 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          display: inline-block;
        }
        .project-section h2::after {
          content: "";
          display: block;
          height: 3px;
          background: #3b82f6;
          border-radius: 2px;
          margin-top: 0.5rem;
          width: 100%;
        }
        .project-section p {
          font-size: 1rem;
          line-height: 1.7;
          color: #333;
          margin-bottom: 1rem;
        }
        .om-partners {
          width: 100%;
          border-top: 1px solid #e5e7eb;
          margin-top: 2rem;
          padding: 2.5rem 2rem 3rem;
          text-align: center;
          background: #fff;
        }
        .om-partners h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 0.4rem;
        }
        .om-partners-underline {
          width: 80px;
          height: 3px;
          background: #3b82f6;
          margin: 0 auto 2rem;
          border-radius: 2px;
        }
        .om-partners-grid {
          display: grid;
          grid-template-columns: repeat(3, 200px);
          gap: 2rem;
          justify-content: center;
          justify-items: center;
          max-width: 1100px;
          margin: 0 auto;
        }
       .om-partners-grid .partner-card:nth-child(4) {
  grid-column: 1;
  grid-row: 2;
}
.om-partners-grid .partner-card:nth-child(5) {
  grid-column: 2;
  grid-row: 2;

        }
        .partner-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: #111;
          width: 200px;
        }
        .partner-logo-box {
          width: 200px;
          height: 160px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .partner-card:hover .partner-logo-box {
          transform: scale(1.05);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }
        .partner-name { font-weight: 700; font-size: 1rem; }
        .partner-link { color: #3b82f6; font-size: 0.9rem; text-decoration: underline; }
      `}</style>
    </main>
  );
}