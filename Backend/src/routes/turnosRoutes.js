const router   = require('express').Router();
const ctrl     = require('../controllers/turnosController');
const auth     = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { body } = require('express-validator');

const turnoValidators = [
  body('idCliente').isInt({ min: 1 }).withMessage('idCliente inválido'),
  body('idServicio').isInt({ min: 1 }).withMessage('idServicio inválido'),
  body('fecha').isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('hora').matches(/^(?:0[78]:30|(?:0[89]|1\d|2[0-3]):(?:00|30))$/).withMessage('La hora debe estar entre 07:30 y 23:30, cada 30 minutos'),
  body('esFijo').optional().isBoolean(),
  body('diaSemana').optional({ nullable: true }).isString(),
];

router.use(auth);

router.get('/',                          ctrl.getAll);
router.get('/fijos',                     ctrl.getFijos);
router.get('/fecha/:fecha',              ctrl.getByFecha);
router.get('/cliente/:idCliente',        ctrl.getByCliente);
router.get('/:id',                       ctrl.getById);
router.post('/',                         turnoValidators, validate, ctrl.create);
router.post('/generar-fijos',            ctrl.generarFijos);
router.put('/:id',                       turnoValidators, validate, ctrl.update);
router.patch('/:id/estado',
  body('estado').isIn(['pendiente', 'realizado', 'cancelado']).withMessage('Estado inválido'),
  validate, ctrl.updateEstado
);
router.delete('/:id',                    ctrl.remove);

module.exports = router;
