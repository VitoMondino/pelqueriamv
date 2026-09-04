const router = require('express').Router();
const ctrl   = require('../controllers/authController');
const { body } = require('express-validator');
const validate = require('../middlewares/validate');
const auth = require('../middlewares/authMiddleware');
const rateLimit = require('express-rate-limit');

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: 'Demasiados intentos de inicio de sesión. Intentá nuevamente en 15 minutos.' },
});

const loginValidators = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Password requerido'),
];

const registerValidators = [
  body('email').isEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 6 }).withMessage('Password mínimo 6 caracteres'),
  body('nombre').notEmpty().withMessage('Nombre requerido'),
];

router.post('/login', loginRateLimit, loginValidators, validate, ctrl.login);
router.post('/register', auth, (req, res, next) => {
  if (req.user.rol !== 'Administrador') {
    return res.status(403).json({ error: 'Solo un administrador puede registrar usuarios' });
  }
  next();
}, registerValidators, validate, ctrl.registrar);

module.exports = router;
