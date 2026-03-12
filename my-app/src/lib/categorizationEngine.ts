export type ThemeKey = "klima" | "energi" | "samferdsel" | "levekår"

export type CaseItem = {
  id: string
  title: string
  shortTitle: string
  type: string
  status: string
  date: string
  committee: string
  category?: ThemeKey
  score?: number
  matches?: string[]
  relevanceScore?: number
}

type ThemeDef = {
  icon: string
  name: string
  color: string
  accentColor: string
  keywords: string[]
}

const THEME_DEFINITIONS: Record<ThemeKey, ThemeDef> = {
  klima: {
    icon: "🌍",
    name: "Klima og Miljø",
    color: "linear-gradient(135deg,#16a34a,#10b981)",
    accentColor: "#10b981",
    keywords: [
      "klima", "miljø", "miljo", "utslipp", "co2", "fornybar", "grønn", "gronn", "fossil", "natur", "biodiversitet", "omstilling",
    ],
  },
  energi: {
    icon: "⚡",
    name: "Energi og Kraft",
    color: "linear-gradient(135deg,#f59e0b,#f97316)",
    accentColor: "#f59e0b",
    keywords: [
      "energi", "kraft", "strøm", "strom", "vannkraft", "vindkraft", "solenergi", "krafteksport", "gass", "olje", "energieffektivitet",
    ],
  },
  samferdsel: {
    icon: "🚗",
    name: "Samferdsel og Transport",
    color: "linear-gradient(135deg,#0284c7,#06b6d4)",
    accentColor: "#0ea5e9",
    keywords: [
      "transport", "samferdsel", "vei", "jernbane", "tog", "buss", "kollektiv", "ferje", "bro", "tunnel",
    ],
  },
  levekår: {
    icon: "❤️",
    name: "Levekår og Velferd",
    color: "linear-gradient(135deg,#e11d48,#ec4899)",
    accentColor: "#ef4444",
    keywords: [
      "helse", "arbeid", "sosial", "trygd", "pensjon", "skole", "utdanning", "sykehus", "nav", "barnehage",
    ],
  },
}

function safeText(input: string | undefined | null): string {
  return String(input ?? "").toLowerCase()
}

export function levenshteinDistance(str1: string, str2: string): number {
  if (!str1 && !str2) return 1
  if (!str1 || !str2) return 0

  const matrix: number[][] = []
  for (let i = 0; i <= str2.length; i += 1) matrix[i] = [i]
  for (let j = 0; j <= str1.length; j += 1) matrix[0][j] = j

  for (let i = 1; i <= str2.length; i += 1) {
    for (let j = 1; j <= str1.length; j += 1) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  const maxLen = Math.max(str1.length, str2.length)
  if (maxLen === 0) return 1
  return 1 - matrix[str2.length][str1.length] / maxLen
}

export function fuzzyMatch(text: string, keyword: string): number {
  const t = safeText(text)
  const k = safeText(keyword)
  if (!t || !k) return 0

  if (t.includes(k)) return 100
  if (levenshteinDistance(t, k) > 0.7) return 80
  if (k.length >= 4 && t.includes(k.slice(0, 4))) return 60
  return 0
}

export function categorizeSak(caseObj: CaseItem): {
  primary: ThemeKey
  score: number
  matches: string[]
} {
  const fullText = `${caseObj.title} ${caseObj.shortTitle} ${caseObj.committee || ""}`
  const scores: Record<ThemeKey, { score: number; matches: string[] }> = {
    klima: { score: 0, matches: [] },
    energi: { score: 0, matches: [] },
    samferdsel: { score: 0, matches: [] },
    levekår: { score: 0, matches: [] },
  }

  ;(Object.entries(THEME_DEFINITIONS) as [ThemeKey, ThemeDef][]).forEach(([theme, def]) => {
    def.keywords.forEach((keyword) => {
      const match = fuzzyMatch(fullText, keyword)
      if (match > 0) {
        scores[theme].score += match / def.keywords.length
        if (scores[theme].matches.length < 3) scores[theme].matches.push(keyword)
      }
    })

    scores[theme].score = Math.min(100, scores[theme].score)
  })

  const sorted = (Object.entries(scores) as [ThemeKey, { score: number; matches: string[] }][])
    .sort((a, b) => b[1].score - a[1].score)

  return {
    primary: sorted[0][0],
    score: sorted[0][1].score,
    matches: sorted[0][1].matches,
  }
}

export function categorizeCases(casesArray: CaseItem[]): Record<ThemeKey, CaseItem[]> {
  const categorized: Record<ThemeKey, CaseItem[]> = {
    klima: [],
    energi: [],
    samferdsel: [],
    levekår: [],
  }

  casesArray.forEach((item) => {
    const categorization = categorizeSak(item)
    categorized[categorization.primary].push({
      ...item,
      category: categorization.primary,
      score: categorization.score,
      matches: categorization.matches,
    })
  })

  ;(Object.keys(categorized) as ThemeKey[]).forEach((key) => {
    categorized[key].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  })

  return categorized
}

export function searchCases(casesArray: CaseItem[], searchTerm: string): CaseItem[] {
  if (!searchTerm || searchTerm.trim().length === 0) return casesArray

  const term = searchTerm.toLowerCase()
  const terms = term.split(/\s+/).filter(Boolean)

  return casesArray
    .map((item) => {
      let relevanceScore = 0
      const joined = `${item.shortTitle} ${item.title} ${item.committee} ${item.status} ${item.type} ${item.id}`.toLowerCase()

      const titleMatch = fuzzyMatch(item.shortTitle, term)
      if (titleMatch > 0) relevanceScore += titleMatch * 3

      const fullTitleMatch = fuzzyMatch(item.title, term)
      if (fullTitleMatch > 0) relevanceScore += fullTitleMatch * 2

      if (item.committee?.toLowerCase().includes(term)) relevanceScore += 50
      if (item.id?.toLowerCase().includes(term)) relevanceScore += 120
      if (item.type?.toLowerCase().includes(term)) relevanceScore += 40
      if (item.status?.toLowerCase().includes(term)) relevanceScore += 35
      if (terms.every((t) => joined.includes(t))) relevanceScore += 70

      return { ...item, relevanceScore }
    })
    .filter((result) => (result.relevanceScore ?? 0) > 0)
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
}

export function getAllThemes(): Record<ThemeKey, ThemeDef> {
  return THEME_DEFINITIONS
}

export function getTheme(theme: ThemeKey): ThemeDef {
  return THEME_DEFINITIONS[theme]
}

export function getThemeStats(cases: CaseItem[], theme: ThemeKey): {
  total: number
  statusCounts: Record<string, number>
} {
  const themeCases = cases.filter((c) => c.category === theme)
  const statusCounts: Record<string, number> = {
    varslet: 0,
    behandlet: 0,
    til_behandling: 0,
    mottatt: 0,
    trukket: 0,
    bortfalt: 0,
    ukjent: 0,
  }

  themeCases.forEach((c) => {
    const key = String(c.status || "ukjent").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_")
    if (Object.prototype.hasOwnProperty.call(statusCounts, key)) statusCounts[key] += 1
    else statusCounts.ukjent += 1
  })

  return { total: themeCases.length, statusCounts }
}
