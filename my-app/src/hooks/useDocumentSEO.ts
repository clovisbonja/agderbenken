import { useEffect } from "react"

/**
 * Custom hook to dynamically update page title and meta description for SEO.
 */
export function useDocumentSEO(title: string, description: string) {
  useEffect(() => {
    document.title = title
    const metaDesc = document.querySelector('meta[name="description"]')
    if (metaDesc) {
      metaDesc.setAttribute("content", description)
    }
  }, [title, description])
}
