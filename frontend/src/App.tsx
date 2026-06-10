import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './useAuth'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import StudentPage from './pages/StudentPage'
import TeacherPage from './pages/TeacherPage'

function AppRoutes() {
  const { token, user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted)' }}>
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={token ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/*"
        element={
          !token ? (
            <Navigate to="/login" replace />
          ) : user?.role === 'teacher' ? (
            <TeacherPage />
          ) : (
            <StudentPage />
          )
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
