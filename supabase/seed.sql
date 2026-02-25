insert into public.parties (name, abbreviation, color, website, program_url)
values
  ('Arbeiderpartiet', 'Ap', '#E30613', 'https://www.arbeiderpartiet.no', 'https://www.arbeiderpartiet.no/politikken/partiprogram/'),
  ('Høyre', 'H', '#2A6ABC', 'https://hoyre.no', 'https://hoyre.no/politikk/partiprogram/'),
  ('Fremskrittspartiet', 'FrP', '#003F7F', 'https://www.frp.no', 'https://www.frp.no/files/Program/2025/Program-2025-2029.pdf'),
  ('Senterpartiet', 'Sp', '#00693E', 'https://www.senterpartiet.no', 'https://www.senterpartiet.no/politikk/program-uttaler/Nytt%20prinsipp-%20og%20handlingsprogram%202025-2029'),
  ('Sosialistisk Venstreparti', 'SV', '#C8102E', 'https://www.sv.no', 'https://www.sv.no/partiet/program/'),
  ('Venstre', 'V', '#00857B', 'https://www.venstre.no', 'https://www.venstre.no/politikk/partiprogram/'),
  ('Kristelig Folkeparti', 'KrF', '#FEEF32', 'https://www.krf.no', 'https://krf.no/politikk/politisk-program/'),
  ('Rødt', 'R', '#D71920', 'https://roedt.no', 'https://roedt.no/arbeidsprogram'),
  ('Miljøpartiet De Grønne', 'MDG', '#377E00', 'https://mdg.no', 'https://mdg.no/politikk/');

insert into public.lists (name, description)
values
  ('Prioriterte saker', 'Eksempeldata for lister'),
  ('Valgfylker', 'Eksempeldata for lister');

insert into public.list_items (list_id, title, value, sort_order)
select l.id, v.title, v.value, v.sort_order
from public.lists l
join (
  values
    ('Prioriterte saker', 'Samferdsel', 'E39 og jernbane', 1),
    ('Prioriterte saker', 'Helse', 'Sykehus og fastlegeordning', 2),
    ('Prioriterte saker', 'Næring', 'Grønn industri og energi', 3),
    ('Valgfylker', 'Agder Nord', '5 representanter', 1),
    ('Valgfylker', 'Agder Sør', '4 representanter', 2)
) as v(list_name, title, value, sort_order)
  on l.name = v.list_name;
