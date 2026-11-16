import { z } from 'zod';

export const registerSchema = z.object({
  nom: z.string().min(2),
  email: z.string().email(),
  telephone: z.string().optional(),
  motDePasse: z.string().min(8, 'Au moins 8 caractères'),
});

export const loginSchema = z.object({
  email: z.string().email(),
  motDePasse: z.string().min(1),
});