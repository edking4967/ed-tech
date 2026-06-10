import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../useAuth'

export default function AuthCallback() {
  const { setToken } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    if (token) {
      setToken(token)
    }
    navigate('/', { replace: true })
  }, [])

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--muted)' }}>
      Signing in…
    </div>
  )
}
