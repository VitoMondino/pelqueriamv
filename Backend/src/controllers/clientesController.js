const clienteService = require('../services/clienteService');

const getAll = async (req, res, next) => {
  try {
    const clientes = await clienteService.getAll();
    res.json(clientes);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const cliente = await clienteService.getById(Number(req.params.id));
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(cliente);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const nuevo = await clienteService.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const actualizado = await clienteService.update(Number(req.params.id), req.body);
    if (!actualizado) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(actualizado);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    const eliminado = await clienteService.remove(Number(req.params.id));
    if (!eliminado) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.status(204).send();
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
