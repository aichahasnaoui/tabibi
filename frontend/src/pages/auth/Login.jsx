import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../../api/client.js';
import { useAuth } from '../../store/auth.js';

const HOME = { PATIENT: '/', MEDECIN: '/calendrier', SECRETAIRE: '/calendrier', ADMIN: '/admin' };

export default function Login() {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [error, setError] = useState('');
  const setSession = useAuth((s) => s.setSession);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, motDePasse });
      setSession(data);
      nav(HOME[data.user.role] || '/');
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Connexion</h1>
      <label>E-mail<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>Mot de passe<input type="password" value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">Se connecter</button>
      <p className="muted">Pas de compte ? <Link to="/register">Créer un compte patient</Link></p>
    </form>
  );
}
