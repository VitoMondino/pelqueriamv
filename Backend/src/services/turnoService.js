const db = require('../config/db');

const getAll = async () => {
  const { rows } = await db.query(
    `SELECT t.*, c.nombre, c.apellido, c.telefono, s.nombre_servicio, s.precio
     FROM turnos t
     JOIN clientes  c ON c.id = t.id_cliente
     JOIN servicios s ON s.id = t.id_servicio
     ORDER BY t.fecha DESC, t.hora`
  );
  return rows;
};

const getByFecha = async (fecha) => {
  const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const diaSemana = dias[new Date(fecha + 'T00:00:00').getDay()];

  const { rows } = await db.query(
    `SELECT t.*, c.nombre, c.apellido, c.telefono, s.nombre_servicio, s.precio
     FROM turnos t
     JOIN clientes  c ON c.id = t.id_cliente
     JOIN servicios s ON s.id = t.id_servicio
     WHERE
       (t.fecha = $1)
       OR (
         t.es_fijo = TRUE
         AND LOWER(t.dia_semana) = LOWER($2)
         AND t.fecha <= $1
         AND t.estado = 'pendiente'
         AND t.fecha != $1
       )
     ORDER BY t.hora`,
    [fecha, diaSemana]
  );
  return rows;
};

const getById = async (id) => {
  const { rows } = await db.query(
    `SELECT t.*, c.nombre, c.apellido, c.telefono, s.nombre_servicio, s.precio
     FROM turnos t
     JOIN clientes  c ON c.id = t.id_cliente
     JOIN servicios s ON s.id = t.id_servicio
     WHERE t.id = $1`,
    [id]
  );
  return rows[0] || null;
};

const getByCliente = async (idCliente) => {
  const { rows } = await db.query(
    `SELECT t.*, s.nombre_servicio, s.precio
     FROM turnos t
     JOIN servicios s ON s.id = t.id_servicio
     WHERE t.id_cliente = $1
     ORDER BY t.fecha DESC, t.hora`,
    [idCliente]
  );
  return rows;
};

const getFijos = async () => {
  const { rows } = await db.query(
    `SELECT t.*, c.nombre, c.apellido, c.telefono, s.nombre_servicio
     FROM turnos t
     JOIN clientes  c ON c.id = t.id_cliente
     JOIN servicios s ON s.id = t.id_servicio
     WHERE t.es_fijo = TRUE
     ORDER BY t.dia_semana, t.hora`
  );
  return rows;
};

const create = async ({ idCliente, idServicio, fecha, hora, diaSemana, esFijo, notas }) => {
  const { rows } = await db.query(
    `INSERT INTO turnos (id_cliente, id_servicio, fecha, hora, dia_semana, es_fijo, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [idCliente, idServicio, fecha, hora, diaSemana || null, esFijo || false, notas || null]
  );
  return rows[0];
};

const updateEstado = async (id, estado) => {
  const { rows } = await db.query(
    `UPDATE turnos SET estado = $2 WHERE id = $1 RETURNING *`,
    [id, estado]
  );
  return rows[0] || null;
};

const update = async (id, { idCliente, idServicio, fecha, hora, diaSemana, esFijo, notas }) => {
  const { rows } = await db.query(
    `UPDATE turnos
     SET id_cliente = $2, id_servicio = $3, fecha = $4, hora = $5,
         dia_semana = $6, es_fijo = $7, notas = $8
     WHERE id = $1
     RETURNING *`,
    [id, idCliente, idServicio, fecha, hora, diaSemana || null, esFijo || false, notas || null]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM turnos WHERE id = $1', [id]);
  return rowCount > 0;
};

// Genera instancias de turnos fijos para una semana — usa transacción
const generarTurnosFijosParaSemana = async (fechaInicio) => {
  const diasMap = {
    domingo: 0, lunes: 1, martes: 2, miercoles: 3,
    jueves: 4, viernes: 5, sabado: 6,
  };

  const fijos  = await getFijos();
  const client = await db.getClient();

  try {
    await client.query('BEGIN');
    let generados = 0;

    for (const turno of fijos) {
      const diaTarget  = diasMap[turno.dia_semana?.toLowerCase()] ?? 0;
      const base       = new Date(fechaInicio);
      const diff       = (diaTarget - base.getDay() + 7) % 7;
      const fechaTurno = new Date(base);
      fechaTurno.setDate(base.getDate() + diff);

      const fechaStr = fechaTurno.toISOString().split('T')[0];
      const result   = await client.query(
        `INSERT INTO turnos (id_cliente, id_servicio, fecha, hora, dia_semana, es_fijo, estado)
         VALUES ($1, $2, $3, $4, $5, FALSE, 'pendiente')
         ON CONFLICT DO NOTHING`,
        [turno.id_cliente, turno.id_servicio, fechaStr, turno.hora, turno.dia_semana]
      );
      generados += result.rowCount;
    }

    await client.query('COMMIT');
    return generados;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = {
  getAll, getByFecha, getById, getByCliente,
  getFijos, create, update, updateEstado, remove,
  generarTurnosFijosParaSemana,
};
