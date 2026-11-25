import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/auth.js';
import { api } from '../api/client.js';

const LINKS = {
  PATIENT: [['/', 'Médecins'], ['/mes-rdv', 'Mes rendez-vous']],
  MEDECIN: [['/calendrier', 'Mon calendrier']],
  SECRETAIRE: [['/calendrier', 'Calendrier']],
  ADMIN: [['/admin', 'Tableau de bord']],
};

export default function Navbar() {
  const { user, clear } = useAuth();
  const nav = useNavigate();
  const logout = async () => {
    await api.post('/auth/logout').catch(() => {});
    clear();
    nav('/login');
  };
  return (
    <header className="nav">
      <Link to="/" className="brand">Tabibi</Link>
      <nav>
        {user && (LINKS[user.role] || []).map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
      </nav>
      <div>
        {user ? (
          <>
            <span className="muted">{user.nom}</span>
            <button className="btn ghost" onClick={logout}>Déconnexion</button>
          </>
        ) : (
          <Link to="/login" className="btn">Connexion</Link>
        )}
      </div>
    </header>
  );
}
