import { useState, useEffect, useCallback, useMemo } from 'react'
import axiosClient    from '../api/axiosClient'
import Modal          from '../components/shared/Modal'
import WhatsAppButton from '../components/shared/WhatsAppButton'
import Paginacion     from '../components/shared/Paginacion'
import { usePagination } from '../hooks/usePagination'

const hoy = () => new Date().toISOString().split('T')[0]

const ESTADO_BADGE = {
  pendiente: 'badge-yellow',
  realizado: 'badge-green',
  cancelado: 'badge-red',
}

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

const EMPTY_FORM = {
  idCliente: '', idServicio: '', fecha: hoy(), hora: '',
  diaSemana: '', esFijo: false, notas: '',
}

export default function TurnosPage() {
  const [fecha,        setFecha]        = useState(hoy())
  const [turnos,       setTurnos]       = useState([])
  const [clientes,     setClientes]     = useState([])
  const [servicios,    setServicios]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [editId,       setEditId]       = useState(null)
  const [error,        setError]        = useState('')
  const [saving,       setSaving]       = useState(false)
  // Búsqueda de cliente en el modal
  const [buscarCliente, setBuscarCliente] = useState('')
  const [dropdownOpen,  setDropdownOpen]  = useState(false)

  const { itemsPagina, pagina, setPagina, totalPaginas } = usePagination(turnos)

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await axiosClient.get(`/turnos/fecha/${fecha}`)
      setTurnos(data)
      setPagina(1)
    } catch { setError('Error al cargar turnos') }
    finally  { setLoading(false) }
  }, [fecha])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  useEffect(() => {
    axiosClient.get('/clientes').then(({ data }) => setClientes(data))
    axiosClient.get('/servicios?activos=true').then(({ data }) => setServicios(data))
  }, [])

  // Clientes filtrados por lo que escribe en la búsqueda
  const clientesFiltrados = useMemo(() => {
    const q = buscarCliente.toLowerCase().trim()
    if (!q) return clientes
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) ||
      `${c.apellido} ${c.nombre}`.toLowerCase().includes(q)
    )
  }, [clientes, buscarCliente])

  const clienteSeleccionado = clientes.find((c) => c.id === Number(form.idCliente))

  const openNew = () => {
    const dia = DIAS[new Date(fecha + 'T00:00:00').getDay()]
    setForm({ ...EMPTY_FORM, fecha, diaSemana: dia })
    setBuscarCliente('')
    setEditId(null)
    setModal(true)
    setError('')
  }

  const openEdit = (t) => {
    setForm({
      idCliente:  t.id_cliente,
      idServicio: t.id_servicio,
      fecha:      t.fecha?.split('T')[0] || t.fecha,
      hora:       t.hora?.slice(0, 5),
      diaSemana:  t.dia_semana || '',
      esFijo:     t.es_fijo,
      notas:      t.notas || '',
    })
    setBuscarCliente(`${t.apellido}, ${t.nombre}`)
    setEditId(t.id)
    setModal(true)
    setError('')
  }

  const closeModal = () => { setModal(false); setError(''); setBuscarCliente(''); setDropdownOpen(false) }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((f) => {
      const next = { ...f, [name]: type === 'checkbox' ? checked : value }
      if (name === 'fecha') next.diaSemana = DIAS[new Date(value + 'T00:00:00').getDay()]
      return next
    })
  }

  const seleccionarCliente = (c) => {
    setForm((f) => ({ ...f, idCliente: c.id }))
    setBuscarCliente(`${c.apellido}, ${c.nombre}`)
    setDropdownOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.idCliente) { setError('Seleccioná un cliente'); return }
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        idCliente:  Number(form.idCliente),
        idServicio: Number(form.idServicio),
      }
      if (editId) {
        await axiosClient.put(`/turnos/${editId}`, payload)
      } else {
        await axiosClient.post('/turnos', payload)
      }
      await fetchTurnos()
      closeModal()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar')
    } finally { setSaving(false) }
  }

  const cambiarEstado = async (id, estado) => {
    try {
      await axiosClient.patch(`/turnos/${id}/estado`, { estado })
      setTurnos((ts) => ts.map((t) => t.id === id ? { ...t, estado } : t))
    } catch (err) {
      alert(err.response?.data?.error || 'Error')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este turno?')) return
    try {
      await axiosClient.delete(`/turnos/${id}`)
      setTurnos((ts) => ts.filter((t) => t.id !== id))
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar')
    }
  }

  const moverFecha = (dias) => {
    const d = new Date(fecha + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setFecha(d.toISOString().split('T')[0])
  }

  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Turnos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo turno</button>
      </div>

      <div className="fecha-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => moverFecha(-1)}>← Anterior</button>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={() => moverFecha(1)}>Siguiente →</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setFecha(hoy())}>Hoy</button>
        <span style={{ color: 'var(--gray-600)', fontSize: 14, textTransform: 'capitalize' }}>
          {fechaLabel}
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : turnos.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📅</div>
            <div className="empty-text">Sin turnos para este día</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hora</th>
                    <th>Cliente</th>
                    <th>Servicio</th>
                    <th>Precio</th>
                    <th>Estado</th>
                    <th>Fijo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPagina.map((t) => (
                    <tr key={t.id}>
                      <td><strong>{t.hora?.slice(0, 5)}</strong></td>
                      <td>{t.apellido}, {t.nombre}</td>
                      <td>{t.nombre_servicio}</td>
                      <td>${parseFloat(t.precio).toLocaleString('es-AR')}</td>
                      <td><span className={`badge ${ESTADO_BADGE[t.estado]}`}>{t.estado}</span></td>
                      <td>{t.es_fijo ? <span className="badge badge-purple">Fijo</span> : '—'}</td>
                      <td>
                        <div className="td-actions" style={{ flexWrap: 'wrap' }}>
                          {t.estado === 'pendiente' && (
                            <button className="btn btn-success btn-sm" onClick={() => cambiarEstado(t.id, 'realizado')}>✓</button>
                          )}
                          {t.estado !== 'cancelado' && (
                            <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t.id, 'cancelado')}>Cancelar</button>
                          )}
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t.id)}>✕</button>
                          <WhatsAppButton
                            telefono={t.telefono}
                            nombre={t.nombre}
                            fecha={t.fecha?.split('T')[0] || t.fecha}
                            hora={t.hora?.slice(0, 5)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
          </>
        )}
      </div>

      {modal && (
        <Modal
          title={editId ? 'Editar turno' : 'Nuevo turno'}
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

            {/* Búsqueda de cliente con dropdown */}
            <div className="form-group" style={{ position: 'relative' }}>
              <label className="form-label">Cliente *</label>
              <input
                className="form-input"
                placeholder="Escribí nombre o apellido..."
                value={buscarCliente}
                onChange={(e) => {
                  setBuscarCliente(e.target.value)
                  setForm((f) => ({ ...f, idCliente: '' }))
                  setDropdownOpen(true)
                }}
                onFocus={() => setDropdownOpen(true)}
                autoComplete="off"
              />
              {dropdownOpen && buscarCliente.length > 0 && clientesFiltrados.length > 0 && !form.idCliente && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: 'var(--white)', border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                  zIndex: 100, maxHeight: 200, overflowY: 'auto',
                }}>
                  {clientesFiltrados.slice(0, 10).map((c) => (
                    <div
                      key={c.id}
                      onClick={() => seleccionarCliente(c)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: 14,
                        borderBottom: '1px solid var(--gray-100)',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <strong>{c.apellido}</strong>, {c.nombre}
                      {c.telefono && <span style={{ color: 'var(--gray-400)', marginLeft: 8, fontSize: 12 }}>{c.telefono}</span>}
                    </div>
                  ))}
                </div>
              )}
              {clienteSeleccionado && (
                <span style={{ fontSize: 12, color: 'var(--success)', marginTop: 3 }}>
                  ✓ {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}
                </span>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Servicio *</label>
              <select className="form-select" name="idServicio" value={form.idServicio} onChange={handleChange} required>
                <option value="">Seleccioná un servicio...</option>
                {servicios.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre_servicio} — ${parseFloat(s.precio).toLocaleString('es-AR')}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Fecha *</label>
                <input className="form-input" type="date" name="fecha" value={form.fecha} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Hora * (cada 30 min)</label>
                <select className="form-select" name="hora" value={form.hora} onChange={handleChange} required>
                  <option value="">Seleccioná hora...</option>
                  {Array.from({ length: 28 }, (_, i) => {
                    const totalMin = 8 * 60 + i * 30
                    const hh = String(Math.floor(totalMin / 60)).padStart(2, '0')
                    const mm = String(totalMin % 60).padStart(2, '0')
                    return `${hh}:${mm}`
                  }).map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Día semana</label>
                <input className="form-input" name="diaSemana" value={form.diaSemana} readOnly style={{ background: 'var(--gray-50)' }} />
              </div>
              <div className="form-group" style={{ justifyContent: 'center' }}>
                <label className="form-label">Turno fijo</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 8 }}>
                  <input type="checkbox" name="esFijo" checked={form.esFijo} onChange={handleChange} className="asistencia-check" />
                  <span style={{ fontSize: 14 }}>Es recurrente</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notas</label>
              <textarea className="form-textarea" name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones del turno..." />
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
