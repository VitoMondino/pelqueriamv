const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max:      10,
  idleTimeoutMillis:      30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

pool.on('connect', () => {
  console.log('[DB] Nueva conexión establecida');
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool:', err.message);
  process.exit(1);
});

module.exports = {
  query:     (text, params) => pool.query(text, params),
  getClient: ()             => pool.connect(),
};
