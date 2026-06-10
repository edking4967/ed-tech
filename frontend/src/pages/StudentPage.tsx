import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../useAuth'
import { useTimer } from '../useTimer'
import {
  Warmup, Summary, SubmissionWithWarmup,
  getActiveWarmup, getTodaySummary, mySubmissions, submitWarmup, joinClassroom,
} from '../api'

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function fmtSummaryDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export default function StudentPage() {
  const { token, user, classroomId, logout } = useAuth()
  const timer = useTimer(classroomId)

  const [warmup, setWarmup] = useState<Warmup | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [pastSubs, setPastSubs] = useState<SubmissionWithWarmup[]>([])
  const [submittedIds, setSubmittedIds] = useState<Set<number>>(new Set())
  const [response, setResponse] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [openItems, setOpenItems] = useState<Set<number>>(new Set())
  const [joinId, setJoinId] = useState('')
  const [joinError, setJoinError] = useState('')

  const totalRef = useRef(0)

  useEffect(() => {
    if (!token) return
    Promise.all([
      getActiveWarmup(token).catch(() => null),
      getTodaySummary(token).catch(() => null),
      mySubmissions(token).catch(() => []),
    ]).then(([w, s, subs]) => {
      setWarmup(w ?? null)
      setSummary(s ?? null)
      const subList = subs ?? []
      setPastSubs(subList)
      setSubmittedIds(new Set(subList.map(s => s.warmup_id)))
      if (w) totalRef.current = timer.remaining || 0
    })
  }, [token])

  async function handleSubmit() {
    if (!token || !warmup || !response.trim()) return
    setSubmitting(true)
    try {
      await submitWarmup(token, warmup.id, response.trim())
      setSubmittedIds(prev => new Set([...prev, warmup.id]))
      const subs = await mySubmissions(token)
      setPastSubs(subs)
    } catch (e: any) {
      if (e.status === 401) logout()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleJoin() {
    if (!token) return
    const id = parseInt(joinId)
    if (isNaN(id)) { setJoinError('Enter a valid classroom ID'); return }
    try {
      await joinClassroom(token, id)
      window.location.reload()
    } catch {
      setJoinError('Classroom not found')
    }
  }

  function toggleItem(id: number) {
    setOpenItems(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const alreadySubmitted = warmup ? submittedIds.has(warmup.id) : false
  const pct = totalRef.current > 0 ? (timer.remaining / totalRef.current) * 100 : 0
  const timerClass = timer.remaining <= 0 ? 'done' : timer.remaining <= 60 ? 'warn' : ''

  if (!classroomId) {
    return (
      <>
        <header>
          <div className="logo">&#9670; ClassRoom</div>
          <div className="user-chip">
            <div className="avatar">{initials(user?.name ?? '?')}</div>
            {user?.name}
          </div>
        </header>
        <div className="setup-wrap">
          <div className="card">
            <div className="card-label">Join a Classroom</div>
            <p className="card-body" style={{ marginBottom: 16 }}>
              Enter the classroom ID your teacher gave you.
            </p>
            <label>Classroom ID</label>
            <input
              type="text"
              placeholder="e.g. 1"
              value={joinId}
              onChange={e => setJoinId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            {joinError && <p style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 10 }}>{joinError}</p>}
            <div className="form-row">
              <button className="btn btn-primary" onClick={handleJoin}>Join</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <header>
        <div className="logo">&#9670; ClassRoom</div>
        <div className="user-chip">
          <div className="avatar">{initials(user?.name ?? '?')}</div>
          {user?.name}
        </div>
      </header>

      <div id="timer-bar">
        <div>
          <div id="timer-display" className={timerClass}>{fmt(timer.remaining)}</div>
          <div id="timer-label">{timer.running ? 'Time remaining' : 'Timer paused'}</div>
        </div>
        <div className="progress-track">
          <div
            className={`progress-fill ${timerClass}`}
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      </div>

      <main className="student-main">
        <div id="warmup-section">
          {warmup ? (
            <>
              <div className="card">
                <div className="card-label">Today's Warm-Up</div>
                <div className="card-title">{warmup.title}</div>
                <div className="card-body">{warmup.content}</div>
              </div>

              {alreadySubmitted ? (
                <div className="card">
                  <div className="submitted-badge">&#10003; Submitted — nice work!</div>
                </div>
              ) : (
                <div className="card">
                  <div className="card-label">Your Response</div>
                  <textarea
                    placeholder="Type your answer here…"
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                    <button
                      className="btn btn-primary"
                      onClick={handleSubmit}
                      disabled={submitting || !response.trim()}
                    >
                      {submitting ? 'Submitting…' : 'Submit'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="card">
              <div className="empty-state">
                <div className="icon">&#9749;</div>
                No active warm-up right now. Check back soon!
              </div>
            </div>
          )}
        </div>

        <aside>
          {summary && (
            <div className="card">
              <div className="card-label">Today's Summary</div>
              <div className="summary-date">{fmtSummaryDate(summary.date)}</div>
              <div className="card-title" style={{ fontSize: '1rem' }}>{summary.title}</div>
              <div className="card-body">{summary.content}</div>
            </div>
          )}

          <div className="card">
            <div className="card-label">Past Warm-Ups</div>
            {pastSubs.length === 0 ? (
              <div className="empty-state" style={{ padding: '24px 0 0' }}>
                No submissions yet.
              </div>
            ) : (
              <div className="warmup-list">
                {pastSubs.map(sub => {
                  const open = openItems.has(sub.id)
                  return (
                    <div key={sub.id} className="warmup-item">
                      <div className="warmup-item-header" onClick={() => toggleItem(sub.id)}>
                        <span className="warmup-item-title">{sub.warmup_title}</span>
                        <div className="warmup-item-meta">
                          {sub.grade && <span className="grade-chip">{sub.grade}</span>}
                          <span className="warmup-item-date">{fmtDate(sub.submitted_at)}</span>
                          <div className={`chevron ${open ? 'open' : ''}`} />
                        </div>
                      </div>
                      {open && (
                        <div className="warmup-item-body">
                          <strong>Question:</strong> {sub.warmup_content}
                          <div className="my-answer">
                            <strong>Your answer</strong>
                            {sub.content}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
      </main>
    </>
  )
}
