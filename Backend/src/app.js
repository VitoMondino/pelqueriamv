require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cron       = require('node-cron');

const errorHandler            = require('./middlewares/errorHandler');
const { verificarCumpleanos } = require('./services/cumpleanosService');

const app = express();

// ── Trust proxy (requerido en Render / Heroku / Railway) ─────
app.set('trust proxy', 1);

// ── CORS ─────────────────────────────────────────────────────
const origenesPermitidos = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (origenesPermitidos.includes(origin)) return callback(null, true);
    callback(new Error(`CORS bloqueado para: ${origin}`));
  },
  credentials: true,
}));

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet());

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { error: 'Demasiadas solicitudes, intentá más tarde' },
}));

// ── Parsing ──────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rutas ────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/authRoutes'));
app.use('/api/clientes',    require('./routes/clientesRoutes'));
app.use('/api/servicios',   require('./routes/serviciosRoutes'));
app.use('/api/turnos',      require('./routes/turnosRoutes'));
app.use('/api/asistencias', require('./routes/asistenciasRoutes'));

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) => res.status(404).json({ error: `Ruta ${req.method} ${req.url} no encontrada` }));

// ── Errores ──────────────────────────────────────────────────
app.use(errorHandler);

// ── Cron cumpleaños ──────────────────────────────────────────
cron.schedule('0 8 * * *', () => {
  console.log('[Cron] Verificando cumpleaños...');
  verificarCumpleanos();
}, { timezone: 'America/Argentina/Buenos_Aires' });

// ── Servidor ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Orígenes CORS: ${origenesPermitidos.join(', ')}\n`);
});
