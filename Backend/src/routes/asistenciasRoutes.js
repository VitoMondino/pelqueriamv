const router   = require('express').Router();
const ctrl     = require('../controllers/asistenciasController');
const auth     = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validate');
const { body } = require('express-validator');

const asistenciaValidators = [
  body('idCliente').isInt({ min: 1 }).withMessage('idCliente inválido'),
  body('fecha').isDate().withMessage('Fecha inválida (YYYY-MM-DD)'),
  body('mes').isInt({ min: 1, max: 12 }).withMessage('Mes inválido'),
  body('anio').isInt({ min: 2000 }).withMessage('Año inválido'),
];

router.use(auth);

router.get('/',                        ctrl.getByMes);          // ?mes=&anio=
router.get('/cliente/:idCliente',      ctrl.getByClienteYMes);  // ?mes=&anio=
router.post('/',                       asistenciaValidators, validate, ctrl.create);
router.delete('/:id',                  ctrl.remove);

module.exports = router;
