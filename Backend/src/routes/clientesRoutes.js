const router       = require('express').Router();
const ctrl         = require('../controllers/clientesController');
const auth         = require('../middlewares/authMiddleware');
const validate     = require('../middlewares/validate');
const { body }     = require('express-validator');

const clienteValidators = [
  body('nombre').notEmpty().withMessage('Nombre requerido'),
  body('apellido').notEmpty().withMessage('Apellido requerido'),
  body('fechaCumpleanos').optional({ nullable: true }).isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('telefono').optional({ nullable: true }).isString(),
];

router.use(auth); // todas las rutas protegidas

router.get('/',    ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/',   clienteValidators, validate, ctrl.create);
router.put('/:id', clienteValidators, validate, ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
