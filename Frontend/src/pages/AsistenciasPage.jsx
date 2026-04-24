import { useState, useEffect, useCallback } from 'react'
import Swal from 'sweetalert2'
import axiosClient from '../api/axiosClient'

const mesActual  = () => new Date().getMonth() + 1
const anioActual = () => new Date().getFullYear()

const MESES = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const Toast = Swal.mixin({
  toast: true, position: 'top-end', showConfirmButton: false,
  timer: 2500, timerProgressBar: true,
})

export default function AsistenciasPage() {
  const [mes,         setMes]         = useState(mesActual())
  const [anio,        setAnio]        = useState(anioActual())
  const [clientes,    setClientes]    = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [loading,     setLoading]     = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: cls }, { data: asis }] = await Promise.all([
        axiosClient.get('/clientes'),
        axiosClient.get(`/asistencias?mes=${mes}&anio=${anio}`),
      ])
      setClientes(cls)
      setAsistencias(asis)
    } catch {
      Swal.fire({ icon:'error', title:'Error', text:'No se pudieron cargar los datos' })
    } finally { setLoading(false) }
  }, [mes, anio])

  useEffect(() => { fetchData() }, [fetchData])

  const asistenciasDeCliente = (idCliente) =>
    asistencias.filter((a) => a.id_cliente === idCliente).sort((a,b) => a.fecha.localeCompare(b.fecha))

  const marcar = async (idCliente) => {
    const hoyDate = new Date()
    const m = hoyDate.getMonth() + 1
    const a = hoyDate.getFullYear()
    const fecha = (m === mes && a === anio)
      ? hoyDate.toISOString().split('T')[0]
      : `${anio}-${String(mes).padStart(2,'0')}-01`

    try {
      const { data } = await axiosClient.post('/asistencias', { idCliente, fecha, mes, anio })
      setAsistencias((as) => [...as, data])
      Toast.fire({ icon:'success', title:'Asistencia registrada' })
    } catch (err) {
      Swal.fire({ icon:'warning', title:'No se pudo registrar', text: err.response?.data?.error || 'Error' })
    }
  }

  const desmarcar = async (idCliente) => {
    const lista  = asistenciasDeCliente(idCliente)
    if (!lista.length) return
    const ultima = lista[lista.length - 1]
    try {
      await axiosClient.delete(`/asistencias/${ultima.id}`)
      setAsistencias((as) => as.filter((a) => a.id !== ultima.id))
      Toast.fire({ icon:'info', title:'Asistencia quitada' })
    } catch (err) {
      Swal.fire({ icon:'error', title:'Error', text: err.response?.data?.error || 'Error al quitar' })
    }
  }

  const resetear = async (idCliente, nombre) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Resetear asistencias?`,
      text: `Se borrarán todas las asistencias de ${nombre} en ${MESES[mes]} ${anio}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, resetear',
      cancelButtonText: 'Cancelar',
    })
    if (!isConfirmed) return
    const lista = asistenciasDeCliente(idCliente)
    try {
      await Promise.all(lista.map((a) => axiosClient.delete(`/asistencias/${a.id}`)))
      setAsistencias((as) => as.filter((a) => a.id_cliente !== idCliente))
      Toast.fire({ icon:'success', title:'Asistencias reseteadas' })
    } catch (err) {
      Swal.fire({ icon:'error', title:'Error', text: err.response?.data?.error || 'Error al resetear' })
    }
  }

  // Años desde 2020 hasta 2040
  const anios = Array.from({ length: 21 }, (_, i) => 2020 + i)

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Asistencias — {MESES[mes]} {anio}</h1>
        <div style={{ display:'flex', gap:10 }}>
          <select className="form-select" style={{ width:130 }} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {MESES.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-select" style={{ width:90 }} value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /></div>
      ) : clientes.length === 0 ? (
        <div className="empty"><div className="empty-icon">👥</div><div className="empty-text">No hay clientes</div></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth:180 }}>Cliente</th>
                  <th style={{ textAlign:'center', minWidth:280 }}>Asistencias del mes <span style={{ fontWeight:400, textTransform:'none' }}>(máx. 4)</span></th>
                  <th style={{ textAlign:'center' }}>Total</th>
                  <th style={{ textAlign:'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const lista = asistenciasDeCliente(c.id)
                  const total = lista.length
                  const lleno = total >= 4
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight:500 }}>{c.apellido}, {c.nombre}</td>
                      <td>
                        <div style={{ display:'flex', gap:20, justifyContent:'center', alignItems:'center' }}>
                          {[0,1,2,3].map((slot) => {
                            const asi   = lista[slot]
                            const label = asi
                              ? asi.fecha.toString().slice(8,10)+'/'+asi.fecha.toString().slice(5,7)
                              : `V${slot+1}`
                            return (
                              <div key={slot} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                                <input type="checkbox" className="asistencia-check" checked={!!asi}
                                  disabled={!asi && lleno}
                                  title={asi ? `Desmarcar visita del ${label}` : lleno ? 'Máximo 4 por mes' : `Marcar visita ${slot+1}`}
                                  onChange={() => asi ? desmarcar(c.id) : marcar(c.id)}
                                />
                                <span style={{ fontSize:10, color: asi?'var(--primary)':'var(--gray-400)', fontWeight: asi?600:400 }}>
                                  {label}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        <span className={`badge ${lleno?'badge-purple':total>0?'badge-green':'badge-gray'}`}>{total}/4</span>
                      </td>
                      <td style={{ textAlign:'center' }}>
                        {total > 0
                          ? <button className="btn btn-ghost btn-sm" onClick={() => resetear(c.id, c.nombre)}>Resetear</button>
                          : <span style={{ color:'var(--gray-400)', fontSize:13 }}>—</span>
                        }
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
