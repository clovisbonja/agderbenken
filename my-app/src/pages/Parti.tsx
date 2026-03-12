import type { CSSProperties } from "react"
type Lang = "no" | "en"

type Party = {
  navn: string
  forkortelse: string
  farge: string
  logo: string
  nettside: string
}

// Denne listen er "kilden" til kortene på siden.
// Hvert objekt blir ett kort med logo + lenke til partiets program.
const partier: Party[] = [
  {
    navn: "Arbeiderpartiet",
    forkortelse: "Ap",
    farge: "#E30613",
    logo: "/logo-images/aplogo.png",
    nettside: "https://www.arbeiderpartiet.no/politikken/partiprogram/",
  },
  {
    navn: "Høyre",
    forkortelse: "H",
    farge: "#2A6ABC",
    logo: "/logo-images/Hlogo.png",
    nettside: "https://hoyre.no/politikk/partiprogram/",
  },
  {
    navn: "Fremskrittspartiet",
    forkortelse: "FrP",
    farge: "#003F7F",
    logo: "/logo-images/frplogo.png",
    nettside: "https://www.frp.no/files/Program/2025/Program-2025-2029.pdf",
  },
  {
    navn: "Senterpartiet",
    forkortelse: "Sp",
    farge: "#00693E",
    logo: "/logo-images/splogo.png",
    nettside:
      "https://www.senterpartiet.no/politikk/program-uttaler/Nytt%20prinsipp-%20og%20handlingsprogram%202025-2029",
  },
  {
    navn: "Sosialistisk Venstreparti",
    forkortelse: "SV",
    farge: "#ffffff",
    logo: "/logo-images/svlogo.png",
    nettside: "https://www.sv.no/partiet/program/",
  },
  {
    navn: "Venstre",
    forkortelse: "V",
    farge: "#00857B",
    logo: "/logo-images/venstre.png",
    nettside: "https://www.venstre.no/politikk/partiprogram/",
  },
  {
    navn: "Kristelig Folkeparti",
    forkortelse: "KrF",
    farge: "#FEEF32",
    logo: "/logo-images/krflogobildet.png",
    nettside: "https://krf.no/politikk/politisk-program/",
  },
  {
    navn: "Rødt",
    forkortelse: "R",
    farge: "#ffffff",
    logo: "/logo-images/roedt.svg",
    nettside: "https://roedt.no/arbeidsprogram",
  },
  {
    navn: "Miljøpartiet De Grønne",
    forkortelse: "MDG",
    farge: "#377E00",
    logo: "/logo-images/mdglogo.png",
    nettside: "https://mdg.no/politikk/",
  },
]

type PartiProps = { lang: Lang }

export default function Parti({ lang }: PartiProps) {
  const t =
    lang === "no"
      ? {
          title: "Partiprogrammer",
          subtitle: "Oversikt over partienes programmer med direkte lenke til originalkildene.",
          open: "Åpne program",
          read: "Les partiprogram",
        }
      : {
          title: "Party Programs",
          subtitle: "Overview of party programs with direct links to the original sources.",
          open: "Open program",
          read: "Read party program",
        }

  return (
    <main className="page parti-page">
      <section className="parti-hero">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
      </section>

      <section className="parti-grid">
        {partier.map((parti) => (
          <article
            key={parti.navn}
            className="parti-card"
            style={{ "--party-color": parti.farge } as CSSProperties}
          >
            <a
              className="parti-link"
              href={parti.nettside}
              target="_blank"
              rel="noopener noreferrer"
            >
              <header className="parti-card-head">
                <span className="parti-pill">{parti.forkortelse}</span>
                <span className="parti-open">{t.open}</span>
              </header>

              <div className="parti-logo-wrap">
                <img src={parti.logo} alt={parti.navn} className="parti-logo" />
              </div>

              <footer className="parti-card-foot">
                <strong>{parti.navn}</strong>
                <small>{t.read}</small>
              </footer>
            </a>
          </article>
        ))}
      </section>
    </main>
  )
}
