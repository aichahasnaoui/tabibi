import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, errMsg } from '../../api/client.js';

export default function Register() {
  const [f, setF] = useState({ nom: '', email: '', telephone: '', motDePasse: '' });
  const [error, setError] = useState('');
  const nav = useNavigate();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/auth/register', { ...f, telephone: f.telephone || undefined });
      nav('/login');
    } catch (err) {
      const d = err.response?.data;
      setError(d?.erreurs ? d.erreurs.map((x) => `${x.champ} : ${x.message}`).join(' · ') : errMsg(err));
    }
  };

  return (
    <form className="card narrow" onSubmit={submit}>
      <h1>Créer un compte</h1>
      <label>Nom<input value={f.nom} onChange={set('nom')} required /></label>
      <label>E-mail<input type="email" value={f.email} onChange={set('email')} required /></label>
      <label>Téléphone<input value={f.telephone} onChange={set('telephone')} /></label>
      <label>Mot de passe (8 caractères min.)<input type="password" value={f.motDePasse} onChange={set('motDePasse')} required /></label>
      {error && <p className="error">{error}</p>}
      <button className="btn">S'inscrire</button>
      <p className="muted"><Link to="/login">Déjà un compte ?</Link></p>
    </form>
  );
}
