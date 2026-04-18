import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'
import Navbar        from './components/shared/Navbar'
import LoginPage     from './pages/LoginPage'
import ClientesPage  from './pages/ClientesPage'
import ServiciosPage from './pages/ServiciosPage'
import TurnosPage    from './pages/TurnosPage'
import AsistenciasPage from './pages/AsistenciasPage'

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout><Navigate to="/turnos" replace /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/clientes" element={
            <ProtectedRoute>
              <Layout><ClientesPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/servicios" element={
            <ProtectedRoute>
              <Layout><ServiciosPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/turnos" element={
            <ProtectedRoute>
              <Layout><TurnosPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="/asistencias" element={
            <ProtectedRoute>
              <Layout><AsistenciasPage /></Layout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/turnos" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
