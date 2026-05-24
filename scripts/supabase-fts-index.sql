-- ============================================================================
-- SQL MIGRERING: Row Level Security (RLS) og Full-Text Search (FTS)
-- ============================================================================
--
-- Kjøres i Supabase SQL Editor:
-- Project Dashboard -> SQL Editor -> New Query -> Lim inn og kjør.
--
-- Denne filen setter opp:
--  1. Row Level Security (RLS) på 'valgløfte'-tabellen for sikkerhet.
--  2. Offentlig lesepolitikk (anon key kan lese alt).
--  3. GIN Full-Text Search-indeks med norsk språkkonfigurasjon for raskt søk.
--
-- ============================================================================

-- 1. Aktiver Row Level Security for 'valgløfte'-tabellen
ALTER TABLE valgløfte ENABLE ROW LEVEL SECURITY;

-- 2. Opprett en policy som tillater offentlig lesetilgang (SELECT) for alle
-- Dette gjør at frontend-appen (React) trygt kan lese data med 'anon key'.
DROP POLICY IF EXISTS "Allow public read access on valgløfte" ON valgløfte;
CREATE POLICY "Allow public read access on valgløfte" 
  ON valgløfte 
  FOR SELECT 
  USING (true);

-- 3. Opprett en fulltekst-søkeindeks på 'tekst'-kolonnen ved bruk av norsk ordbøyningsanalyse
-- Vi bruker GIN (Generalized Inverted Index) og to_tsvector med config 'norwegian'.
CREATE INDEX IF NOT EXISTS valglofte_tekst_fts_idx 
  ON valgløfte 
  USING gin (to_tsvector('norwegian', tekst));
