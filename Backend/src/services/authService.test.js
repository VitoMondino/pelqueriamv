jest.mock('../config/db', () => ({ query: jest.fn() }))
jest.mock('bcryptjs', () => ({ compare: jest.fn(), hash: jest.fn() }))
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }))

const db = require('../config/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const authService = require('./authService')

describe('authService.login', () => {
  beforeEach(() => {
    db.query.mockReset()
    bcrypt.compare.mockReset()
    jwt.sign.mockReset()
    process.env.JWT_SECRET = 'test-secret'
    delete process.env.JWT_EXPIRES_IN
  })

  test('normaliza el email y devuelve un token con datos públicos del usuario', async () => {
    db.query.mockResolvedValueOnce({ rows: [{
      id: 7, email: 'admin@peluqueria.com', password: 'hash', nombre: 'Admin', rol: 'Administrador',
    }] })
    bcrypt.compare.mockResolvedValueOnce(true)
    jwt.sign.mockReturnValueOnce('token-firmado')

    const result = await authService.login('  ADMIN@PELUQUERIA.COM ', 'password')

    expect(db.query).toHaveBeenCalledWith(
      'SELECT * FROM usuarios WHERE email = $1',
      ['admin@peluqueria.com']
    )
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: 7, email: 'admin@peluqueria.com', rol: 'Administrador' },
      'test-secret',
      { expiresIn: '8h', algorithm: 'HS256' }
    )
    expect(result).toEqual({
      token: 'token-firmado',
      usuario: { id: 7, email: 'admin@peluqueria.com', nombre: 'Admin', rol: 'Administrador' },
    })
  })

  test('rechaza un email inexistente sin comparar ni revelar datos', async () => {
    db.query.mockResolvedValueOnce({ rows: [] })

    await expect(authService.login('missing@example.com', 'password'))
      .rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' })
    expect(bcrypt.compare).not.toHaveBeenCalled()
    expect(jwt.sign).not.toHaveBeenCalled()
  })

  test('rechaza una contraseña incorrecta con el mismo mensaje', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'user@example.com', password: 'hash' }] })
    bcrypt.compare.mockResolvedValueOnce(false)

    await expect(authService.login('user@example.com', 'wrong'))
      .rejects.toMatchObject({ status: 401, message: 'Credenciales inválidas' })
    expect(jwt.sign).not.toHaveBeenCalled()
  })

  test('falla explícitamente si no existe JWT_SECRET', async () => {
    delete process.env.JWT_SECRET
    db.query.mockResolvedValueOnce({ rows: [{ id: 7, email: 'user@example.com', password: 'hash' }] })
    bcrypt.compare.mockResolvedValueOnce(true)

    await expect(authService.login('user@example.com', 'password'))
      .rejects.toMatchObject({ status: 500, message: 'JWT_SECRET no configurado' })
  })
})