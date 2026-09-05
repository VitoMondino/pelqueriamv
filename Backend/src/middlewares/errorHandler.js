const errorHandler = (err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ERROR ${req.method} ${req.url}:`, err.message);

  // Unique constraint (registro duplicado)
  if (err.code === '23505') {
    return res.status(409).json({ error: 'El registro ya existe' });
  }

  // Conflicto de horario detectado por una restricción o trigger de PostgreSQL.
  if (err.code === '23P01' || (err.code === 'P0001' && /turno|horario/i.test(err.message))) {
    return res.status(409).json({ error: 'Ya existe un turno en esa fecha y horario' });
  }

  // Foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida: el cliente o servicio no existe' });
  }

  // Check constraint violation
  if (err.code === '23514') {
    return res.status(422).json({ error: 'Valor fuera del rango permitido' });
  }

  // RAISE EXCEPTION desde triggers de PostgreSQL
  if (err.code === 'P0001') {
    return res.status(422).json({ error: err.message });
  }

  const status  = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
