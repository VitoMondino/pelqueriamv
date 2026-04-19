import { useState, useEffect, useCallback } from 'react'
import axiosClient from '../api/axiosClient'
import Modal       from '../components/shared/Modal'
import Paginacion  from '../components/shared/Paginacion'
import { usePagination } from '../hooks/usePagination'

const EMPTY_FORM = { nombreServicio: '', precio: '', estado: 'activo' }

export default function ServiciosPage() {
  const [servicios, setServicios] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [editId,    setEditId]    = useState(null)
  const [error,     setError]     = useState('')
  const [saving,    setSaving]    = useState(false)

  const { itemsPagina, pagina, setPagina, totalPaginas } = usePagination(servicios)

  const fetchServicios = useCallback(async () => {
    try { setLoading(true); const { data } = await axiosClient.get('/servicios'); setServicios(data) }
    catch { setError('Error al cargar servicios') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchServicios() }, [fetchServicios])

  const openNew  = () => { setForm(EMPTY_FORM); setEditId(null); setModal(true); setError('') }
  const openEdit = (s) => { setForm({ nombreServicio: s.nombre_servicio, precio: s.precio, estado: s.estado }); setEditId(s.id); setModal(true); setError('') }
  const closeModal = () => { setModal(false); setError('') }
  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const payload = { ...form, precio: parseFloat(form.precio) }
      if (editId) { await axiosClient.put(`/servicios/${editId}`, payload) }
      else        { await axiosClient.post('/servicios', payload) }
      await fetchServicios(); closeModal()
    } catch (err) { setError(err.response?.data?.error || 'Error al guardar') }
    finally { setSaving(false) }
  }

  const toggleEstado = async (s) => {
    const nuevoEstado = s.estado === 'activo' ? 'inactivo' : 'activo'
    try {
      await axiosClient.patch(`/servicios/${s.id}/estado`, { estado: nuevoEstado })
      setServicios((ss) => ss.map((x) => x.id === s.id ? { ...x, estado: nuevoEstado } : x))
    } catch (err) { alert(err.response?.data?.error || 'Error') }
  }

  const handleDelete = async (id, nombre) => {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    try { await axiosClient.delete(`/servicios/${id}`); setServicios((ss) => ss.filter((s) => s.id !== id)) }
    catch (err) { alert(err.response?.data?.error || 'No se puede eliminar (tiene turnos asociados)') }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Servicios <span style={{ fontSize:14, fontWeight:400, color:'var(--gray-400)' }}>({servicios.length})</span></h1>
        <button className="btn btn-primary" onClick={openNew}>+ Nuevo servicio</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /></div>
        ) : servicios.length === 0 ? (
          <div className="empty"><div className="empty-icon">💈</div><div className="empty-text">No hay servicios</div></div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Servicio</th><th>Precio</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {itemsPagina.map((s) => (
                    <tr key={s.id}>
                      <td><strong>{s.nombre_servicio}</strong></td>
                      <td>${parseFloat(s.precio).toLocaleString('es-AR')}</td>
                      <td><span className={`badge ${s.estado==='activo'?'badge-green':'badge-gray'}`}>{s.estado}</span></td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Editar</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => toggleEstado(s)}>{s.estado==='activo'?'Desactivar':'Activar'}</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s.id, s.nombre_servicio)}>Eliminar</button>
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
        <Modal title={editId?'Editar servicio':'Nuevo servicio'} onClose={closeModal}
          footer={<><button className="btn btn-ghost" onClick={closeModal}>Cancelar</button><button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>{saving?'Guardando...':'Guardar'}</button></>}>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group"><label className="form-label">Nombre del servicio *</label><input className="form-input" name="nombreServicio" value={form.nombreServicio} onChange={handleChange} required placeholder="Ej: Corte de cabello" /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Precio *</label><input className="form-input" type="number" name="precio" value={form.precio} onChange={handleChange} min="0" step="0.01" required placeholder="0.00" /></div>
              <div className="form-group"><label className="form-label">Estado</label><select className="form-select" name="estado" value={form.estado} onChange={handleChange}><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
