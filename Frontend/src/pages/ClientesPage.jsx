import { useState, useEffect, useCallback } from 'react'
import axiosClient    from '../api/axiosClient'
import Modal          from '../components/shared/Modal'
import WhatsAppButton from '../components/shared/WhatsAppButton'

const EMPTY_FORM = { nombre: '', apellido: '', fechaCumpleanos: '', telefono: '', notas: '' }

// Calcula cuántos días faltan para el próximo cumpleaños
function diasParaCumple(fechaCumpleanos) {
  if (!fechaCumpleanos) return null
  const hoy    = new Date()
  const raw    = fechaCumpleanos.toString().slice(0, 10)
  const [, m, d] = raw.split('-')
  const cumple = new Date(hoy.getFullYear(), Number(m) - 1, Number(d))
  if (cumple < hoy) cumple.setFullYear(hoy.getFullYear() + 1)
  return Math.ceil((cumple - hoy) / (1000 * 60 * 60 * 24))
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [search,   setSearch]   = useState('')
  const [modal,    setModal]    = useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [editId,   setEditId]   = useState(null)
  const [error,    setError]    = useState('')
  const [saving,   setSaving]   = useState(false)

  const fetchClientes = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axiosClient.get('/clientes')
      setClientes(data)
    } catch { setError('Error al cargar clientes') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  // Clientes con cumpleaños en los próximos 7 días
  const cumpleProximos = clientes.filter((c) => {
    const dias = diasParaCumple(c.fecha_cumpleanos)
    return dias !== null && dias <= 7
  })

  const openNew  = () => { setForm(EMPTY_FORM); setEditId(null); setModal(true); setError('') }
  const openEdit = (c) => {
    setForm({
      nombre:          c.nombre,
      apellido:        c.apellido,
      fechaCumpleanos: c.fecha_cumpleanos ? c.fecha_cumpleanos.toString().slice(0, 10) : '',
      telefono:        c.telefono || '',
      notas:           c.notas   || '',
    })
    setEditId(c.id)
    setModal(true)
    setError('')
  }
  const closeModal = () => { setModal(false); setError('') }

  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        nombre:          form.nombre,
        apellido:        form.apellido,
        fechaCumpleanos: form.fechaCumpleanos || null,
        telefono:        form.telefono        || null,
        notas:           form.notas           || null,
      }
      if (editId) {
        await axiosClient.put(`/clientes/${editId}`, payload)
      } else {
        await axiosClient.post('/clientes', payload)
      }
      await fetchClientes()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return
    try {
      await axiosClient.delete(`/clientes/${id}`)
      setClientes((cs) => cs.filter((c) => c.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const filtrados = clientes.filter((c) =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Clientes</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            style={{ width: 220 }}
            placeholder="Buscar cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo cliente</button>
        </div>
      </div>

      {/* Banner de cumpleaños próximos */}
      {cumpleProximos.length > 0 && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b',
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ fontWeight: 600, color: '#92400e', fontSize: 14 }}>
            🎂 Cumpleaños próximos
          </div>
          {cumpleProximos.map((c) => {
            const dias = diasParaCumple(c.fecha_cumpleanos)
            const raw  = c.fecha_cumpleanos.toString().slice(0, 10)
            const [, m, d] = raw.split('-')
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#78350f' }}>
                <span>
                  {dias === 0 ? '🎉 ¡Hoy!' : `En ${dias} día${dias === 1 ? '' : 's'}`}
                  {' — '}
                  <strong>{c.nombre} {c.apellido}</strong>
                  {' '}{d}/{m}
                </span>
                {c.telefono && (
                  <WhatsAppButton
                    telefono={c.telefono}
                    nombre={c.nombre}
                    mensaje={`¡Feliz cumpleaños ${c.nombre}! 🎂🎉 Que lo pases genial. ¡Te esperamos pronto en la peluquería! ✂️`}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtrados.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">👥</div>
            <div className="empty-text">No hay clientes registrados</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Teléfono</th>
                  <th>Cumpleaños</th>
                  <th>Notas</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => {
                  const diasCumple = diasParaCumple(c.fecha_cumpleanos)
                  const cumpleHoy  = diasCumple === 0
                  const cumpleProx = diasCumple !== null && diasCumple <= 7

                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.apellido}, {c.nombre}</strong>
                        {cumpleHoy && <span style={{ marginLeft: 6 }}>🎂</span>}
                      </td>
                      <td>{c.telefono || <span style={{ color: 'var(--gray-400)' }}>—</span>}</td>
                      <td>
                        {c.fecha_cumpleanos ? (
                          <span style={{ color: cumpleProx ? '#d97706' : undefined, fontWeight: cumpleProx ? 600 : 400 }}>
                            {(() => {
                              const raw    = c.fecha_cumpleanos.toString().slice(0, 10)
                              const [, m, d] = raw.split('-')
                              return `${d}/${m}`
                            })()}
                            {cumpleProx && diasCumple > 0 && (
                              <span style={{ fontSize: 11, marginLeft: 4 }}>({diasCumple}d)</span>
                            )}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--gray-400)' }}>—</span>
                        )}
                      </td>
                      <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notas || <span style={{ color: 'var(--gray-400)' }}>—</span>}
                      </td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nombre)}>Eliminar</button>
                          {c.telefono && (
                            <WhatsAppButton
                              telefono={c.telefono}
                              nombre={c.nombre}
                              mensaje={`Hola ${c.nombre}! 👋`}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar cliente' : 'Nuevo cliente'}
          onClose={closeModal}
          footer={
            <>
              <button className="btn btn-ghost" onClick={closeModal}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          }
        >
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" name="nombre" value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input className="form-input" name="apellido" value={form.apellido} onChange={handleChange} required />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 3511234567" />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de cumpleaños</label>
                <input className="form-input" type="date" name="fechaCumpleanos" value={form.fechaCumpleanos} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones..." />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
