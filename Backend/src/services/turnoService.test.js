jest.mock('../config/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}))

const db = require('../config/db')
const turnoService = require('./turnoService')

describe('turnoService.create', () => {
  beforeEach(() => {
    db.query.mockReset()
  })

  test('rechaza horas fuera del rango permitido', async () => {
    await expect(turnoService.create({
      idCliente: 1,
      idServicio: 1,
      fecha: '2026-09-04',
      hora: '07:00',
    })).rejects.toMatchObject({
      status: 422,
      message: 'La hora debe estar entre 07:30 y 23:30, cada 30 minutos',
    })

    expect(db.query).not.toHaveBeenCalled()
  })

  test('rechaza un turno en el mismo horario que otro activo', async () => {
    db.query.mockResolvedValueOnce({ rows: [{ id: 10, hora: '10:00' }] })

    await expect(turnoService.create({
      idCliente: 1,
      idServicio: 1,
      fecha: '2026-09-04',
      hora: '10:00',
    })).rejects.toMatchObject({
      status: 422,
      message: 'Ya existe un turno a las 10:00. Los turnos deben tener al menos 30 minutos de diferencia.',
    })

    expect(db.query).toHaveBeenCalledTimes(1)
  })

  test('permite un turno exactamente a 30 minutos y guarda los valores normalizados', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 10, hora: '10:00' }] })
      .mockResolvedValueOnce({ rows: [{ id: 11 }] })

    const result = await turnoService.create({
      idCliente: 1,
      idServicio: 2,
      fecha: '2026-09-04',
      hora: '10:30',
      diaSemana: '',
      esFijo: false,
      notas: '',
    })

    expect(result).toEqual({ id: 11 })
    expect(db.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO turnos'),
      [1, null, null, null, 2, '2026-09-04', '10:30', null, false, null]
    )
  })

  test('permite crear un turno para un cliente ocasional', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 12 }] })

    const result = await turnoService.create({
      clienteNombre: 'Ana',
      clienteApellido: 'Gomez',
      clienteTelefono: '3511234567',
      idServicio: 2,
      fecha: '2026-09-04',
      hora: '11:00',
    })

    expect(result).toEqual({ id: 12 })
    expect(db.query).toHaveBeenNthCalledWith(2,
      expect.stringContaining('INSERT INTO turnos'),
      [null, 'Ana', 'Gomez', '3511234567', 2, '2026-09-04', '11:00', null, false, null]
    )
  })

  test('convierte un conflicto de base de datos en un mensaje claro', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(Object.assign(new Error('exclusion conflict'), { code: '23P01' }))

    await expect(turnoService.create({
      clienteNombre: 'Ana',
      clienteApellido: 'Gomez',
      idServicio: 2,
      fecha: '2026-09-04',
      hora: '11:00',
    })).rejects.toMatchObject({
      status: 409,
      message: 'Ya existe un turno para el 2026-09-04 a las 11:00.',
    })
  })
})
