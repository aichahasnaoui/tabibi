import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { docsMiddleware } from './docs.js';
import authRoutes from './routes/auth.routes.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';
import doctorRoutes from './routes/doctors.routes.js';
import agendaRoutes from './routes/agenda.routes.js';
import adminRoutes from './routes/admin.routes.js';
import patientRoutes from './routes/patients.routes.js';
import waitlistRoutes from './routes/waitlist.routes.js';
import noteRoutes from './routes/notes.routes.js';
import statsRoutes from './routes/stats.routes.js';
import appointmentRoutes from './routes/appointments.routes.js';

const app = express();

// Swagger avant helmet : la CSP de helmet bloquerait l'interface
app.use('/api/docs', ...docsMiddleware);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api', agendaRoutes); // /api/schedules et /api/absences
app.use('/api/admin', adminRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/waitlist', waitlistRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/stats', statsRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;