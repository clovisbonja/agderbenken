type Lang = "no" | "en"

type OmProps = {
  lang: Lang
}

type Partner = {
  name: string
  short: string
  bg: string
  textColor: string
  url: string
  img: string
}

const partners: Partner[] = [
  { name: "Digin", short: "Digin", bg: "#1a1a2e", textColor: "white", url: "https://digin.no", img: "/logo-images/digin-blaa-2x.png" },
  { name: "Bølgen Bærekraft", short: "Bølgen\nBærekraft", bg: "#ffffff", textColor: "white", url: "https://bolgenbarekraft.no", img: "/logo-images/bolgenlogo.jpg" },
  { name: "Fædrelandsvennen", short: "FVN", bg: "#ffffff", textColor: "#333", url: "https://www.fvn.no", img: "/logo-images/fvnlogo.png" },
  { name: "Universitetet i Agder", short: "UiA", bg: "#ffffff", textColor: "white", url: "https://www.uia.no", img: "/logo-images/uialogo.jpg" },
  { name: "Ki Nå", short: "Ki Nå", bg: "#f5f5f5", textColor: "#333", url: "#", img: "/logo-images/kinaalogo.webp" },
]

const TEXT: Record<Lang, Record<string, string>> = {
  no: {
    title: "Om Agderbenken",
    intro:
      "Agderbenken består av stortingsrepresentantene valgt fra Agder. De kommer fra ulike partier, men samarbeider når saker er viktige for regionen. Målet er å løfte Agders behov og muligheter i nasjonal politikk.",
    valuesHeading1: "Innovasjon",
    valuesDesc1: "Vi søker nye løsninger på Agders utfordringer.",
    valuesHeading2: "Åpenhet",
    valuesDesc2: "Vi er åpne om arbeidet vårt og prioriteringene vi gjør.",
    valuesHeading3: "Nøytralitet",
    valuesDesc3: "Vi legger partipolitikk til side når regionens beste står i sentrum.",
    projectTitle: "Om prosjektet",
    projectP1:
      "Prosjektet er utviklet som en bacheloroppgave i samarbeid med Digin. Målet er en digital løsning som viser hvordan Sørblikket leverer for regionen med bruk av åpne data, KI og visualisering.",
    projectP2:
      "Løsningen viser stemmemønstre, prioriteringer og forholdet mellom løfter og handling. Dette skal gjøre politikken mer forståelig for innbyggere, unge velgere, journalister og regionale aktører.",
    projectP3:
      "Data hentes fra Stortingets åpne API, Valgdirektoratet, partiprogrammer og andre offentlige kilder.",
    partnersTitle: "Våre samarbeidspartnere",
    visitSite: "Besøk nettside",
  },
  en: {
    title: "About Agderbenken",
    intro:
      "Sørblikket consists of members of parliament elected from Agder. They represent different parties, but collaborate when matters are important for the region. The goal is to bring Agder's needs and opportunities into national politics.",
    valuesHeading1: "Innovation",
    valuesDesc1: "We seek new solutions to Agder's challenges.",
    valuesHeading2: "Openness",
    valuesDesc2: "We are transparent about our work and priorities.",
    valuesHeading3: "Neutrality",
    valuesDesc3: "We put party politics aside when the region's best interests come first.",
    projectTitle: "About the project",
    projectP1:
      "This project was developed as a bachelor thesis in collaboration with Digin. The goal is a digital solution showing how Sørblikket delivers for the region using open data, AI, and visualization.",
    projectP2:
      "The solution highlights voting patterns, priorities, and the relationship between promises and actions. This helps make politics easier to understand for citizens, young voters, journalists, and regional stakeholders.",
    projectP3:
      "Data is sourced from Stortinget open API, the Norwegian Election Directorate, party programs, and other public sources.",
    partnersTitle: "Our partners",
    visitSite: "Visit website",
  },
}

export default function Om({ lang }: OmProps) {
  const t = TEXT[lang]

  const values = [
    { title: t.valuesHeading1, desc: t.valuesDesc1 },
    { title: t.valuesHeading2, desc: t.valuesDesc2 },
    { title: t.valuesHeading3, desc: t.valuesDesc3 },
  ]

  return (
    <main className="page om-page">
      <section className="om-hero">
        <h1>{t.title}</h1>
        <div className="om-underline" />
        <p className="om-intro">{t.intro}</p>
      </section>

      <section className="section">
        <div className="om-values">
          {values.map((v) => (
            <article className="om-card" key={v.title}>
              <h3>{v.title}</h3>
              <p>{v.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section project-section">
        <h2>{t.projectTitle}</h2>
        <p>{t.projectP1}</p>
        <p>{t.projectP2}</p>
        <p>{t.projectP3}</p>
      </section>

      <footer className="om-partners">
        <h3>{t.partnersTitle}</h3>
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
                  <span
                    style={{
                      color: p.textColor,
                      fontSize: "1.4rem",
                      fontWeight: 700,
                      textAlign: "center",
                      padding: "0 0.75rem",
                      whiteSpace: "pre-line",
                    }}
                  >
                    {p.short}
                  </span>
                )}
              </div>
              <span className="partner-name">{p.name}</span>
              <span className="partner-link">{t.visitSite}</span>
            </a>
          ))}
        </div>
      </footer>

      <style>{`
        .om-page {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0;
        }
        .om-hero {
          text-align: center;
          padding: 2.5rem 1.5rem 1.5rem;
          max-width: 820px;
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
          margin: 0 auto 1.2rem;
          border-radius: 2px;
        }
        .om-intro {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--muted);
        }
        .om-values {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .om-card {
          border-radius: 12px;
          padding: 1.4rem 1.2rem;
          flex: 1 1 220px;
          max-width: 280px;
          min-height: 170px;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          text-align: center;
          border: 1px solid var(--glass);
          background: color-mix(in srgb, var(--card) 88%, #60a5fa 12%);
        }
        .om-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
        }
        .om-card h3 { font-size: 1.2rem; font-weight: 700; color: var(--text); }
        .om-card p  { font-size: 0.95rem; color: var(--muted); line-height: 1.5; }

        .project-section {
          text-align: center;
          max-width: 860px;
          padding: 1.6rem;
        }
        .project-section h2 {
          font-size: 1.9rem;
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
          margin-top: 0.45rem;
          width: 100%;
        }
        .project-section p {
          font-size: 1rem;
          line-height: 1.7;
          color: var(--muted);
          margin-bottom: 1rem;
        }

        .om-partners {
          width: 100%;
          border-top: 1px solid var(--glass);
          margin-top: 1.4rem;
          padding: 2.2rem 1.2rem 2.6rem;
          text-align: center;
          background: var(--card);
          border-radius: 16px;
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
          margin: 0 auto 1.5rem;
          border-radius: 2px;
        }
        .om-partners-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 200px));
          gap: 1.4rem;
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
          color: var(--text);
          width: 200px;
        }
        .partner-logo-box {
          width: 200px;
          height: 160px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--glass);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .partner-card:hover .partner-logo-box {
          transform: scale(1.03);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
        }
        .partner-name { font-weight: 700; font-size: 1rem; }
        .partner-link { color: #3b82f6; font-size: 0.9rem; text-decoration: underline; }

        @media (max-width: 900px) {
          .om-partners-grid {
            grid-template-columns: repeat(2, minmax(0, 180px));
          }
          .om-partners-grid .partner-card:nth-child(4),
          .om-partners-grid .partner-card:nth-child(5) {
            grid-column: auto;
            grid-row: auto;
          }
        }

        @media (max-width: 640px) {
          .om-partners-grid {
            grid-template-columns: 1fr;
          }
          .partner-card, .partner-logo-box {
            width: 100%;
            max-width: 280px;
          }
        }
      `}</style>
    </main>
  )
}
