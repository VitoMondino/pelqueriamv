const servicioService = require('../services/servicioService');

const getAll = async (req, res, next) => {
  try {
    const soloActivos = req.query.activos === 'true';
    const servicios = await servicioService.getAll(soloActivos);
    res.json(servicios);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const servicio = await servicioService.getById(Number(req.params.id));
    if (!servicio) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(servicio);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const nuevo = await servicioService.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const actualizado = await servicioService.update(Number(req.params.id), req.body);
    if (!actualizado) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const cambiarEstado = async (req, res, next) => {
  try {
    const { estado } = req.body;
    const actualizado = await servicioService.cambiarEstado(Number(req.params.id), estado);
    if (!actualizado) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const eliminado = await servicioService.remove(Number(req.params.id));
    if (!eliminado) return res.status(404).json({ error: 'Servicio no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, cambiarEstado, remove };
