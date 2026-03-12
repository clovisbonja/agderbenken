import Forside from "./Forside"

type StatistikkProps = {
  lang: "no" | "en"
}

export default function Statistikk({ lang }: StatistikkProps) {
  return <Forside lang={lang} />
}

