-- Aktiver RLS
ALTER TABLE valgløfte ENABLE ROW LEVEL SECURITY;

-- SELECT-policy for anon og authenticated
CREATE POLICY "Alle kan lese valgloefter"
ON valgløfte
FOR SELECT
TO anon, authenticated
USING (true);

-- GIN-indeks for norsk FTS
CREATE INDEX IF NOT EXISTS valglofte_tekst_gin
ON valgløfte
USING GIN (to_tsvector('norwegian', tekst));
