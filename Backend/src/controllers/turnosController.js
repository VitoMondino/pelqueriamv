const turnoService = require('../services/turnoService');

const getAll = async (req, res, next) => {
  try {
    const turnos = await turnoService.getAll();
    res.json(turnos);
  } catch (err) { next(err); }
};

const getByFecha = async (req, res, next) => {
  try {
    const turnos = await turnoService.getByFecha(req.params.fecha);
    res.json(turnos);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const turno = await turnoService.getById(Number(req.params.id));
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(turno);
  } catch (err) { next(err); }
};

const getByCliente = async (req, res, next) => {
  try {
    const turnos = await turnoService.getByCliente(Number(req.params.idCliente));
    res.json(turnos);
  } catch (err) { next(err); }
};

const getFijos = async (req, res, next) => {
  try {
    const turnos = await turnoService.getFijos();
    res.json(turnos);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const nuevo = await turnoService.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const actualizado = await turnoService.update(Number(req.params.id), req.body);
    if (!actualizado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const updateEstado = async (req, res, next) => {
  try {
    const actualizado = await turnoService.updateEstado(Number(req.params.id), req.body.estado);
    if (!actualizado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const eliminado = await turnoService.remove(Number(req.params.id));
    if (!eliminado) return res.status(404).json({ error: 'Turno no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
};

const generarFijos = async (req, res, next) => {
  try {
    const { fechaInicio } = req.body;
    if (!fechaInicio) return res.status(400).json({ error: 'fechaInicio requerida (YYYY-MM-DD)' });
    const generados = await turnoService.generarTurnosFijosParaSemana(fechaInicio);
    res.json({ message: `${generados} turno(s) generado(s) para la semana` });
  } catch (err) { next(err); }
};

module.exports = {
  getAll, getByFecha, getById, getByCliente,
  getFijos, create, update, updateEstado, remove, generarFijos,
};
