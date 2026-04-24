const turnoService = require('../services/turnoService');

const getAll = async (req, res, next) => {
  try { res.json(await turnoService.getAll()) } catch (err) { next(err) }
};

const getByFecha = async (req, res, next) => {
  try { res.json(await turnoService.getByFecha(req.params.fecha)) } catch (err) { next(err) }
};

const getById = async (req, res, next) => {
  try {
    const t = await turnoService.getById(Number(req.params.id))
    if (!t) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json(t)
  } catch (err) { next(err) }
};

const getByCliente = async (req, res, next) => {
  try { res.json(await turnoService.getByCliente(Number(req.params.idCliente))) } catch (err) { next(err) }
};

const getFijos = async (req, res, next) => {
  try { res.json(await turnoService.getFijos()) } catch (err) { next(err) }
};

const create = async (req, res, next) => {
  try {
    const nuevo = await turnoService.create(req.body)
    res.status(201).json(nuevo)
  } catch (err) { next(err) }
};

const update = async (req, res, next) => {
  try {
    const act = await turnoService.update(Number(req.params.id), req.body)
    if (!act) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json(act)
  } catch (err) { next(err) }
};

// Recibe { estado, fecha } — fecha es la fecha visible en pantalla
const updateEstado = async (req, res, next) => {
  try {
    const { estado, fecha } = req.body
    const act = await turnoService.updateEstadoParaFecha(Number(req.params.id), estado, fecha)
    if (!act) return res.status(404).json({ error: 'Turno no encontrado' })
    res.json(act)
  } catch (err) { next(err) }
};

const remove = async (req, res, next) => {
  try {
    const ok = await turnoService.remove(Number(req.params.id))
    if (!ok) return res.status(404).json({ error: 'Turno no encontrado' })
    res.status(204).send()
  } catch (err) { next(err) }
};

const generarFijos = async (req, res, next) => {
  try {
    const { fechaInicio } = req.body
    if (!fechaInicio) return res.status(400).json({ error: 'fechaInicio requerida (YYYY-MM-DD)' })
    const generados = await turnoService.generarTurnosFijosParaSemana(fechaInicio)
    res.json({ message: `${generados} turno(s) generado(s)` })
  } catch (err) { next(err) }
};

module.exports = { getAll, getByFecha, getById, getByCliente, getFijos, create, update, updateEstado, remove, generarFijos };
