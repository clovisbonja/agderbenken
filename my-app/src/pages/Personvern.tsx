/*
 * ═══════════════════════════════════════════════════════════════════════════
 * PERSONVERN — src/pages/Personvern.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Personvernserklæring for Sørblikket
 * Viser hva vi gjør og hva vi IKKE godtar
 *
 * CSS finnes i src/styles/personvern.css
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { CSSProperties } from "react"

type Lang = "no" | "en"

const BLOCKED_CATEGORIES = [
  {
    title_no: "🚫 Personopplysninger",
    title_en: "🚫 Personal Information",
    items_no: [
      "Fødselsnummer (11 siffer)",
      "Personnummer/D-nummer",
      "Navn kombinert med andre identifikatorer",
      "Telefonnummer eller e-postadresser",
      "Adresser (hjemme- eller arbeidsadresser)",
    ],
    items_en: [
      "Personal identification numbers (11 digits)",
      "Personal ID / D-number",
      "Names combined with identifiers",
      "Phone numbers or email addresses",
      "Addresses (home or work)",
    ],
  },
  {
    title_no: "🚫 Helseopplysninger",
    title_en: "🚫 Health Information",
    items_no: [
      "Pasientinformasjon",
      "Diagnoser eller sykdomsbeskrivelser",
      "Resepter eller medisinfortolkninger",
      "Psykisk eller fysisk helse",
      "Genetisk informasjon",
    ],
    items_en: [
      "Patient information",
      "Diagnoses or medical descriptions",
      "Prescriptions or medication information",
      "Mental or physical health",
      "Genetic information",
    ],
  },
  {
    title_no: "🚫 Finansiell Informasjon",
    title_en: "🚫 Financial Information",
    items_no: [
      "Bankkonton eller kontonummer",
      "Kredittkortnummer",
      "Lønnsslipp eller lønnsinformasjon",
      "Skatteforthold eller økonomisk status",
      "Gjeldsinformasjon",
    ],
    items_en: [
      "Bank accounts or account numbers",
      "Credit card numbers",
      "Pay slips or salary information",
      "Tax status or financial information",
      "Debt information",
    ],
  },
  {
    title_no: "🚫 Religiøs og Politisk Informasjon",
    title_en: "🚫 Religious and Political Information",
    items_no: [
      "Religiøs overbevisning eller tro",
      "Politiske synspunkter om privatpersoner",
      "Fagforeningstilhørighet eller medlemskap",
      "Ideologisk klasifisering",
    ],
    items_en: [
      "Religious beliefs or faith",
      "Political views about individuals",
      "Union membership or affiliation",
      "Ideological classification",
    ],
  },
  {
    title_no: "🚫 Familje- og Arbeidsinformasjon",
    title_en: "🚫 Family and Employment Information",
    items_no: [
      "Familjeforhold eller familiestatus",
      "Barn- eller familieinformasjon",
      "Arbeidsgiver eller arbeidstaker opplysninger",
      "Ansatt- eller personallister",
    ],
    items_en: [
      "Family relationships or status",
      "Children or family information",
      "Employer or employee information",
      "Employee or personnel lists",
    ],
  },
  {
    title_no: "🚫 Konfidensiell Informasjon",
    title_en: "🚫 Confidential Information",
    items_no: [
      "Hemmeligheter eller fortrolig informasjon",
      "Interninformasjon fra organisasjoner",
      "Kildekode eller systempassord",
      "Krypteringsnøkler eller autentiseringskoder",
    ],
    items_en: [
      "Secrets or confidential information",
      "Internal organizational information",
      "Source code or system passwords",
      "Encryption keys or authentication codes",
    ],
  },
]

const ALLOWED_SEARCHES = [
  {
    category: "Partiprogram og valgløfter",
    examples: [
      "Hva lover FrP om skatter?",
      "Klimapolitikk fra SV",
      "Utdanningspolitikk Høyre",
    ],
  },
  {
    category: "Party Programs and Pledges",
    examples: [
      "What does FrP promise about taxes?",
      "Climate policy from SV",
      "Education policy from H",
    ],
  },
]

export default function Personvern({ lang }: { lang: Lang }) {
  const t =
    lang === "no"
      ? {
          title: "Personvernserklæring",
          subtitle: "Sørblikket tar ditt privatliv alvorlig",
          lastUpdated: "Sist oppdatert: 15. april 2026",
          shortIntro: "Sørblikket bruker offentlige data fra Stortingets API",
          tabDo: "Vi Gjør",
          tabDont: "Vi Gjør IKKE",
          tabProtection: "Beskyttelse",
          tabRights: "Dine Rettigheter",
          doHeader: "✅ Hva Vi Gjør",
          dontHeader: "❌ Hva Vi IKKE Gjør",
          protectionHeader: "🛡️ Hvordan Vi Beskytter Deg",
          blockedHeader: "❌ Informasjon Vi IKKE Godtar",
          blockedSubheader: "Chatboten vil automatisk blokkere søk som inneholder:",
          allowedHeader: "✅ Lovlige Søk",
          allowedSubheader: "Du KAN søke på:",
          contactHeader: "📧 Kontakt",
          rightsHeader: "Dine Rettigheter",
          promises: [
            "Bruker offentlige data fra Stortingets API",
            "Lagrer IKKE personlig informasjon fra deg",
            "Bruker IKKE cookies for sporing",
            "Blokker automatisk sensitive søk",
            "Respekterer ditt privatliv helt",
          ],
          doesNot: [
            "Lagre IP-adresser dine",
            "Bruke tracking-cookies",
            "Lagre dine søk eller spørsmål",
            "Dele informasjon med tredjeparter",
            "Bruke analytics eller personprofilering",
          ],
          protectionMeasures: [
            "Automatisk GDPR-validering av alle søk",
            "SSL/TLS-kryptering for all datatrafrikk",
            "Sikker Supabase-database",
            "Streng input-validering",
            "Regelmessige sikkerhetsopdateringer",
          ],
          rights: [
            "Få tilgang til dine data (hvis noen finnes)",
            "Slette dine data",
            "Korrigere feil opplysninger",
            "Motsette deg prosessering",
            "Overføre dine data",
          ],
        }
      : {
          title: "Privacy Policy",
          subtitle: "Sørblikket takes your privacy seriously",
          lastUpdated: "Last updated: April 15, 2026",
          shortIntro: "Sørblikket uses public data from Stortinget's API",
          tabDo: "What We Do",
          tabDont: "What We Don't",
          tabProtection: "Protection",
          tabRights: "Your Rights",
          doHeader: "✅ What We Do",
          dontHeader: "❌ What We Don't Do",
          protectionHeader: "🛡️ How We Protect You",
          blockedHeader: "❌ Information We Don't Accept",
          blockedSubheader: "The chatbot will automatically block searches containing:",
          allowedHeader: "✅ Allowed Searches",
          allowedSubheader: "You CAN search for:",
          contactHeader: "📧 Contact",
          rightsHeader: "Your Rights",
          promises: [
            "Use public data from Stortinget API",
            "Do NOT store personal information from you",
            "Do NOT use tracking cookies",
            "Automatically block sensitive searches",
            "Fully respect your privacy",
          ],
          doesNot: [
            "Store your IP addresses",
            "Use tracking cookies",
            "Store your searches or questions",
            "Share information with third parties",
            "Use analytics or personal profiling",
          ],
          protectionMeasures: [
            "Automatic GDPR validation of all searches",
            "SSL/TLS encryption for all data traffic",
            "Secure Supabase database",
            "Strict input validation",
            "Regular security updates",
          ],
          rights: [
            "Get access to your data (if any exists)",
            "Delete your data",
            "Correct incorrect information",
            "Object to processing",
            "Transfer your data",
          ],
        }

  return (
    <>
      <section className="ed-page-hero">
        <div className="ed-page-hero-content">
          <p className="ed-page-hero-kicker">
            {lang === "no" ? "Sørblikket" : "Sørblikket"}
          </p>
          <h1 className="ed-page-hero-heading">{t.title}</h1>
          <p className="ed-page-hero-lead">{t.subtitle}</p>
        </div>
        <div className="ed-page-hero-panel" aria-hidden />
      </section>

      <main className="page personvern-page">
        <article className="pv-container">
          {/* Intro */}
          <section className="pv-section pv-intro">
            <p className="pv-intro-text">{t.shortIntro}</p>
            <p className="pv-intro-meta">{t.lastUpdated}</p>
          </section>

          {/* Promise Grid */}
          <section className="pv-section">
            <div className="pv-grid">
              <div className="pv-promise-card">
                <h3>{t.doHeader}</h3>
                <ul className="pv-list pv-list-do">
                  {t.promises.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>

              <div className="pv-promise-card pv-promise-card-dont">
                <h3>{t.dontHeader}</h3>
                <ul className="pv-list pv-list-dont">
                  {t.doesNot.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Blocked Information */}
          <section className="pv-section pv-blocked">
            <h2>{t.blockedHeader}</h2>
            <p className="pv-subheader">{t.blockedSubheader}</p>

            <div className="pv-blocked-grid">
              {BLOCKED_CATEGORIES.map((category, idx) => (
                <div key={idx} className="pv-blocked-card">
                  <h3>
                    {lang === "no" ? category.title_no : category.title_en}
                  </h3>
                  <ul className="pv-blocked-list">
                    {(lang === "no" ? category.items_no : category.items_en).map(
                      (item, i) => (
                        <li key={i}>{item}</li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Allowed Searches */}
          <section className="pv-section pv-allowed">
            <h2>{t.allowedHeader}</h2>
            <p className="pv-subheader">{t.allowedSubheader}</p>

            <div className="pv-allowed-grid">
              {ALLOWED_SEARCHES.map((search, idx) => (
                <div key={idx} className="pv-allowed-card">
                  <h3>{search.category}</h3>
                  <ul className="pv-allowed-list">
                    {search.examples.map((ex, i) => (
                      <li key={i}>"{ex}"</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* Protection Measures */}
          <section className="pv-section pv-protection">
            <h2>{t.protectionHeader}</h2>

            <div className="pv-protection-flow">
              <div className="pv-flow-step">
                <div className="pv-flow-number">1</div>
                <div>
                  <h4>{lang === "no" ? "Du skriver spørsmål" : "You type a question"}</h4>
                </div>
              </div>
              <div className="pv-flow-arrow">→</div>
              <div className="pv-flow-step">
                <div className="pv-flow-number">2</div>
                <div>
                  <h4>
                    {lang === "no"
                      ? "Systemet sjekker for sensitiv info"
                      : "System checks for sensitive info"}
                  </h4>
                </div>
              </div>
              <div className="pv-flow-arrow">→</div>
              <div className="pv-flow-step">
                <div className="pv-flow-number">3</div>
                <div>
                  <h4>
                    {lang === "no"
                      ? "Om sensitiv info → søket blokkeres"
                      : "If sensitive → search blocked"}
                  </h4>
                </div>
              </div>
              <div className="pv-flow-arrow">→</div>
              <div className="pv-flow-step">
                <div className="pv-flow-number">4</div>
                <div>
                  <h4>
                    {lang === "no"
                      ? "Vennlig forklaring på norsk/engelsk"
                      : "Friendly explanation in Norwegian/English"}
                  </h4>
                </div>
              </div>
              <div className="pv-flow-arrow">→</div>
              <div className="pv-flow-step">
                <div className="pv-flow-number">5</div>
                <div>
                  <h4>
                    {lang === "no"
                      ? "Søket sendes ALDRI til databasen"
                      : "Search NEVER sent to database"}
                  </h4>
                </div>
              </div>
            </div>

            <div className="pv-measures">
              <h3>{lang === "no" ? "Sikkerhetstiltak:" : "Security Measures:"}</h3>
              <ul className="pv-measures-list">
                {t.protectionMeasures.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          </section>

          {/* Rights */}
          <section className="pv-section pv-rights">
            <h2>{t.rightsHeader}</h2>
            <p className="pv-rights-intro">
              {lang === "no"
                ? "Du har rett til å:"
                : "You have the right to:"}
            </p>
            <ul className="pv-rights-list">
              {t.rights.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </section>

          {/* Contact */}
          <section className="pv-section pv-contact">
            <h2>{t.contactHeader}</h2>
            <div className="pv-contact-grid">
              <div className="pv-contact-card">
                <h3>Sørblikket</h3>
                <p>
                  {lang === "no"
                    ? "Spørsmål om personvern?"
                    : "Questions about privacy?"}
                </p>
                <ul className="pv-contact-list">
                  <li>📧 personvern@sørblikket.no</li>
                  <li>🌐 www.sørblikket.no</li>
                </ul>
              </div>

              <div className="pv-contact-card">
                <h3>
                  {lang === "no"
                    ? "Datatilsynet (Klageklage)"
                    : "Datatilsynet (Complaints)"}
                </h3>
                <p>
                  {lang === "no"
                    ? "Bekymringer om personvernbehandlingen?"
                    : "Concerns about privacy handling?"}
                </p>
                <ul className="pv-contact-list">
                  <li>🌐 www.datatilsynet.no</li>
                  <li>📧 post@datatilsynet.no</li>
                  <li>📞 +47 21 50 18 50</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Footer Promise */}
          <section className="pv-section pv-footer-promise">
            <div className="pv-promise-box">
              <h2>
                {lang === "no"
                  ? "🤝 Vårt Løfte til Deg"
                  : "🤝 Our Promise to You"}
              </h2>
              <div className="pv-promise-items">
                <div className="pv-promise-item">
                  <span>✓</span>
                  {lang === "no"
                    ? "Ingen sporing av deg"
                    : "No tracking of you"}
                </div>
                <div className="pv-promise-item">
                  <span>✓</span>
                  {lang === "no" ? "Ingen salg av data" : "No sale of data"}
                </div>
                <div className="pv-promise-item">
                  <span>✓</span>
                  {lang === "no"
                    ? "Ingen deling med tredjeparter"
                    : "No sharing with third parties"}
                </div>
                <div className="pv-promise-item">
                  <span>✓</span>
                  {lang === "no"
                    ? "Maksimal sikkerhet og transparans"
                    : "Maximum security and transparency"}
                </div>
                <div className="pv-promise-item">
                  <span>✓</span>
                  {lang === "no"
                    ? "Full respekt for GDPR"
                    : "Full respect for GDPR"}
                </div>
              </div>
            </div>
          </section>
        </article>
      </main>
    </>
  )
}
