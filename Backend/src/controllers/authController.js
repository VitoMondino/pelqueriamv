const authService = require('../services/authService');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const resultado = await authService.login(email, password);
    res.json(resultado);
  } catch (err) { next(err); }
};

const registrar = async (req, res, next) => {
  try {
    const { email, password, nombre } = req.body;
    const usuario = await authService.registrar(email, password, nombre);
    res.status(201).json(usuario);
  } catch (err) { next(err); }
};

module.exports = { login, registrar };
