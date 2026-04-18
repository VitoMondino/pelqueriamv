require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const cron       = require('node-cron');

const errorHandler         = require('./middlewares/errorHandler');
const { verificarCumpleanos } = require('./services/cumpleanosService');

const app = express();

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting: máximo 100 requests por 15 minutos por IP
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

// Health check
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: `Ruta ${req.method} ${req.url} no encontrada` });
});

// ── Manejo de errores (siempre al final) ─────────────────────
app.use(errorHandler);

// ── Cron: recordatorio cumpleaños todos los días a las 8:00 AM ──
cron.schedule('0 8 * * *', () => {
  console.log('[Cron] Verificando cumpleaños...');
  verificarCumpleanos();
}, { timezone: 'America/Argentina/Buenos_Aires' });

// ── Iniciar servidor ─────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
  console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend permitido: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);
});
