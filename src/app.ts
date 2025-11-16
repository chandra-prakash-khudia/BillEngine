import express from 'express';
import cors from 'cors';
import healthRoutes from './routes/health';
import authRoutes from './routes/auth';
import tenantRoutes from './routes/tenants';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);

app.get('/', (_req, res) => res.json({ ok: true }));

export default app;
