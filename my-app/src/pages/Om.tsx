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
    sbP1: "Sørblikket gir deg oversikt over hva Agderbenkens stortingsrepresentanter gjør på Stortinget. Saker de fremmer, stemmer de avgir og løftene de ga velgerne.",
    sbP2: "Her finner du saksbehandling, voteringsresultater og partiprogrammer samlet på ett sted. Søk i saker, sjekk stemmegivningen og les hva partiene lovet velgerne.",
    sbP3: "Dataene hentes direkte fra Stortingets åpne API. Prosjektet er utviklet som en bacheloroppgave ved UiA, i samarbeid med Digin.",
    abTitle: "Om Agderbenken",
    abIntro: "Agderbenken er samlebetegnelsen for stortingsrepresentantene valgt fra Agder fylke. De kommer fra ulike partier, men representerer alle innbyggerne i regionen. I saker med særlig regional betydning samarbeider de gjerne på tvers av partigrenser for å ivareta Agders interesser på Stortinget.",
    v1h: "Innovasjon", v1d: "Nye løsninger på regionale utfordringer.",
    v2h: "Åpenhet",    v2d: "Åpen om arbeidet og hva som prioriteres.",
    v3h: "Nøytralitet", v3d: "Partipolitikk til side når regionens interesser er felles.",
    goalTitle: "Hva Sørblikket dekker",
    goalSub: "Åpen tilgang til informasjon om Agders representanter på Stortinget.",
    goal1: "Synlige stemmemønstre",
    goal2: "Partiprogrammer opp mot handling",
    goal3: "Regionalt perspektiv",
    goal4: "Tilgjengelig for alle",
    ptTitle: "Samarbeidspartnere",
    visitSite: "Besøk nettside",
    f1l: "Institusjon",       f1v: "Universitetet i Agder",
    f2l: "Studieprogram",     f2v: "Informasjonssystemer",
    f3l: "Samarbeidspartner", f3v: "Digin AS",
    f4l: "Kildekode",         f4v: "Åpen (GitHub)",
  },
  en: {
    heroTitle: "About Sørblikket",
    sbP1: "Sørblikket gives you an overview of what Agder's parliamentary representatives do in the Storting. Cases they raise, votes they cast and the promises they made to voters.",
    sbP2: "Find case records, voting results and party programmes in one place. Search cases, check voting and read what the parties promised.",
    sbP3: "Data is fetched directly from the Storting's open API. The project was developed as a bachelor thesis at UiA, in collaboration with Digin.",
    abTitle: "About the Agder Bench",
    abIntro: "The Agder Bench is the collective term for parliamentary representatives elected from Agder county. They come from different parties but represent all residents of the region. On matters of particular regional significance, they often work across party lines to advance Agder's interests in Parliament.",
    v1h: "Innovation", v1d: "New approaches to regional challenges.",
    v2h: "Openness",   v2d: "Transparent about the work and what is prioritised.",
    v3h: "Neutrality", v3d: "Party politics set aside when regional interests align.",
    goalTitle: "What Sørblikket covers",
    goalSub: "Open access to information about Agder's representatives in Parliament.",
    goal1: "Visible voting patterns",
    goal2: "Party promises vs. action",
    goal3: "Regional perspective",
    goal4: "Accessible to everyone",
    ptTitle: "Partners",
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
          <p className="ed-page-hero-lead">{lang === "no" ? "Et samarbeidsprosjekt mellom Fædrelandsvennen og Digin om politisk innsyn i Agder." : "A collaboration between Fædrelandsvennen and Digin on political transparency in Agder."}</p>
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