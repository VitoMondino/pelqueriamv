const db = require('../config/db');

const getAll = async () => {
  const { rows } = await db.query(
    `SELECT id, nombre, apellido, fecha_cumpleanos, notas, telefono, created_at
     FROM clientes
     ORDER BY apellido, nombre`
  );
  return rows;
};

const getById = async (id) => {
  const { rows } = await db.query(
    'SELECT * FROM clientes WHERE id = $1',
    [id]
  );
  return rows[0] || null;
};

const create = async ({ nombre, apellido, fechaCumpleanos, notas, telefono }) => {
  const { rows } = await db.query(
    `INSERT INTO clientes (nombre, apellido, fecha_cumpleanos, notas, telefono)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [nombre.trim(), apellido.trim(), fechaCumpleanos || null, notas || null, telefono || null]
  );
  return rows[0];
};

const update = async (id, { nombre, apellido, fechaCumpleanos, notas, telefono }) => {
  const { rows } = await db.query(
    `UPDATE clientes
     SET nombre = $2, apellido = $3, fecha_cumpleanos = $4, notas = $5, telefono = $6
     WHERE id = $1
     RETURNING *`,
    [id, nombre.trim(), apellido.trim(), fechaCumpleanos || null, notas || null, telefono || null]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM clientes WHERE id = $1', [id]);
  return rowCount > 0;
};

// Para el job de cumpleaños
const getCumpleanosProximos = async (diasAntes = 5) => {
  const { rows } = await db.query(
    `SELECT id, nombre, apellido, telefono, fecha_cumpleanos
     FROM clientes
     WHERE fecha_cumpleanos IS NOT NULL
       AND TO_CHAR(fecha_cumpleanos, 'MM-DD') =
           TO_CHAR(NOW() + ($1 || ' days')::INTERVAL, 'MM-DD')`,
    [diasAntes]
  );
  return rows;
};

module.exports = { getAll, getById, create, update, remove, getCumpleanosProximos };
