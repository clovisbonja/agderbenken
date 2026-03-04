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
    <main className="page">
      <h1>Om Agderbenken</h1>
      <p>Informasjon om prosjektet og hva dere analyserer.</p>
    </main>
  );
}