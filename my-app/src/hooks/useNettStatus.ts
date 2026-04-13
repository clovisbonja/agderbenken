/*
 * useNettStatus — lytter på nettlesernes online/offline-events.
 * Returnerer true hvis tilkoblet, false hvis frakoblet.
 */

import { useEffect, useState } from "react"

export function useNettStatus(): boolean {
  const [erOnline, setErOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const gåOnline  = () => setErOnline(true)
    const gåOffline = () => setErOnline(false)

    window.addEventListener("online",  gåOnline)
    window.addEventListener("offline", gåOffline)

    return () => {
      window.removeEventListener("online",  gåOnline)
      window.removeEventListener("offline", gåOffline)
    }
  }, [])

  return erOnline
}
