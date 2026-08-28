const db = require('../config/db');

const validarHorario = (hora) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(hora));
  if (!match) return false;
  const minutos = Number(match[1]) * 60 + Number(match[2]);
  return minutos >= 450 && minutos <= 1410 && minutos % 30 === 0;
};

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
    `SELECT 
       t.id, t.id_cliente, t.id_servicio, t.fecha, t.hora, t.dia_semana, t.es_fijo, t.notas,
       CASE 
         WHEN t.es_fijo = TRUE AND t.fecha::date != $1::date THEN 'pendiente' 
         ELSE t.estado 
       END AS estado,
       c.nombre, c.apellido, c.telefono, s.nombre_servicio, s.precio
     FROM turnos t
     JOIN clientes  c ON c.id = t.id_cliente
     JOIN servicios s ON s.id = t.id_servicio
     WHERE
       -- Turnos directos para esta fecha (fijos o no)
       (t.fecha = $1)
       OR (
         -- Turno fijo que aplica a este día de semana
         t.es_fijo = TRUE
         AND LOWER(t.dia_semana) = LOWER($2)
         AND t.fecha <= $1
         AND t.fecha != $1
         -- Excluir si ya existe una ocurrencia concreta (no fija) para esta fecha
         -- con mismo cliente, servicio y hora (::time para normalizar formato)
         AND NOT EXISTS (
           SELECT 1 FROM turnos t2
           WHERE t2.id_cliente  = t.id_cliente
             AND t2.id_servicio = t.id_servicio
             AND t2.hora::time  = t.hora::time
             AND t2.fecha       = $1
             AND t2.es_fijo     = FALSE
         )
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

const validarDisponibilidad = async (fecha, hora, excludeId = null) => {
  if (!validarHorario(hora)) {
    throw Object.assign(
      new Error('La hora debe estar entre 07:30 y 23:30, cada 30 minutos'),
      { status: 422 }
    );
  }
  const [hh, mm] = hora.split(':').map(Number);
  const minutos  = hh * 60 + mm;

  let rows;
  if (excludeId) {
    const res = await db.query(
      `SELECT id, hora FROM turnos
       WHERE fecha = $1 AND estado != 'cancelado' AND id != $2`,
      [fecha, excludeId]
    );
    rows = res.rows;
  } else {
    const res = await db.query(
      `SELECT id, hora FROM turnos
       WHERE fecha = $1 AND estado != 'cancelado'`,
      [fecha]
    );
    rows = res.rows;
  }

  for (const t of rows) {
    const [th, tm] = t.hora.slice(0, 5).split(':').map(Number);
    const tMin = th * 60 + tm;
    let diff   = Math.abs(tMin - minutos);
    if (diff > 720) diff = 1440 - diff;
    if (diff < 30) {
      return {
        disponible: false,
        mensaje: `Ya existe un turno a las ${t.hora.slice(0, 5)}. Los turnos deben tener al menos 30 minutos de diferencia.`,
      };
    }
  }
  return { disponible: true };
};

const create = async ({ idCliente, idServicio, fecha, hora, diaSemana, esFijo, notas }) => {
  const check = await validarDisponibilidad(fecha, hora);
  if (!check.disponible) {
    throw Object.assign(new Error(check.mensaje), { status: 422 });
  }
  const { rows } = await db.query(
    `INSERT INTO turnos (id_cliente, id_servicio, fecha, hora, dia_semana, es_fijo, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [idCliente, idServicio, fecha, hora, diaSemana || null, esFijo || false, notas || null]
  );
  return rows[0];
};

const update = async (id, { idCliente, idServicio, fecha, hora, diaSemana, esFijo, notas }) => {
  const check = await validarDisponibilidad(fecha, hora, id);
  if (!check.disponible) {
    throw Object.assign(new Error(check.mensaje), { status: 422 });
  }
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

// Para turnos fijos en una fecha distinta a la original:
// busca si ya existe una ocurrencia para ese día y la actualiza,
// si no existe la crea. Así evita duplicados.
const updateEstadoParaFecha = async (id, estado, fechaVista) => {
  const turno = await getById(id);
  if (!turno) return null;

  // Parseo seguro a YYYY-MM-DD evitando problemas de Timezone
  let fechaTurno = '';
  if (turno.fecha instanceof Date) {
    const yyyy = turno.fecha.getFullYear();
    const mm = String(turno.fecha.getMonth() + 1).padStart(2, '0');
    const dd = String(turno.fecha.getDate()).padStart(2, '0');
    fechaTurno = `${yyyy}-${mm}-${dd}`;
  } else if (typeof turno.fecha === 'string') {
    fechaTurno = turno.fecha.split('T')[0];
  }

  if (turno.es_fijo && fechaVista && fechaVista !== fechaTurno) {
    // Buscar si ya existe una ocurrencia concreta para esta fecha
    const { rows: existente } = await db.query(
      `SELECT id FROM turnos
       WHERE id_cliente  = $1
         AND id_servicio = $2
         AND hora::time  = $3::time
         AND fecha       = $4
         AND es_fijo     = FALSE`,
      [turno.id_cliente, turno.id_servicio, turno.hora, fechaVista]
    );

    if (existente.length > 0) {
      // Ya existe — solo actualizar el estado
      const { rows } = await db.query(
        `UPDATE turnos SET estado = $2 WHERE id = $1 RETURNING *`,
        [existente[0].id, estado]
      );
      return rows[0];
    } else {
      // No existe — crear ocurrencia nueva
      const { rows } = await db.query(
        `INSERT INTO turnos
           (id_cliente, id_servicio, fecha, hora, dia_semana, es_fijo, estado, notas)
         VALUES ($1, $2, $3, $4, $5, FALSE, $6, $7)
         RETURNING *`,
        [turno.id_cliente, turno.id_servicio, fechaVista,
         turno.hora, turno.dia_semana, estado, turno.notas]
      );
      return rows[0];
    }
  }

  // Turno normal o misma fecha: actualizar directo
  const { rows } = await db.query(
    `UPDATE turnos SET estado = $2 WHERE id = $1 RETURNING *`,
    [id, estado]
  );
  return rows[0] || null;
};

const updateEstado = async (id, estado) => {
  const { rows } = await db.query(
    `UPDATE turnos SET estado = $2 WHERE id = $1 RETURNING *`,
    [id, estado]
  );
  return rows[0] || null;
};

const remove = async (id) => {
  const { rowCount } = await db.query('DELETE FROM turnos WHERE id = $1', [id]);
  return rowCount > 0;
};

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
      const fechaStr   = fechaTurno.toISOString().split('T')[0];
      const result = await client.query(
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
  getFijos, create, update, updateEstado, updateEstadoParaFecha, remove,
  generarTurnosFijosParaSemana,
};