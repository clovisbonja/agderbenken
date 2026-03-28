/*
 * ═══════════════════════════════════════════════════════════════════════════
 * XML-PARSING HJELPER — src/utils/xml.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Stortingets API returnerer data som XML (ikke JSON).
 * Denne filen inneholder hjelpefunksjoner for å parse og lese XML-data
 * fra Stortinget på en trygg og konsistent måte.
 *
 * EKSEMPEL PÅ XML FRA STORTINGET:
 * ─────────────────────────────────────────────────────────────────────────
 * <saker xmlns="http://data.stortinget.no">
 *   <sak>
 *     <id>12345</id>
 *     <tittel>Representantforslag om ...</tittel>
 *     <korttittel>Forslag om ...</korttittel>
 *     <status>til behandling</status>
 *     <dato>2024-11-15</dato>
 *     <komite>
 *       <navn>Helse- og omsorgskomiteen</navn>
 *     </komite>
 *   </sak>
 * </saker>
 * ─────────────────────────────────────────────────────────────────────────
 *
 * VIKTIG: XML-et fra Stortinget bruker namespace.
 * Bruk getElementsByTagNameNS("*", navn) — ikke querySelector — for
 * å sikre at navnerom-problemer ikke skaper feil.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

// ── Parsing ───────────────────────────────────────────────────────────────────

/**
 * Parser en XML-streng og returnerer et DOM-dokument.
 * Håndterer parsing-feil ved å returnere et tomt dokument.
 *
 * Merk: Bruker nettleserens innebygde DOMParser — fungerer i alle moderne
 * nettlesere, men ikke i Node.js-miljø uten polyfill.
 */
export function parseXml(xmlTekst: string): Document {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlTekst, "application/xml")

  // Sjekk om det oppsto parsing-feil
  const feilNode = doc.querySelector("parsererror")
  if (feilNode) {
    console.warn("[xml.ts] Parsing-feil i XML-respons:", feilNode.textContent)
  }

  return doc
}

// ── Element-søk ───────────────────────────────────────────────────────────────

/**
 * Henter alle elementer med et bestemt tagnavn fra et dokument eller element.
 * Bruker wildcard namespace (*) for å unngå navnerom-problemer.
 *
 * Eksempel: hentElementer(doc, "sak") → alle <sak>-elementer
 */
export function hentElementer(
  forelder: Document | Element,
  tagnavn: string
): Element[] {
  if ("getElementsByTagNameNS" in forelder) {
    return Array.from(
      (forelder as Document).getElementsByTagNameNS("*", tagnavn)
    )
  }
  return Array.from(forelder.getElementsByTagName(tagnavn))
}

/**
 * Henter første direkte barn-element med et bestemt navn.
 * Returnerer null hvis ikke funnet.
 *
 * Eksempel: hentBarn(sakElement, "komite") → <komite>-elementet
 */
export function hentBarn(
  forelder: Element | null | undefined,
  tagnavn: string
): Element | null {
  if (!forelder) return null
  return (
    Array.from(forelder.children).find(
      (barn) => barn.localName === tagnavn
    ) ?? null
  )
}

/**
 * Henter tekstinnholdet til et navngitt barn-element.
 * Returnerer tom streng hvis elementet ikke finnes.
 *
 * Eksempel: hentTekst(sakElement, "tittel") → "Representantforslag om..."
 */
export function hentTekst(
  forelder: Element | null | undefined,
  tagnavn: string
): string {
  return hentBarn(forelder, tagnavn)?.textContent?.trim() ?? ""
}
