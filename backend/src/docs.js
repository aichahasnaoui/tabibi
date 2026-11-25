import swaggerUi from 'swagger-ui-express';

const bearer = [{ bearerAuth: [] }];
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'string' } };
const json = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const ok = (d = 'OK') => ({ responses: { 200: { description: d } } });

const spec = {
  openapi: '3.0.3',
  info: { title: 'Tabibi API', version: '1.0.0', description: 'Prise de rendez-vous médicaux' },
  servers: [{ url: '/api' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
  paths: {
    '/auth/register': { post: { tags: ['Auth'], summary: 'Inscription patient',
      requestBody: json({ type: 'object', properties: { nom: { type: 'string' }, email: { type: 'string' }, motDePasse: { type: 'string' } } }),
      responses: { 201: { description: 'Créé' }, 409: { description: 'E-mail déjà utilisé' } } } },
    '/auth/login': { post: { tags: ['Auth'], summary: 'Connexion (access token + cookie refresh)',
      requestBody: json({ type: 'object', properties: { email: { type: 'string' }, motDePasse: { type: 'string' } } }),
      responses: { 200: { description: 'OK' }, 401: { description: 'Identifiants invalides' } } } },
    '/auth/refresh': { post: { tags: ['Auth'], summary: 'Nouveau access token via cookie', ...ok() } },
    '/auth/logout': { post: { tags: ['Auth'], security: bearer, summary: 'Déconnexion', responses: { 204: { description: 'OK' } } } },

    '/doctors': { get: { tags: ['Médecins'], summary: 'Recherche (specialite, ville, langue, conventionne)',
      parameters: ['specialite', 'ville', 'langue', 'conventionne'].map((n) => ({ name: n, in: 'query', schema: { type: 'string' } })), ...ok() } },
    '/doctors/register': { post: { tags: ['Médecins'], summary: 'Inscription médecin (en attente de validation)',
      requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' } } } },
    '/doctors/{id}': { get: { tags: ['Médecins'], summary: 'Fiche publique', parameters: [idParam], ...ok() } },
    '/doctors/{id}/slots': { get: { tags: ['Médecins'], summary: 'Créneaux libres (from, to : YYYY-MM-DD)',
      parameters: [idParam, { name: 'from', in: 'query', required: true, schema: { type: 'string' } }, { name: 'to', in: 'query', required: true, schema: { type: 'string' } }], ...ok() } },
    '/doctors/me': { put: { tags: ['Médecins'], security: bearer, summary: 'Modifier mon profil', requestBody: json({ type: 'object' }), ...ok() } },

    '/schedules': {
      get: { tags: ['Agenda'], security: bearer, summary: 'Mon agenda type', ...ok() },
      post: { tags: ['Agenda'], security: bearer, summary: 'Ajouter une plage', requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' }, 409: { description: 'Chevauchement' } } } },
    '/absences': {
      get: { tags: ['Agenda'], security: bearer, summary: 'Mes absences', ...ok() },
      post: { tags: ['Agenda'], security: bearer, summary: 'Ajouter une absence', requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' } } } },

    '/patients': {
      get: { tags: ['Patients'], security: bearer, summary: 'Moi et mes proches', ...ok() },
      post: { tags: ['Patients'], security: bearer, summary: 'Ajouter un proche', requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' } } } },

    '/appointments': { post: { tags: ['Rendez-vous'], security: bearer, summary: 'Réserver (patient ou secrétaire)',
      requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' }, 409: { description: 'Créneau pris / quota' } } } },
    '/appointments/mine': { get: { tags: ['Rendez-vous'], security: bearer, summary: 'Mes rendez-vous', ...ok() } },
    '/appointments/day': { get: { tags: ['Rendez-vous'], security: bearer, summary: 'Planning du jour (médecin, secrétaire), sans notes',
      parameters: [{ name: 'date', in: 'query', required: true, schema: { type: 'string' } }, { name: 'medecinId', in: 'query', schema: { type: 'string' } }], ...ok() } },
    '/appointments/{id}/cancel': { patch: { tags: ['Rendez-vous'], security: bearer, summary: 'Annuler (patient : 12 h avant)', parameters: [idParam], ...ok() } },
    '/appointments/{id}/move': { patch: { tags: ['Rendez-vous'], security: bearer, summary: 'Déplacer', parameters: [idParam], requestBody: json({ type: 'object' }), ...ok() } },
    '/appointments/{id}/confirm': { patch: { tags: ['Rendez-vous'], security: bearer, summary: 'Confirmer', parameters: [idParam], ...ok() } },
    '/appointments/{id}/status': { patch: { tags: ['Rendez-vous'], security: bearer, summary: 'Marquer HONORE ou ABSENT (médecin)', parameters: [idParam], requestBody: json({ type: 'object' }), ...ok() } },

    '/waitlist': { post: { tags: ['Liste d\'attente'], security: bearer, summary: 'S\'inscrire sur un jour complet', requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' } } } },
    '/waitlist/mine': { get: { tags: ['Liste d\'attente'], security: bearer, summary: 'Mes inscriptions', ...ok() } },
    '/waitlist/{id}/confirm': { post: { tags: ['Liste d\'attente'], security: bearer, summary: 'Confirmer la place proposée (30 min)', parameters: [idParam], requestBody: json({ type: 'object' }), responses: { 201: { description: 'Réservé' } } } },

    '/notes/{appointmentId}': {
      get: { tags: ['Notes'], security: bearer, summary: 'Lire ma note (médecin auteur seulement)', parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], ...ok() },
      put: { tags: ['Notes'], security: bearer, summary: 'Écrire ma note', parameters: [{ name: 'appointmentId', in: 'path', required: true, schema: { type: 'string' } }], requestBody: json({ type: 'object' }), ...ok() } },

    '/stats/admin': { get: { tags: ['Tableau de bord'], security: bearer, summary: 'Indicateurs admin (ville optionnelle)', ...ok() } },
    '/stats/doctor': { get: { tags: ['Tableau de bord'], security: bearer, summary: 'Indicateurs médecin', ...ok() } },

    '/admin/doctors/{id}/validate': { patch: { tags: ['Admin'], security: bearer, summary: 'Valider un médecin', parameters: [idParam], ...ok() } },
    '/admin/secretaires': { post: { tags: ['Admin'], security: bearer, summary: 'Créer une secrétaire rattachée à un cabinet', requestBody: json({ type: 'object' }), responses: { 201: { description: 'Créé' } } } },
  },
};

export const docsMiddleware = [swaggerUi.serve, swaggerUi.setup(spec)];