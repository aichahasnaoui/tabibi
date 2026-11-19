import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Identifiant invalide');

export const patientSchema = z.object({
  prenom: z.string().min(2),
  dateNaissance: z.coerce.date().optional(),
});

export const bookSchema = z.object({
  medecinId: objectId,
  patientId: objectId,
  debut: z.coerce.date(),
  motif: z.string().max(200).optional(),
});

export const moveSchema = z.object({ debut: z.coerce.date() });

export const statusSchema = z.object({ statut: z.enum(['HONORE', 'ABSENT']) });

export const dayQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format YYYY-MM-DD'),
  medecinId: objectId.optional(),
});