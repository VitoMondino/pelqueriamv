import { Fragment, useState, useEffect, useCallback, useMemo } from 'react'
import Swal from 'sweetalert2'
import axiosClient    from '../api/axiosClient'
import Modal          from '../components/shared/Modal'
import WhatsAppButton from '../components/shared/WhatsAppButton'

const hoy = () => new Date().toISOString().split('T')[0]

const inicioDeSemana = (fecha) => {
  const date = new Date(fecha + 'T00:00:00')
  const dia = date.getDay()
  const diferencia = dia === 0 ? -6 : 1 - dia
  date.setDate(date.getDate() + diferencia)
  return date.toISOString().split('T')[0]
}

const ESTADO_BADGE = {
  pendiente: 'badge-yellow',
  realizado: 'badge-green',
  cancelado: 'badge-red',
}

const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado']

// Slots de 30 min desde las 07:30 hasta las 23:30
const SLOTS_HORA = (() => {
  const slots = []
  for (let h = 7; h < 24; h++) {
    if (h === 7) slots.push('07:30')
    else {
      slots.push(`${String(h).padStart(2,'0')}:00`)
      slots.push(`${String(h).padStart(2,'0')}:30`)
    }
  }
  return slots
})()

const EMPTY_FORM = {
  tipoCliente: 'registrado', idCliente: '', clienteNombre: '', clienteApellido: '', clienteTelefono: '',
  idServicio: '', fecha: hoy(), hora: '', diaSemana: '', esFijo: false, notas: '',
}

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false,
  timer: 3000, timerProgressBar: true,
})

export default function TurnosPage() {
  const [vista,         setVista]         = useState('hoy')
  const [fecha,         setFecha]         = useState(hoy())
  const [turnos,        setTurnos]        = useState([])
  const [clientes,      setClientes]      = useState([])
  const [servicios,     setServicios]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [form,          setForm]          = useState(EMPTY_FORM)
  const [editId,        setEditId]        = useState(null)
  const [error,         setError]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [buscarCliente, setBuscarCliente] = useState('')
  const [dropdownOpen,  setDropdownOpen]  = useState(false)

  const fetchTurnos = useCallback(async () => {
    setLoading(true)
    try {
      const fechaInicio = vista === 'semana' ? inicioDeSemana(fecha) : fecha
      const fechas = Array.from({ length: vista === 'semana' ? 7 : 1 }, (_, indice) => {
        const date = new Date(fechaInicio + 'T00:00:00')
        date.setDate(date.getDate() + indice)
        return date.toISOString().split('T')[0]
      })
      const respuestas = await Promise.all(
        fechas.map((fechaDia) => axiosClient.get(`/turnos/fecha/${fechaDia}`))
      )
      const turnosSemana = respuestas.flatMap((respuesta, indice) =>
        respuesta.data.map((turno) => ({ ...turno, fechaVista: fechas[indice] }))
      )
      setTurnos(turnosSemana)
    } catch {
      Toast.fire({ icon: 'error', title: 'Error al cargar turnos' })
    } finally { setLoading(false) }
  }, [fecha, vista])

  useEffect(() => { fetchTurnos() }, [fetchTurnos])

  useEffect(() => {
    axiosClient.get('/clientes').then(({ data }) => setClientes(data))
    axiosClient.get('/servicios?activos=true').then(({ data }) => setServicios(data))
  }, [])

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
    setBuscarCliente(''); setEditId(null); setModal(true); setError('')
  }

  const openEdit = (t) => {
    setForm({
      tipoCliente: t.id_cliente ? 'registrado' : 'ocasional',
      idCliente:  t.id_cliente || '',
      clienteNombre: t.id_cliente ? '' : t.nombre || '',
      clienteApellido: t.id_cliente ? '' : t.apellido || '',
      clienteTelefono: t.id_cliente ? '' : t.telefono || '',
      idServicio: t.id_servicio,
      fecha:      t.fecha?.split('T')[0] || t.fecha,
      hora:       t.hora?.slice(0, 5),
      diaSemana:  t.dia_semana || '',
      esFijo:     t.es_fijo,
      notas:      t.notas || '',
    })
    setBuscarCliente(t.id_cliente ? `${t.apellido}, ${t.nombre}` : '')
    setEditId(t.id); setModal(true); setError('')
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
    setForm((f) => ({ ...f, tipoCliente: 'registrado', idCliente: c.id, clienteNombre: '', clienteApellido: '', clienteTelefono: '' }))
    setBuscarCliente(`${c.apellido}, ${c.nombre}`)
    setDropdownOpen(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.tipoCliente === 'registrado' && !form.idCliente) { setError('Seleccioná un cliente registrado'); return }
    if (form.tipoCliente === 'ocasional' && (!form.clienteNombre.trim() || !form.clienteApellido.trim())) {
      setError('Ingresá nombre y apellido del cliente ocasional')
      return
    }
    if (!form.hora)      { setError('Seleccioná una hora');   return }
    setSaving(true); setError('')
    try {
      const payload = {
        ...form,
        idCliente: form.tipoCliente === 'registrado' ? Number(form.idCliente) : null,
        clienteNombre: form.tipoCliente === 'ocasional' ? form.clienteNombre.trim() : null,
        clienteApellido: form.tipoCliente === 'ocasional' ? form.clienteApellido.trim() : null,
        clienteTelefono: form.tipoCliente === 'ocasional' ? form.clienteTelefono.trim() || null : null,
        idServicio: Number(form.idServicio),
      }
      delete payload.tipoCliente
      if (editId) { await axiosClient.put(`/turnos/${editId}`, payload) }
      else        { await axiosClient.post('/turnos', payload) }
      await fetchTurnos()
      closeModal()
      Toast.fire({ icon: 'success', title: editId ? 'Turno actualizado' : 'Turno creado' })
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar'
      setError(msg)
    } finally { setSaving(false) }
  }

  const cambiarEstado = async (t, estado) => {
    const etiqueta = estado === 'realizado' ? 'realizado' : 'cancelado'
    const { isConfirmed } = await Swal.fire({
      title: `¿Marcar como ${etiqueta}?`,
      text: `Turno de ${t.nombre} ${t.apellido} a las ${t.hora?.slice(0,5)}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: estado === 'realizado' ? '#16a34a' : '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: `Sí, ${etiqueta}`,
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return

    const fechaVista = t.fechaVista
    try {
      await axiosClient.patch(`/turnos/${t.id}/estado`, { estado, fecha: fechaVista })
      await fetchTurnos()
      Toast.fire({ icon: 'success', title: `Turno marcado como ${etiqueta}` })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Error al actualizar' })
    }
  }

  const handleDelete = async (t) => {
    const { isConfirmed } = await Swal.fire({
      title: '¿Eliminar turno?',
      text: `${t.nombre} ${t.apellido} — ${t.hora?.slice(0,5)}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return
    try {
      await axiosClient.delete(`/turnos/${t.id}`)
      setTurnos((ts) => ts.filter((x) => x.id !== t.id))
      Toast.fire({ icon: 'success', title: 'Turno eliminado' })
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.error || 'Error al eliminar' })
    }
  }

  const moverFecha = (dias) => {
    const d = new Date(fecha + 'T00:00:00')
    d.setDate(d.getDate() + dias)
    setFecha(vista === 'semana'
      ? inicioDeSemana(d.toISOString().split('T')[0])
      : d.toISOString().split('T')[0])
  }

  const fechaInicioSemana = inicioDeSemana(fecha)
  const fechaFin = new Date(fechaInicioSemana + 'T00:00:00')
  fechaFin.setDate(fechaFin.getDate() + 6)
  const rangoLabel = `${new Date(fechaInicioSemana + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long',
  })} al ${fechaFin.toLocaleDateString('es-AR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })}`
  const fechaDiaLabel = (fechaDia) => new Date(fechaDia + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista)
    if (nuevaVista === 'hoy') setFecha(hoy())
    else setFecha(inicioDeSemana(fecha))
  }

  const renderTurno = (t) => (
    <tr key={`${t.id}-${t.fechaVista}`}>
      {vista === 'semana' && (
        <td style={{ textTransform:'capitalize', whiteSpace:'nowrap' }}>{fechaDiaLabel(t.fechaVista)}</td>
      )}
      <td><strong>{t.hora?.slice(0,5)}</strong></td>
      <td>{t.apellido}, {t.nombre} {!t.id_cliente && <span className="badge badge-gray" style={{ marginLeft:6 }}>Ocasional</span>}</td>
      <td>{t.nombre_servicio}</td>
      <td>${parseFloat(t.precio).toLocaleString('es-AR')}</td>
      <td><span className={`badge ${ESTADO_BADGE[t.estado]}`}>{t.estado}</span></td>
      <td>{t.es_fijo ? <span className="badge badge-purple">Fijo</span> : '—'}</td>
      <td>
        <div className="td-actions" style={{ flexWrap:'wrap' }}>
          {t.estado === 'pendiente' && (
            <button className="btn btn-success btn-sm" onClick={() => cambiarEstado(t, 'realizado')}>✓ Realizado</button>
          )}
          {t.estado !== 'cancelado' && (
            <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t, 'cancelado')}>Cancelar</button>
          )}
          {t.estado === 'cancelado' && (
            <button className="btn btn-ghost btn-sm" onClick={() => cambiarEstado(t, 'pendiente')}>Reabrir</button>
          )}
          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(t)}>Editar</button>
          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(t)}>✕</button>
          <WhatsAppButton
            telefono={t.telefono} nombre={t.nombre}
            fecha={t.fechaVista}
            hora={t.hora?.slice(0,5)}
          />
        </div>
      </td>
    </tr>
  )

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Turnos</h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo turno</button>
      </div>

      <div style={{ display:'flex', gap:6, marginBottom:16 }}>
        <button className={`btn btn-sm ${vista === 'hoy' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => cambiarVista('hoy')}>
          Hoy
        </button>
        <button className={`btn btn-sm ${vista === 'semana' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => cambiarVista('semana')}>
          Semana completa
        </button>
      </div>

      <div className="fecha-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => moverFecha(vista === 'semana' ? -7 : -1)}>
          ← {vista === 'semana' ? 'Semana anterior' : 'Día anterior'}
        </button>
        <input type="date" value={fecha} onChange={(e) => setFecha(vista === 'semana' ? inicioDeSemana(e.target.value) : e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={() => moverFecha(vista === 'semana' ? 7 : 1)}>
          {vista === 'semana' ? 'Semana siguiente' : 'Día siguiente'} →
        </button>
        <button className="btn btn-ghost btn-sm" onClick={() => setFecha(vista === 'semana' ? inicioDeSemana(hoy()) : hoy())}>
          {vista === 'semana' ? 'Esta semana' : 'Hoy'}
        </button>
        <span style={{ color:'var(--gray-600)', fontSize:14, textTransform:'capitalize' }}>
          {vista === 'semana' ? rangoLabel : fechaDiaLabel(fecha)}
        </span>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : turnos.length === 0 ? (
          <div className="empty"><div className="empty-icon">📅</div><div className="empty-text">Sin turnos para {vista === 'semana' ? 'esta semana' : 'hoy'}</div></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    {vista === 'semana' && <th>Fecha</th>}
                    <th>Hora</th><th>Cliente</th><th>Servicio</th><th>Precio</th><th>Estado</th><th>Fijo</th><th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vista === 'semana'
                    ? Array.from(new Set(turnos.map((turno) => turno.fechaVista))).map((fechaDia) => (
                        <Fragment key={fechaDia}>
                          <tr>
                            <td colSpan="8" style={{ background:'var(--gray-50)', fontWeight:600, textTransform:'capitalize' }}>
                              {fechaDiaLabel(fechaDia)}
                            </td>
                          </tr>
                          {turnos.filter((turno) => turno.fechaVista === fechaDia).map(renderTurno)}
                        </Fragment>
                      ))
                    : turnos.map(renderTurno)}
                </tbody>
              </table>
            </div>
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
            <div className="form-group" style={{ position:'relative' }}>
              <label className="form-label">Tipo de cliente *</label>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <button type="button" className={`btn btn-sm ${form.tipoCliente === 'registrado' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setForm((f) => ({ ...f, tipoCliente:'registrado', clienteNombre:'', clienteApellido:'', clienteTelefono:'' }))}>Registrado</button>
                <button type="button" className={`btn btn-sm ${form.tipoCliente === 'ocasional' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => { setForm((f) => ({ ...f, tipoCliente:'ocasional', idCliente:'' })); setBuscarCliente('') }}>Ocasional</button>
              </div>
              {form.tipoCliente === 'registrado' ? (
                <>
                  <label className="form-label">Cliente registrado *</label>
                  <input
                    className="form-input"
                    placeholder="Escribí nombre o apellido..."
                    value={buscarCliente}
                    onChange={(e) => { setBuscarCliente(e.target.value); setForm((f) => ({ ...f, idCliente:'' })); setDropdownOpen(true) }}
                    onFocus={() => setDropdownOpen(true)}
                    autoComplete="off"
                  />
                  {dropdownOpen && buscarCliente.length > 0 && !form.idCliente && clientesFiltrados.length > 0 && (
                    <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'var(--white)', border:'1px solid var(--gray-200)', borderRadius:'var(--radius)', boxShadow:'var(--shadow-md)', zIndex:100, maxHeight:200, overflowY:'auto' }}>
                      {clientesFiltrados.slice(0,10).map((c) => (
                        <div key={c.id} onClick={() => seleccionarCliente(c)}
                          style={{ padding:'9px 14px', cursor:'pointer', fontSize:14, borderBottom:'1px solid var(--gray-100)' }}
                          onMouseEnter={(e) => e.currentTarget.style.background='var(--gray-50)'}
                          onMouseLeave={(e) => e.currentTarget.style.background='transparent'}
                        >
                          <strong>{c.apellido}</strong>, {c.nombre}
                          {c.telefono && <span style={{ color:'var(--gray-400)', marginLeft:8, fontSize:12 }}>{c.telefono}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                  {clienteSeleccionado && <span style={{ fontSize:12, color:'var(--success)', marginTop:3 }}>✓ {clienteSeleccionado.apellido}, {clienteSeleccionado.nombre}</span>}
                </>
              ) : (
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" name="clienteNombre" value={form.clienteNombre} onChange={handleChange} required /></div>
                  <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" name="clienteApellido" value={form.clienteApellido} onChange={handleChange} required /></div>
                  <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" name="clienteTelefono" value={form.clienteTelefono} onChange={handleChange} /></div>
                </div>
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
                <label className="form-label">Hora * (07:30 — 23:30)</label>
                <select className="form-select" name="hora" value={form.hora} onChange={handleChange} required>
                  <option value="">Seleccioná hora...</option>
                  {SLOTS_HORA.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Día semana</label>
                <input className="form-input" name="diaSemana" value={form.diaSemana} readOnly style={{ background:'var(--gray-50)' }} />
              </div>
              <div className="form-group" style={{ justifyContent:'center' }}>
                <label className="form-label">Turno fijo</label>
                <label style={{ display:'flex', alignItems:'center', gap:8, paddingTop:8 }}>
                  <input type="checkbox" name="esFijo" checked={form.esFijo} onChange={handleChange} className="asistencia-check" disabled={form.tipoCliente === 'ocasional'} />
                  <span style={{ fontSize:14 }}>Es recurrente</span>
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