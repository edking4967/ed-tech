import { API } from '../api'

export default function LoginPage() {
  return (
    <div className="login-page">
      <div className="login-logo">&#9670; ClassRoom</div>
      <div className="login-subtitle">Sign in to get started</div>
      <div className="login-cards">
        <a className="login-card" href={`${API}/auth/login?role=student`}>
          <div className="login-card-icon">&#128218;</div>
          <div className="login-card-label">Student</div>
          <div className="login-card-hint">View warm-ups, submit answers, see your grades</div>
        </a>
        <a className="login-card" href={`${API}/auth/login?role=teacher`}>
          <div className="login-card-icon">&#128394;</div>
          <div className="login-card-label">Teacher</div>
          <div className="login-card-hint">Post warm-ups, grade submissions, control the timer</div>
        </a>
      </div>
    </div>
  )
}
