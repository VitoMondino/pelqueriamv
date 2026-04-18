const router   = require('express').Router();
const ctrl     = require('../controllers/serviciosController');
const auth     = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { body } = require('express-validator');

const servicioValidators = [
  body('nombreServicio').notEmpty().withMessage('Nombre del servicio requerido'),
  body('precio').isFloat({ min: 0 }).withMessage('Precio inválido'),
  body('estado').optional().isIn(['activo', 'inactivo']).withMessage('Estado inválido'),
];

router.use(auth);

router.get('/',                ctrl.getAll);
router.get('/:id',             ctrl.getById);
router.post('/',               servicioValidators, validate, ctrl.create);
router.put('/:id',             servicioValidators, validate, ctrl.update);
router.patch('/:id/estado',
  body('estado').isIn(['activo', 'inactivo']).withMessage('Estado inválido'),
  validate, ctrl.cambiarEstado
);
router.delete('/:id',          ctrl.remove);

module.exports = router;
