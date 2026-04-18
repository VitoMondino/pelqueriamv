import { createContext, useContext, useState, useCallback } from 'react'
import axiosClient from '../api/axiosClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => {
    try {
      const u = localStorage.getItem('usuario')
      return u ? JSON.parse(u) : null
    } catch { return null }
  })

  const login = useCallback(async (email, password) => {
    const { data } = await axiosClient.post('/auth/login', { email, password })
    localStorage.setItem('token',   data.token)
    localStorage.setItem('usuario', JSON.stringify(data.usuario))
    setUsuario(data.usuario)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('usuario')
    setUsuario(null)
  }, [])

  return (
    <AuthContext.Provider value={{ usuario, login, logout, isAuth: !!usuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
