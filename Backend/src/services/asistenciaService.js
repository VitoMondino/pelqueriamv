const db = require('../config/db');

const getByClienteYMes = async (idCliente, mes, anio) => {
  const { rows } = await db.query(
    `SELECT a.*, c.nombre, c.apellido
     FROM asistencias a
     JOIN clientes c ON c.id = a.id_cliente
     WHERE a.id_cliente = $1 AND a.mes = $2 AND a.anio = $3
     ORDER BY a.fecha`,
    [idCliente, mes, anio]
  );
  return rows;
};

const getByMes = async (mes, anio) => {
  const { rows } = await db.query(
    `SELECT a.*, c.nombre, c.apellido
     FROM asistencias a
     JOIN clientes c ON c.id = a.id_cliente
     WHERE a.mes = $1 AND a.anio = $2
     ORDER BY c.apellido, c.nombre, a.fecha`,
    [mes, anio]
  );
  return rows;
};

const contarPorClienteMes = async (idCliente, mes, anio) => {
  const { rows } = await db.query(
    `SELECT COUNT(*) AS total
     FROM asistencias
     WHERE id_cliente = $1 AND mes = $2 AND anio = $3`,
    [idCliente, mes, anio]
  );
  return Number(rows[0].total);
};

const create = async ({ idCliente, fecha, mes, anio }) => {
  // El trigger en PostgreSQL valida el máximo de 4, pero validamos acá también
  // para dar un mensaje de error claro antes de ir a la BD
  const total = await contarPorClienteMes(idCliente, mes, anio);
  if (total >= 4) {
    throw Object.assign(
      new Error('El cliente ya tiene 4 asistencias registradas este mes'),
      { status: 422 }
    );
  }

  const { rows } = await db.query(
    `INSERT INTO asistencias (id_cliente, fecha, mes, anio)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [idCliente, fecha, mes, anio]
  );
  return rows[0];
};

const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM asistencias WHERE id = $1', [id]);
  return rowCount > 0;
};

module.exports = { getByClienteYMes, getByMes, contarPorClienteMes, create, remove };
