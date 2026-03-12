import { NavLink } from "react-router-dom"

type Lang = "no" | "en"

type ForsideTomProps = {
  lang: Lang
}

export default function ForsideTom({ lang }: ForsideTomProps) {
  const t =
    lang === "no"
      ? {
          kicker: "Bachelor 2026",
          tagline: "Sørblikket – regionens øye på Stortinget",
          lead:
            "Enkel innsikt i politiske saker fra Stortinget, med tydelige visualiseringer og rask vei til mer informasjon.",
          whyTitle: "Kort forklart",
          southLabel: "Sør",
          southText: "Viser til Agder og Sørlandet, regionen løsningen representerer.",
          gazeLabel: "Blikket",
          gazeText: "Handler om innsyn, oppmerksomhet og at innbyggerne følger politikken nøye.",
          agderLabel: "Agderbenken",
          agderText:
            "I Storting-kontekst er Agderbenken representantene valgt fra Agder. Sørblikket gjør arbeidet deres mer åpent, forståelig og lett å følge.",
          stats: "Åpne statistikk",
          reps: "Se representanter",
          programs: "Les partiprogrammer",
        }
      : {
          kicker: "Bachelor 2026",
          tagline: "Sørblikket – the region's eye on the Storting",
          lead:
            "Simple insight into parliamentary matters, with clear visualizations and quick access to more information.",
          whyTitle: "In short",
          southLabel: "Sør",
          southText: "Refers to Agder and Southern Norway, the region this solution represents.",
          gazeLabel: "Blikket",
          gazeText: "Means scrutiny and attention, so citizens can follow politics closely.",
          agderLabel: "Agderbenken",
          agderText:
            "In a Storting context, Agderbenken is the MPs elected from Agder. Sørblikket makes their work more open, understandable and easier to follow.",
          stats: "Open statistics",
          reps: "View representatives",
          programs: "Read party programs",
        }

  return (
    <main className="page home-landing">
      <section className="landing-hero">
        <div className="landing-glow" aria-hidden />
        <p className="landing-kicker">{t.kicker}</p>
        <h1>Sørblikket</h1>
        <p className="landing-tagline">{t.tagline}</p>
        <p className="landing-lead">{t.lead}</p>

        <section className="landing-definition" aria-label={t.whyTitle}>
          <h2>{t.whyTitle}</h2>
          <ul className="landing-definition-list">
            <li>
              <strong>{t.southLabel}</strong>
              <span>{t.southText}</span>
            </li>
            <li>
              <strong>{t.gazeLabel}</strong>
              <span>{t.gazeText}</span>
            </li>
            <li>
              <strong>{t.agderLabel}</strong>
              <span>{t.agderText}</span>
            </li>
          </ul>
        </section>

        <div className="landing-actions">
          <NavLink to="/statistikk" className="landing-btn primary">
            {t.stats}
          </NavLink>
          <NavLink to="/representanter" className="landing-btn">
            {t.reps}
          </NavLink>
          <NavLink to="/parti" className="landing-btn">
            {t.programs}
          </NavLink>
        </div>
      </section>
    </main>
  )
}
