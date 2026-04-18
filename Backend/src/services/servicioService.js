const db = require('../config/db');

const getAll = async (soloActivos = false) => {
  const where = soloActivos ? "WHERE estado = 'activo'" : '';
  const { rows } = await db.query(
    `SELECT * FROM servicios ${where} ORDER BY nombre_servicio`
  );
  return rows;
};

const getById = async (id) => {
  const { rows } = await db.query('SELECT * FROM servicios WHERE id = $1', [id]);
  return rows[0] || null;
};

const create = async ({ nombreServicio, precio, estado = 'activo' }) => {
  const { rows } = await db.query(
    `INSERT INTO servicios (nombre_servicio, precio, estado)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [nombreServicio.trim(), precio, estado]
  );
  return rows[0];
};

const update = async (id, { nombreServicio, precio, estado }) => {
  const { rows } = await db.query(
    `UPDATE servicios
     SET nombre_servicio = $2, precio = $3, estado = $4
     WHERE id = $1
     RETURNING *`,
    [id, nombreServicio.trim(), precio, estado]
  );
  return rows[0] || null;
};

const cambiarEstado = async (id, estado) => {
  const { rows } = await db.query(
    `UPDATE servicios SET estado = $2 WHERE id = $1 RETURNING *`,
    [id, estado]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM servicios WHERE id = $1', [id]);
  return rowCount > 0;
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove };
