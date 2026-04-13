-- Kjør dette i Supabase SQL Editor for å opprette tabellen for Agder-spesifikke løfter
-- https://supabase.com/dashboard → ditt prosjekt → SQL Editor

CREATE TABLE IF NOT EXISTS agder_lofte (
  id           serial PRIMARY KEY,
  -- Hvem som lovet/krevde
  representant_id    text NOT NULL,           -- f.eks. "JRGKRI"
  representant_navn  text NOT NULL,           -- f.eks. "Jørgen H. Kristiansen"
  parti              text NOT NULL,           -- f.eks. "KrF"
  -- Selve løftet/kravet
  tekst              text NOT NULL,
  kategori           text,                    -- "Samferdsel", "Helse" osv.
  -- Kilde
  kilde_type         text DEFAULT 'sporsmal', -- 'sporsmal', 'tale', 'partiprogram'
  kilde_url          text,
  stortinget_id      text,                    -- saks-ID fra Stortinget
  dato               date,
  -- Oppfyllelsesstatus
  status             text DEFAULT 'ikke_behandlet',
  -- 'ikke_behandlet' | 'under_behandling' | 'oppfylt' | 'avvist'
  created_at         timestamptz DEFAULT now()
);

-- RLS: alle kan lese, kun service_role kan skrive
ALTER TABLE agder_lofte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese agder_lofte"
  ON agder_lofte FOR SELECT USING (true);
