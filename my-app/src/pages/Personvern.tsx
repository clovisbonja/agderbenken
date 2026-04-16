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
import { useState } from "react"

type Lang = "no" | "en"

// ── Komponent for å tilbakestille innstillinger ────────────────────────────

function StorageResetButton({ lang, resetText, successText }: { lang: Lang; resetText: string; successText: string }) {
  const [isResetting, setIsResetting] = useState(false)

  const handleReset = () => {
    if (isResetting) return

    if (!window.confirm(lang === "no" ? "Er du sikker? Dette vil tilbakestille tema, språk og alle innstillinger." : "Are you sure? This will reset your theme, language, and all settings.")) {
      return
    }

    setIsResetting(true)

    // Fjern alle localStorage-nøkler som vi setter
    try {
      localStorage.removeItem("theme-override")
      localStorage.removeItem("lang-override")
      localStorage.removeItem("sorblikket-howto-seen")
      localStorage.removeItem("agder-cookies-ok")
    } catch (e) {
      console.error("Failed to reset settings:", e)
    }

    // Vis suksessmelding og last siden på nytt
    alert(successText)
    window.location.reload()
  }

  return (
    <button
      onClick={handleReset}
      disabled={isResetting}
      className="pv-reset-btn"
      style={{
        padding: "10px 16px",
        marginTop: "12px",
        backgroundColor: "#f5f5f5",
        border: "1px solid #ddd",
        borderRadius: "6px",
        cursor: isResetting ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: 500,
        transition: "all 0.2s ease",
        opacity: isResetting ? 0.6 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isResetting) {
          (e.target as HTMLElement).style.backgroundColor = "#efefef"
          (e.target as HTMLElement).style.borderColor = "#999"
        }
      }}
      onMouseLeave={(e) => {
        if (!isResetting) {
          (e.target as HTMLElement).style.backgroundColor = "#f5f5f5"
          (e.target as HTMLElement).style.borderColor = "#ddd"
        }
      }}
    >
      {resetText}
    </button>
  )
}

const BLOCKED_CATEGORIES = [
  {
    title_no: "Personopplysninger",
    title_en: "Personal Information",
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
    title_no: "Helseopplysninger",
    title_en: "Health Information",
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
    title_no: "Finansiell Informasjon",
    title_en: "Financial Information",
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
    title_no: "Religiøs og Politisk Informasjon",
    title_en: "Religious and Political Information",
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
    title_no: "Familie- og Arbeidsinformasjon",
    title_en: "Family and Employment Information",
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
    title_no: "Konfidensiell Informasjon",
    title_en: "Confidential Information",
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
          subtitle: "Dokumentasjon av vår personvernpolicy og databehandling",
          lastUpdated: "Sist oppdatert: 15. april 2026",
          shortIntro: "Sørblikket er en journalistisk informasjonstjeneste som behandler offentlige data fra Stortingets åpne API-grensesnitt i samsvar med norsk personopplysningslov og EU-forordning 2016/679 (GDPR).",
          tabDo: "Vår praksis",
          tabDont: "Ikke akseptert",
          tabProtection: "Sikkerhet",
          tabRights: "Dine rettigheter",
          doHeader: "Vår praksis",
          dontHeader: "Hva vi ikke gjør",
          protectionHeader: "Sikkerhetstiltak i søket",
          blockedHeader: "Sensitive opplysninger",
          blockedSubheader: "Ikke last opp sensitive eller personlige opplysninger i søkeboksen.",
          allowedHeader: "Tillatte søk",
          allowedSubheader: "I søkeboksen kan du spørre om:",
          contactHeader: "Kontakt",
          rightsHeader: "Dine juridiske rettigheter",
          promises: [
            "Behandler utelukkende offentlige data fra Stortingets API",
            "Lagrer ikke personlig informasjon om brukere",
            "Bruker ikke sporings- eller markeringskjeks for overvåking",
            "Implementerer automatisk validering av alle forespørsler",
            "Respekterer personvern i samsvar med GDPR",
          ],
          doesNot: [
            "Håndterer sensitiv eller personlig informasjon",
            "Bruker sporings- eller markeringskjeks",
            "Deler data med tredjeparter",
            "Bruker analytikk eller profiler brukere",
          ],
          protectionMeasures: [
            "Automatisk GDPR-basert validering av alle forespørsler",
            "SSL/TLS-kryptering for all datatransport",
            "Sikker database med tilgangskontroll",
            "Streng input-validering og sanitering",
            "Regelmessige sikkerhetsopdateringer og revisjon",
          ],
          rights: [
            "Innsynsrett i behandlede personopplysninger",
            "Rett til sletting (retten til å bli glemt)",
            "Rett til retting av uriktige opplysninger",
            "Rett til innsigelse mot behandling",
            "Rett til dataportabilitet",
          ],
          storageHeader: "Lokale lagringsinnstillinger",
          storageIntro: "Sørblikket lagrer kun ikke-sensitiv informasjon lokalt i nettleseren for å forbedre brukeropplevelsen:",
          storageItems: [
            "Tema-preferanse (lys/mørk modus)",
            "Språkvalg (norsk/engelsk)",
            "Visningstilstand for guider og instruksjoner",
          ],
          storageNote: "Disse innstillingene lagres i nettleserens localStorage og slettes når du tømmer nettleserkachen. Du kan tilbakestille alle innstillinger ved å klikke knappen under.",
          resetSettingsBtn: "Tilbakestill alle innstillinger",
          resetSuccess: "Innstillinger tilbakestilt! Siden lastes på nytt...",
        }
      : {
          title: "Privacy Policy",
          subtitle: "Documentation of our privacy policy and data processing practices",
          lastUpdated: "Last updated: April 15, 2026",
          shortIntro: "Sørblikket is a journalistic information service that processes public data from the Storting's open API in accordance with Norwegian personal data protection legislation and EU Regulation 2016/679 (GDPR).",
          tabDo: "Our Practices",
          tabDont: "Not Accepted",
          tabProtection: "Security",
          tabRights: "Your Rights",
          doHeader: "Our Practices",
          dontHeader: "What we don't do",
          protectionHeader: "Security in search",
          blockedHeader: "Sensitive Information",
          blockedSubheader: "Do not enter sensitive or personal information in the search box.",
          allowedHeader: "Permitted Searches",
          allowedSubheader: "In the search box, you can ask about:",
          contactHeader: "Contact",
          rightsHeader: "Your Legal Rights",
          promises: [
            "Process only public data from the Storting API",
            "Do not store personal information about users",
            "Do not use tracking or marking cookies for monitoring",
            "Implement automatic validation of all requests",
            "Respect privacy in accordance with GDPR",
          ],
          doesNot: [
            "Handle sensitive or personal information",
            "Use tracking or marking cookies",
            "Share data with third parties",
            "Use analytics or profile users",
          ],
          protectionMeasures: [
            "Automatic GDPR-based validation of all requests",
            "SSL/TLS encryption for all data transport",
            "Secure database with access controls",
            "Strict input validation and sanitization",
            "Regular security updates and audits",
          ],
          rights: [
            "Right of access to processed personal data",
            "Right to erasure (right to be forgotten)",
            "Right to rectification of incorrect information",
            "Right to object to processing",
            "Right to data portability",
          ],
          storageHeader: "Local storage settings",
          storageIntro: "Sørblikket only stores non-sensitive information locally in your browser to improve your experience:",
          storageItems: [
            "Theme preference (light/dark mode)",
            "Language choice (Norwegian/English)",
            "Display state for guides and instructions",
          ],
          storageNote: "These settings are stored in your browser's localStorage and will be deleted when you clear your browser cache. You can reset all settings by clicking the button below.",
          resetSettingsBtn: "Reset all settings",
          resetSuccess: "Settings reset! Reloading page...",
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

          {/* Contact and Complaints */}
          <section className="pv-section pv-contact">
            <h2>{t.contactHeader}</h2>
            <div className="pv-contact-grid">
              <div className="pv-contact-card">
                <h3>
                  {lang === "no"
                    ? "Datatilsynet"
                    : "The Norwegian Data Protection Authority"}
                </h3>
                <p>
                  {lang === "no"
                    ? "Klager og henvendelser om personvernbehandlingen:"
                    : "For complaints and concerns regarding privacy handling:"}
                </p>
                <ul className="pv-contact-list">
                  <li>www.datatilsynet.no</li>
                  <li>post@datatilsynet.no</li>
                  <li>+47 21 50 18 50</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Local Storage Section */}
          <section className="pv-section pv-storage">
            <h2>{t.storageHeader}</h2>
            <p>{t.storageIntro}</p>
            <ul className="pv-storage-list">
              {t.storageItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
            <p className="pv-storage-note">{t.storageNote}</p>
            <StorageResetButton lang={lang} resetText={t.resetSettingsBtn} successText={t.resetSuccess} />
          </section>

          {/* Legal Basis Section */}
          <section className="pv-section pv-legal">
            <h2>{lang === "no" ? "Juridisk grunnlag" : "Legal Basis"}</h2>
            <p>
              {lang === "no"
                ? "Behandlingen av data utføres i henhold til følgende juridiske rammer:"
                : "Data processing is carried out in accordance with the following legal frameworks:"}
            </p>
            <ul className="pv-legal-list">
              <li>{lang === "no" ? "EU-forordning 2016/679 (GDPR)" : "EU Regulation 2016/679 (GDPR)"}</li>
              <li>{lang === "no" ? "Norsk personopplysningsloven (LOV-2018-06-15-38)" : "Norwegian Personal Data Protection Act"}</li>
              <li>{lang === "no" ? "Offentleglova (LOV-2006-05-19-16)" : "Freedom of Information Act"}</li>
              <li>{lang === "no" ? "Norsk presseetikks kodeks" : "Norwegian Press Ethics Code"}</li>
            </ul>
          </section>
        </article>
      </main>
    </>
  )
}
