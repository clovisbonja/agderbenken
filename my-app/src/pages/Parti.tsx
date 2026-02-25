const partier = [
  { 
    navn: 'Arbeiderpartiet', 
    forkortelse: 'Ap', 
    farge: '#E30613', 
    tekstFarge: '#fff',
    logo: '/logo-images/aplogo.png',             
    nettside: 'https://www.arbeiderpartiet.no/politikken/partiprogram/',         
  },
  { 
    navn: 'Høyre', 
    forkortelse: 'H', 
    farge: '#2A6ABC', 
    tekstFarge: '#fff',
    logo: '/logo-images/Hlogo.png',
    nettside: 'https://hoyre.no/politikk/partiprogram/',
  },
  { 
    navn: 'Fremskrittspartiet', 
    forkortelse: 'FrP', 
    farge: '#003F7F', 
    tekstFarge: '#fff',
    logo: '/logo-images/frplogo.png',
    nettside: 'https://www.frp.no/files/Program/2025/Program-2025-2029.pdf',
  },
  { 
    navn: 'Senterpartiet', 
    forkortelse: 'Sp', 
    farge: '#00693E', 
    tekstFarge: '#fff',
    logo: '/logo-images/splogo.png',
    nettside: 'https://www.senterpartiet.no/politikk/program-uttaler/Nytt%20prinsipp-%20og%20handlingsprogram%202025-2029',
  },
  { 
    navn: 'Sosialistisk Venstreparti', 
    forkortelse: 'SV', 
    farge: '#ffffff', 
    tekstFarge: '#fff',
    logo: '/logo-images/svlogo.png',
    nettside: 'https://www.sv.no/partiet/program/',
  },
  { 
    navn: 'Venstre', 
    forkortelse: 'V', 
    farge: '#00857B', 
    tekstFarge: '#fff',
    logo: '/logo-images/venstre.png',
    nettside: 'https://www.venstre.no/politikk/partiprogram/',
  },
  { 
    navn: 'Kristelig Folkeparti', 
    forkortelse: 'KrF', 
    farge: '#FEEF32', 
    tekstFarge: '#000',
    logo: '/logo-images/krflogobildet.png',
    nettside: 'https://krf.no/politikk/politisk-program/',
  },
  { 
    navn: 'Rødt', 
    forkortelse: 'R', 
    farge: '#ffffff', 
    tekstFarge: '#fff',
    logo: '/logo-images/roedt.svg',
    nettside: 'https://roedt.no/arbeidsprogram',
  },
  { 
    navn: 'Miljøpartiet De Grønne', 
    forkortelse: 'MDG', 
    farge: '#377E00', 
    tekstFarge: '#fff',
    logo: '/logo-images/mdglogo.png',
    nettside: 'https://mdg.no/politikk/',
  },
];

export default function Parti() {
  return (
    <main className="page">
      <h1>Partier</h1>
      <p>Oversikt over alle partiene representert i Agderbenken.</p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '2rem',
        marginTop: '2rem',
        maxWidth: '900px',
      }}>
        {partier.map((parti) => (
          <div
            key={parti.navn}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
            }}
          >
            {/* Boksen - klikk går til partiprogram */}
            <a
              href={parti.nettside}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '100%',
                aspectRatio: '4/3',
                backgroundColor: parti.farge,
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                color: parti.tekstFarge,
                border: '2px solid #ddd',
                transition: 'transform 0.15s, box-shadow 0.15s',
                overflow: 'hidden',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none';
              }}
            >
              {parti.logo ? (
                <img 
                  src={parti.logo} 
                  alt={parti.navn} 
                  style={{ width: '70%', height: '70%', objectFit: 'contain' }} 
                />
              ) : (
                parti.forkortelse
              )}
            </a>

            {/* Partinavn */}
            <p style={{ marginTop: '0.5rem', fontWeight: '500', textAlign: 'center' }}>
              {parti.navn}
            </p>

            {/* Lenke til partiprogram */}
            {parti.nettside && (
              <a 
                href={parti.nettside} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.85rem', color: '#0065F1' }}
              >
                Les partiprogram
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
