const asistenciaService = require('../services/asistenciaService');

const getByMes = async (req, res, next) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ error: 'Parámetros mes y anio requeridos' });
    const asistencias = await asistenciaService.getByMes(Number(mes), Number(anio));
    res.json(asistencias);
  } catch (err) { next(err); }
};

const getByClienteYMes = async (req, res, next) => {
  try {
    const { mes, anio } = req.query;
    const { idCliente } = req.params;
    if (!mes || !anio) return res.status(400).json({ error: 'Parámetros mes y anio requeridos' });
    const asistencias = await asistenciaService.getByClienteYMes(
      Number(idCliente), Number(mes), Number(anio)
    );
    const total = asistencias.length;
    res.json({ asistencias, total, restantes: 4 - total });
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { idCliente, fecha, mes, anio } = req.body;
    const nueva = await asistenciaService.create({ idCliente, fecha, mes, anio });
    res.status(201).json(nueva);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const eliminada = await asistenciaService.remove(Number(req.params.id));
    if (!eliminada) return res.status(404).json({ error: 'Asistencia no encontrada' });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getByMes, getByClienteYMes, create, remove };
