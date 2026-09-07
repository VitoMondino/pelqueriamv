const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

const SALT_ROUNDS = 12;
const JWT_ALGORITHM = 'HS256';

const obtenerJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw Object.assign(new Error('JWT_SECRET no configurado'), { status: 500 });
  }
  return process.env.JWT_SECRET;
};

const login = async (email, password) => {
  const { rows } = await db.query(
    'SELECT * FROM usuarios WHERE email = $1',
    [email.toLowerCase().trim()]
  );

  const usuario = rows[0];
  if (!usuario) {
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  const coincide = await bcrypt.compare(password, usuario.password);
  if (!coincide) {
    throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
  }

  const payload = { id: usuario.id, email: usuario.email, rol: usuario.rol };
  const token   = jwt.sign(payload, obtenerJwtSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    algorithm: JWT_ALGORITHM,
  });

  return {
    token,
    usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre, rol: usuario.rol },
  };
};

const registrar = async (email, password, nombre) => {
  const emailNorm = email.toLowerCase().trim();

  const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [emailNorm]);
  if (existe.rows.length > 0) {
    throw Object.assign(new Error('El email ya está registrado'), { status: 409 });
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await db.query(
    `INSERT INTO usuarios (email, password, nombre)
     VALUES ($1, $2, $3)
     RETURNING id, email, nombre, rol`,
    [emailNorm, hash, nombre.trim()]
  );

  return rows[0];
};

module.exports = { login, registrar };
