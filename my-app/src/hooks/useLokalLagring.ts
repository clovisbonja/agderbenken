/*
 * ═══════════════════════════════════════════════════════════════════════════
 * LOKAL LAGRING — src/hooks/useLokalLagring.ts
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Generisk React-hook som wrapper localStorage med type-sikkerhet.
 * Verdien lagres som JSON og leses tilbake ved neste besøk.
 *
 * BRUK:
 *   const [tema, setTema] = useLokalLagring<"light" | "dark">("tema", "light")
 *   const [samtykke, setSamtykke] = useLokalLagring<boolean>("cookie-ok", false)
 *
 * FEILHÅNDTERING:
 *   Hvis localStorage ikke er tilgjengelig (f.eks. privat modus eller
 *   tredjepartsblokkering), faller hooken stille tilbake til startverdi.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react"

/**
 * Lagrer og henter en verdi fra localStorage.
 * Fungerer som useState, men verdien overlever sideoppdatering.
 *
 * @param nøkkel  - Unik localStorage-nøkkel, f.eks. "tema" eller "cookie-ok"
 * @param startVerdi - Verdi som brukes første gang (eller hvis lagret verdi mangler)
 * @returns [verdi, settVerdi] — samme API som useState
 */
export function useLokalLagring<T>(nøkkel: string, startVerdi: T): [T, (ny: T) => void] {

  // Les lagret verdi ved oppstart — parse fra JSON, bruk startVerdi ved feil
  const [lagretVerdi, settLagretVerdi] = useState<T>(() => {
    try {
      const rå = localStorage.getItem(nøkkel)
      if (rå === null) return startVerdi
      return JSON.parse(rå) as T
    } catch {
      // localStorage ikke tilgjengelig, eller ugyldig JSON — bruk startverdi
      return startVerdi
    }
  })

  // Oppdater state og lagre til localStorage samtidig
  function settVerdi(nyVerdi: T) {
    settLagretVerdi(nyVerdi)
    try {
      localStorage.setItem(nøkkel, JSON.stringify(nyVerdi))
    } catch {
      // Skriving feilet (f.eks. lagring full) — state er likevel oppdatert
    }
  }

  return [lagretVerdi, settVerdi]
}
