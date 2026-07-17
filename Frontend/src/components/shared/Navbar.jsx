import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Navbar() {
  const { usuario, logout } = useAuth()

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <div className="navbar-brand-wrap">
          <div className="brand-mark">MV</div>
          <div>
            <span className="navbar-brand">MV Salón Urbano</span>
            <span className="navbar-subtitle">Gestión de peluquería</span>
          </div>
        </div>

        <NavLink to="/turnos" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Turnos</NavLink>
        <NavLink to="/clientes" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Clientes</NavLink>
        <NavLink to="/servicios" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Servicios</NavLink>
        <NavLink to="/asistencias" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>Asistencias</NavLink>

        <span className="navbar-spacer" />
        <div className="navbar-user-pill">
          <span className="navbar-user">👤 {usuario?.nombre}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
        </div>
      </div>
    </nav>
  )
}
