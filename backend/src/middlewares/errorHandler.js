import { ZodError } from 'zod';

export function notFound(req, res) {
  res.status(404).json({ message: 'Route introuvable' });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Données invalides',
      erreurs: err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message })),
    });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Cette valeur existe déjà' });
  }
  if (err.name === 'CastError') {
  return res.status(400).json({ message: 'Identifiant invalide' });
}
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({ message: status === 500 ? 'Erreur serveur' : err.message });
}