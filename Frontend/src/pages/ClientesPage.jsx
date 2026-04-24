import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import axiosClient    from '../api/axiosClient'
import Modal          from '../components/shared/Modal'
import WhatsAppButton from '../components/shared/WhatsAppButton'
import Paginacion     from '../components/shared/Paginacion'
import { usePagination } from '../hooks/usePagination'

const EMPTY_FORM = { nombre:'', apellido:'', fechaCumpleanos:'', telefono:'', notas:'' }

const Toast = Swal.mixin({
  toast:true, position:'top-end', showConfirmButton:false, timer:3000, timerProgressBar:true,
})

function diasParaCumple(fechaCumpleanos) {
  if (!fechaCumpleanos) return null
  const hoy  = new Date()
  const raw  = fechaCumpleanos.toString().slice(0,10)
  const [,m,d] = raw.split('-')
  const cumple = new Date(hoy.getFullYear(), Number(m)-1, Number(d))
  if (cumple < hoy) cumple.setFullYear(hoy.getFullYear()+1)
  return Math.ceil((cumple - hoy) / (1000*60*60*24))
}

export default function ClientesPage() {
  const [clientes,setClientes] = useState([])
  const [loading, setLoading]  = useState(true)
  const [search,  setSearch]   = useState('')
  const [modal,   setModal]    = useState(false)
  const [form,    setForm]     = useState(EMPTY_FORM)
  const [editId,  setEditId]   = useState(null)
  const [error,   setError]    = useState('')
  const [saving,  setSaving]   = useState(false)

  const fetchClientes = useCallback(async () => {
    try { setLoading(true); const {data} = await axiosClient.get('/clientes'); setClientes(data) }
    catch { Toast.fire({ icon:'error', title:'Error al cargar clientes' }) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const filtrados = clientes.filter((c) =>
    `${c.nombre} ${c.apellido}`.toLowerCase().includes(search.toLowerCase()) ||
    `${c.apellido} ${c.nombre}`.toLowerCase().includes(search.toLowerCase())
  )

  const { itemsPagina, pagina, setPagina, totalPaginas } = usePagination(filtrados)
  const cumpleProximos = clientes.filter((c) => { const d=diasParaCumple(c.fecha_cumpleanos); return d!==null && d<=7 })

  const openNew  = () => { setForm(EMPTY_FORM); setEditId(null); setModal(true); setError('') }
  const openEdit = (c) => {
    setForm({ nombre:c.nombre, apellido:c.apellido, fechaCumpleanos: c.fecha_cumpleanos?c.fecha_cumpleanos.toString().slice(0,10):'', telefono:c.telefono||'', notas:c.notas||'' })
    setEditId(c.id); setModal(true); setError('')
  }
  const closeModal   = () => { setModal(false); setError('') }
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { nombre:form.nombre, apellido:form.apellido, fechaCumpleanos:form.fechaCumpleanos||null, telefono:form.telefono||null, notas:form.notas||null }
      if (editId) { await axiosClient.put(`/clientes/${editId}`, payload) }
      else        { await axiosClient.post('/clientes', payload) }
      await fetchClientes(); closeModal()
      Toast.fire({ icon:'success', title: editId?'Cliente actualizado':'Cliente creado' })
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id, nombre) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Eliminar a ${nombre}?`,
      text: 'Se eliminarán también sus turnos asociados.',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor:'#dc2626', cancelButtonColor:'#6b7280',
      confirmButtonText:'Sí, eliminar', cancelButtonText:'Cancelar',
    })
    if (!isConfirmed) return
    try {
      await axiosClient.delete(`/clientes/${id}`)
      setClientes((cs) => cs.filter((c) => c.id !== id))
      Toast.fire({ icon:'success', title:'Cliente eliminado' })
    } catch (err) {
      Swal.fire({ icon:'error', title:'Error', text: err.response?.data?.error || 'No se pudo eliminar' })
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Clientes <span style={{ fontSize:14, fontWeight:400, color:'var(--gray-400)' }}>({clientes.length})</span></h1>
        <div style={{ display:'flex', gap:10 }}>
          <input className="form-input" style={{ width:220 }} placeholder="Buscar por nombre o apellido..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPagina(1) }} />
          <button className="btn btn-primary" onClick={openNew}>+ Nuevo cliente</button>
        </div>
      </div>

      {cumpleProximos.length > 0 && (
        <div style={{ background:'#fef3c7', border:'1px solid #f59e0b', borderRadius:8, padding:'12px 16px', marginBottom:20, display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontWeight:600, color:'#92400e', fontSize:14 }}>🎂 Cumpleaños próximos</div>
          {cumpleProximos.map((c) => {
            const dias=diasParaCumple(c.fecha_cumpleanos); const raw=c.fecha_cumpleanos.toString().slice(0,10); const [,m,d]=raw.split('-')
            return (
              <div key={c.id} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'#78350f' }}>
                <span>{dias===0?'🎉 ¡Hoy!':`En ${dias} día${dias===1?'':'s'}`}{' — '}<strong>{c.nombre} {c.apellido}</strong>{' '}{d}/{m}</span>
                {c.telefono && <WhatsAppButton telefono={c.telefono} nombre={c.nombre} mensaje={`¡Feliz cumpleaños ${c.nombre}! 🎂🎉 ¡Te esperamos pronto! ✂️`} />}
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : filtrados.length === 0 ? (
          <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No hay clientes</div></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Nombre</th><th>Teléfono</th><th>Cumpleaños</th><th>Notas</th><th>Acciones</th></tr></thead>
                <tbody>
                  {itemsPagina.map((c) => {
                    const dc=diasParaCumple(c.fecha_cumpleanos); const cumpleProx=dc!==null&&dc<=7
                    return (
                      <tr key={c.id}>
                        <td><strong>{c.apellido}, {c.nombre}</strong>{dc===0&&<span style={{marginLeft:6}}>🎂</span>}</td>
                        <td>{c.telefono||<span style={{color:'var(--gray-400)'}}>—</span>}</td>
                        <td>
                          {c.fecha_cumpleanos?(
                            <span style={{color:cumpleProx?'#d97706':undefined, fontWeight:cumpleProx?600:400}}>
                              {(()=>{const r=c.fecha_cumpleanos.toString().slice(0,10);const[,m,d]=r.split('-');return`${d}/${m}`})()}
                              {cumpleProx&&dc>0&&<span style={{fontSize:11,marginLeft:4}}>({dc}d)</span>}
                            </span>
                          ):<span style={{color:'var(--gray-400)'}}>—</span>}
                        </td>
                        <td style={{maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {c.notas||<span style={{color:'var(--gray-400)'}}>—</span>}
                        </td>
                        <td>
                          <div className="td-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>Editar</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id, c.nombre)}>Eliminar</button>
                            {c.telefono&&<WhatsAppButton telefono={c.telefono} nombre={c.nombre} mensaje={`Hola ${c.nombre}! 👋`} />}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagina} totalPaginas={totalPaginas} onChange={setPagina} />
          </>
        )}
      </div>

      {modal && (
        <Modal title={editId?'Editar cliente':'Nuevo cliente'} onClose={closeModal}
          footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Guardando...':'Guardar'}</button></>}>
          {error&&<div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" name="nombre" value={form.nombre} onChange={handleChange} required /></div>
              <div className="form-group"><label className="form-label">Apellido *</label><input className="form-input" name="apellido" value={form.apellido} onChange={handleChange} required /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Ej: 3511234567" /></div>
              <div className="form-group"><label className="form-label">Fecha de cumpleaños</label><input className="form-input" type="date" name="fechaCumpleanos" value={form.fechaCumpleanos} onChange={handleChange} /></div>
            </div>
            <div className="form-group"><label className="form-label">Notas</label><textarea className="form-textarea" name="notas" value={form.notas} onChange={handleChange} placeholder="Observaciones..." /></div>
          </form>
        </Modal>
      )}
    </div>
  )
}
