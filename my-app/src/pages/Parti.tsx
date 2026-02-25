import { useNavigate } from 'react-router-dom';

const partier = [
  { 
    navn: 'Arbeiderpartiet', 
    forkortelse: 'Ap', 
    farge: '#E30613', 
    tekstFarge: '#fff',
    logo: '/logo-images/aplogo.png',             
    nettside: 'https://www.arbeiderpartiet.no/om/',         
  },
  { 
    navn: 'Høyre', 
    forkortelse: 'H', 
    farge: '#2A6ABC', 
    tekstFarge: '#fff',
    logo: '/logo-images/Hlogo.png',
    nettside: '',
  },
  { 
    navn: 'Fremskrittspartiet', 
    forkortelse: 'FrP', 
    farge: '#003F7F', 
    tekstFarge: '#fff',
    logo: '/logo-images/frplogo.png',
    nettside: '',
  },
  { 
    navn: 'Senterpartiet', 
    forkortelse: 'Sp', 
    farge: '#00693E', 
    tekstFarge: '#fff',
    logo: '/logo-images/splogo.png',
    nettside: '',
  },
  { 
    navn: 'Sosialistisk Venstreparti', 
    forkortelse: 'SV', 
    farge: '#ffffff', 
    tekstFarge: '#fff',
    logo: '/logo-images/svlogo.png',
    nettside: '',
  },
  { 
    navn: 'Venstre', 
    forkortelse: 'V', 
    farge: '#00857B', 
    tekstFarge: '#fff',
    logo: '/logo-images/venstre.png',
    nettside: '',
  },
  { 
    navn: 'Kristelig Folkeparti', 
    forkortelse: 'KrF', 
    farge: '#FEEF32', 
    tekstFarge: '#000',
    logo: '/logo-images/krflogobildet.png',
    nettside: '',
  },
  { 
    navn: 'Rødt', 
    forkortelse: 'R', 
    farge: '#ffffff', 
    tekstFarge: '#fff',
    logo: '/logo-images/roedt.svg',
    nettside: 'https://www.arbeiderpartiet.no/om/',
  },
  { 
    navn: 'Miljøpartiet De Grønne', 
    forkortelse: 'MDG', 
    farge: '#377E00', 
    tekstFarge: '#fff',
    logo: '/logo-images/mdglogo.png',
    nettside: '',
  },
];

export default function Parti() {
  const navigate = useNavigate();

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
            {/* Boksen - klikk går til intern side */}
            <div
              onClick={() => navigate(`/parti/${parti.forkortelse.toLowerCase()}`)}
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
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1.04)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
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
            </div>

            {/* Partinavn */}
            <p style={{ marginTop: '0.5rem', fontWeight: '500', textAlign: 'center' }}>
              {parti.navn}
            </p>

            {/* Lenke til nettside */}
            {parti.nettside && (
              <a 
                href={parti.nettside} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ fontSize: '0.85rem', color: '#0065F1' }}
              >
                Besøk nettsiden
              </a>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}