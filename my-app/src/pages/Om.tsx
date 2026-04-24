/*
 * ═══════════════════════════════════════════════════════════════════════════
 * OM-SIDEN — src/pages/Om.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Informasjonsside om Sørblikket-prosjektet og Agderbenken.
 * Inneholder:
 *   - Sidetoppbanner (ed-page-hero) med tittel og intro
 *   - Herobildeblokk med fakta-chips (bilde: /public/om-hero.avif)
 *   - Tekstseksjon om Agderbenken med verdikort
 *   - Mål-sidebar
 *   - Samarbeidspartnere (Digin, Bølgen, FVN, UiA, Ki Nå)
 *
 * Støtter norsk (no) og engelsk (en) via lang-prop.
 * CSS finnes i src/styles/om.css.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

type Lang = "no" | "en"
type OmProps = { lang: Lang }

type Partner = {
  name: string
  short: string
  bg: string
  textColor: string
  url: string
  img: string
}

const partners: Partner[] = [
  { name: "Digin", short: "Digin", bg: "#ffffff", textColor: "white", url: "https://digin.no", img: "/logo-images/digin-blaa-2x.png" },
  { name: "Bølgen Bærekraft", short: "Bølgen\nBærekraft", bg: "#ffffff", textColor: "white", url: "https://bolgenbks.no/", img: "/logo-images/bolgenlogo.jpg" },
  { name: "Fædrelandsvennen", short: "FVN", bg: "#ffffff", textColor: "#333", url: "https://www.fvn.no", img: "/logo-images/fvnlogo.png" },
  { name: "Universitetet i Agder", short: "UiA", bg: "#ffffff", textColor: "white", url: "https://www.uia.no", img: "/logo-images/uialogo.jpg" },
  { name: "Ki Nå", short: "Ki Nå", bg: "#ffffff", textColor: "#333", url: "https://www.kinaa.no/", img: "/logo-images/kinaalogo.webp" },
]

const T: Record<Lang, Record<string, string>> = {
  no: {
    heroTitle: "Om Sørblikket",
    sbP1: "Sørblikket er et digitalt innsiktsverktøy som gjør det enkelt å følge med på hva Agderbenkens stortingsrepresentanter faktisk gjør — ikke bare hva de lover.",
    sbP2: "Dashboardet samler saker, stemmeoversikter og partiinformasjon på ett sted. Du kan søke i alle saker fra Stortinget, se hvem som stemte for eller mot, og sjekke hva partiene lovet velgerne opp mot hva de faktisk har stemt for.",
    sbP3: "Alt bygger på åpne data fra Stortingets API. Prosjektet er utviklet som en bacheloroppgave i samarbeid med Digin.",
    abTitle: "Om Agderbenken",
    abIntro: "Agderbenken består av stortingsrepresentantene som er valgt inn fra Agder fylke. De representerer ulike politiske partier, men har et felles ansvar for å ivareta interessene til innbyggerne i regionen. I saker som er spesielt viktige for Agder, samarbeider de på tvers av partigrenser. Agderbenken spiller derfor en sentral rolle i å løfte regionale utfordringer og muligheter opp på nasjonalt nivå.",
    v1h: "Innovasjon", v1d: "Vi søker nye løsninger på Agders utfordringer.",
    v2h: "Åpenhet",    v2d: "Vi er åpne om arbeidet vårt og hvilke prosesser vi prioriterer.",
    v3h: "Nøytralitet", v3d: "Vi legger partipolitikken til side for regionens beste.",
    goalTitle: "Mål for Sørblikket",
    goalSub: "Innbyggernes innsyn er målet for alt vi gjør.",
    goal1: "Mål 1: Åpne stemmemønstre",
    goal2: "Mål 2: Løftekontroll",
    goal3: "Mål 3: Regionalt fokus",
    goal4: "Mål 4: Bred tilgjengelighet",
    ptTitle: "Våre samarbeidspartnere",
    visitSite: "Besøk nettside",
    f1l: "Institusjon",       f1v: "Universitetet i Agder",
    f2l: "Studieprogram",     f2v: "Informasjonssystemer",
    f3l: "Samarbeidspartner", f3v: "Digin AS",
    f4l: "Kildekode",         f4v: "Åpen (GitHub)",
  },
  en: {
    heroTitle: "About Sørblikket",
    sbP1: "Sørblikket is a digital insight tool that makes it easy to follow what Agder's parliamentary representatives actually do — not just what they promise.",
    sbP2: "The dashboard gathers cases, voting records and party information in one place. Search all Storting cases, see who voted for or against, and compare party promises with actual voting records.",
    sbP3: "Everything is built on open data from the Storting API. The project was developed as a bachelor thesis in collaboration with Digin.",
    abTitle: "About the Agder Bench",
    abIntro: "The Agder Bench consists of parliamentary representatives elected from Agder county. They represent different political parties, but share a common responsibility to serve the interests of the region's citizens. On matters especially important to Agder, they collaborate across party lines. The Agder Bench therefore plays a central role in raising regional challenges and opportunities to the national level.",
    v1h: "Innovation", v1d: "We seek new solutions to Agder's challenges.",
    v2h: "Openness",   v2d: "We are transparent about our work and the processes we prioritise.",
    v3h: "Neutrality", v3d: "We put party politics aside for the good of the region.",
    goalTitle: "Goals for Sørblikket",
    goalSub: "Citizen insight is the goal of everything we do.",
    goal1: "Goal 1: Open voting patterns",
    goal2: "Goal 2: Promise tracking",
    goal3: "Goal 3: Regional focus",
    goal4: "Goal 4: Broad accessibility",
    ptTitle: "Our partners",
    visitSite: "Visit website",
    f1l: "Institution",   f1v: "University of Agder",
    f2l: "Programme",     f2v: "Information Systems",
    f3l: "Partner",       f3v: "Digin AS",
    f4l: "Source code",   f4v: "Open (GitHub)",
  },
}

export default function Om({ lang }: OmProps) {
  const t = T[lang]
  const heroImage = "/om-hero.avif"

  const values = [
    { title: t.v1h, desc: t.v1d },
    { title: t.v2h, desc: t.v2d },
    { title: t.v3h, desc: t.v3d },
  ]

  return (
    <main className="om">
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">Fædrelandsvennen × Digin</p>
          <h1 className="ed-page-hero-heading">{lang === "no" ? "Om Sørblikket" : "About Sørblikket"}</h1>
          <p className="ed-page-hero-lead">{lang === "no" ? "Et samarbeidsprosjekt mellom Fædrelandsvennen og Digin — åpen innsikt i Agders politiske representasjon." : "A collaboration between Fædrelandsvennen and Digin — open insight into Agder's political representation."}</p>
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>

      {/* ─── HERO BANNER ─── */}
      <section className="om-hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="om-hero-overlay" />
        <div className="om-hero-text">
          <h1 className="om-hero-h1">{t.heroTitle}</h1>
          <p>{t.sbP1}</p>
          <p>{t.sbP2}</p>
          <p>{t.sbP3}</p>
          <div className="om-facts">
            {([
              [t.f1l, t.f1v],
              [t.f2l, t.f2v],
              [t.f3l, t.f3v],
              [t.f4l, t.f4v],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} className="om-fact">
                <span className="om-fact-l">{l}</span>
                <span className="om-fact-v">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOVEDDEL + SIDEBAR ─── */}
      <div className="om-body">
        <div className="om-main">

          {/* Om Agderbenken */}
          <section className="om-prose-section">
            <h2 className="om-section-h2">{t.abTitle}</h2>
            <div className="om-h2-line" />
            <p className="om-ab-intro">{t.abIntro}</p>

            {/* Verdikort */}
            <div className="om-values">
              {values.map(v => (
                <article key={v.title} className="om-val-card">
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                </article>
              ))}
            </div>
          </section>

        </div>

        {/* SIDEBAR */}
        <aside className="om-sidebar">
          <div className="om-goal-box">
            <h3 className="om-goal-title">{t.goalTitle}</h3>
            <p className="om-goal-sub">{t.goalSub}</p>
            <ul className="om-goal-list">
              {[t.goal1, t.goal2, t.goal3, t.goal4].map(g => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* ─── SAMARBEIDSPARTNERE ─── */}
      <footer className="om-partners-section">
        <h3 className="om-partners-h3">{t.ptTitle}</h3>
        <div className="om-partners-line" />
        <div className="om-partners-grid">
          {partners.map(p => (
            <a key={p.name} href={p.url} target="_blank" rel="noreferrer" className="om-partner-card">
              <div className="om-partner-logo" style={{ background: p.bg }}>
                {p.img
                  ? <img src={p.img} alt={p.name} style={{ maxWidth: "80%", maxHeight: "80%", objectFit: "contain" }} />
                  : <span style={{ color: p.textColor, fontSize: "1.3rem", fontWeight: 700, textAlign: "center", padding: "0 .6rem", whiteSpace: "pre-line" }}>{p.short}</span>
                }
              </div>
              <div className="om-partner-info">
                <span className="om-partner-name">{p.name}</span>
                <span className="om-partner-visit">{t.visitSite} →</span>
              </div>
            </a>
          ))}
        </div>
      </footer>
    </main>
  )
}