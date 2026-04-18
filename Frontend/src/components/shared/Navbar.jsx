import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { usuario, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <span className="navbar-brand">✂️ Peluquería</span>

        <NavLink to="/turnos"      className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Turnos</NavLink>
        <NavLink to="/clientes"    className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Clientes</NavLink>
        <NavLink to="/servicios"   className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Servicios</NavLink>
        <NavLink to="/asistencias" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Asistencias</NavLink>

        <span className="navbar-spacer" />
        <span className="navbar-user">👤 {usuario?.nombre}</span>
        <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
      </div>
    </nav>
  )
}
