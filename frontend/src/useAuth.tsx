import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Classroom, getMe, getMyClassroom } from './api'

interface AuthState {
  token: string | null
  user: User | null
  classroom: Classroom | null
  classroomId: number | null
  loading: boolean
  setToken: (token: string) => void
  logout: () => void
  refreshClassroom: () => Promise<void>
}

const AuthContext = createContext<AuthState>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('cr_token'))
  const [user, setUser] = useState<User | null>(null)
  const [classroom, setClassroom] = useState<Classroom | null>(null)
  const [loading, setLoading] = useState(true)

  async function load(t: string) {
    setLoading(true)
    try {
      const u = await getMe(t)
      setUser(u)
      if (u.role === 'teacher') {
        try {
          const c = await getMyClassroom(t)
          setClassroom(c)
        } catch {
          setClassroom(null)
        }
      }
    } catch {
      localStorage.removeItem('cr_token')
      setTokenState(null)
      setUser(null)
      setClassroom(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      load(token)
    } else {
      setLoading(false)
    }
  }, [])

  function setToken(t: string) {
    localStorage.setItem('cr_token', t)
    setTokenState(t)
    load(t)
  }

  function logout() {
    localStorage.removeItem('cr_token')
    setTokenState(null)
    setUser(null)
    setClassroom(null)
  }

  async function refreshClassroom() {
    if (!token) return
    try {
      const c = await getMyClassroom(token)
      setClassroom(c)
    } catch {
      setClassroom(null)
    }
  }

  const classroomId =
    user?.role === 'student' ? (user.classroom_id ?? null) : (classroom?.id ?? null)

  return (
    <AuthContext.Provider value={{ token, user, classroom, classroomId, loading, setToken, logout, refreshClassroom }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
