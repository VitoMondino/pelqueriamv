const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');

const loginValidators = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password requerido'),
];

const registerValidators = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Password mínimo 6 caracteres'),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
];

router.post('/login',    loginValidators,    validate, ctrl.login);
router.post('/register', registerValidators, validate, ctrl.registrar);

module.exports = router;
