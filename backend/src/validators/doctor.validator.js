import { z } from 'zod';

const heure = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format HH:MM');

export const registerDoctorSchema = z.object({
  nom: z.string().min(2),
  email: z.string().email(),
  telephone: z.string().optional(),
  motDePasse: z.string().min(8),
  specialite: z.string().min(2),
  numeroOrdre: z.string().min(3),
  tarif: z.number().nonnegative().optional(),
  langues: z.array(z.string()).default([]),
  conventionne: z.boolean().default(false),
  cabinet: z.object({
    nom: z.string().min(2),
    adresse: z.string().min(2),
    ville: z.string().min(2),
    coordinates: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]
  }),
});

export const updateDoctorSchema = z.object({
  specialite: z.string().min(2).optional(),
  tarif: z.number().nonnegative().optional(),
  langues: z.array(z.string()).optional(),
  conventionne: z.boolean().optional(),
});

export const scheduleSchema = z
  .object({
    jourSemaine: z.number().int().min(1).max(7),
    heureDebut: heure,
    heureFin: heure,
    dureeConsultation: z.number().int().min(5).max(240),
  })
  .refine((d) => d.heureFin > d.heureDebut, {
    message: 'heureFin doit être après heureDebut',
    path: ['heureFin'],
  });

export const absenceSchema = z
  .object({
    debut: z.coerce.date(),
    fin: z.coerce.date(),
    motif: z.string().optional(),
  })
  .refine((d) => d.fin > d.debut, { message: 'fin doit être après debut', path: ['fin'] });

export const slotsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
});
export const secretarySchema = z.object({
  nom: z.string().min(2),
  email: z.string().email(),
  telephone: z.string().optional(),
  motDePasse: z.string().min(8),
  cabinetId: z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide'),
});