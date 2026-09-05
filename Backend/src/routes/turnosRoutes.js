const router   = require('express').Router();
const ctrl     = require('../controllers/turnosController');
const auth     = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { body } = require('express-validator');

const turnoValidators = [
  body('idCliente').optional({ nullable: true }).isInt({ min: 1 }).withMessage('idCliente inválido'),
  body('clienteNombre').optional({ nullable: true }).isString().trim().isLength({ max: 100 }).withMessage('Nombre del cliente ocasional inválido'),
  body('clienteApellido').optional({ nullable: true }).isString().trim().isLength({ max: 100 }).withMessage('Apellido del cliente ocasional inválido'),
  body('clienteTelefono').optional({ nullable: true }).isString().trim().isLength({ max: 30 }).withMessage('Teléfono del cliente ocasional inválido'),
  body('idServicio').isInt({ min: 1 }).withMessage('idServicio inválido'),
  body('fecha').isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('hora').matches(/^(?:0[78]:30|(?:0[89]|1\d|2[0-3]):(?:00|30))$/).withMessage('La hora debe estar entre 07:30 y 23:30, cada 30 minutos'),
  body('esFijo').optional().isBoolean(),
  body('diaSemana').optional({ nullable: true }).isString(),
  body().custom((value) => {
    const clienteRegistrado = value.idCliente !== undefined && value.idCliente !== null
    const clienteOcasional = Boolean(value.clienteNombre?.trim() && value.clienteApellido?.trim())
    if (!clienteRegistrado && !clienteOcasional) {
      throw new Error('Seleccioná un cliente registrado o ingresá nombre y apellido del cliente ocasional')
    }
    if (clienteRegistrado && (value.clienteNombre || value.clienteApellido)) {
      throw new Error('No mezcles cliente registrado con datos de cliente ocasional')
    }
    if (clienteOcasional && value.esFijo === true) {
      throw new Error('Los clientes ocasionales no pueden tener turnos fijos')
    }
    return true
  }),
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
