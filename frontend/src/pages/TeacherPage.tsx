import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../useAuth'
import { useTimer } from '../useTimer'
import {
  Warmup, Summary, SubmissionWithStudent,
  listWarmups, createWarmup, activateWarmup, deactivateWarmup,
  listSubmissions, gradeSubmission,
  listSummaries, createSummary,
  createClassroom,
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
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

type Tab = 'warmups' | 'submissions' | 'summaries' | 'timer'

export default function TeacherPage() {
  const { token, user, classroom, classroomId, logout, refreshClassroom } = useAuth()
  const timer = useTimer(classroomId)

  const [tab, setTab] = useState<Tab>('warmups')
  const [warmups, setWarmups] = useState<Warmup[]>([])
  const [summaries, setSummaries] = useState<Summary[]>([])
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([])
  const [selectedWarmupId, setSelectedWarmupId] = useState<number | null>(null)
  const [grades, setGrades] = useState<Record<number, string>>({})

  // Warmup form
  const [wuTitle, setWuTitle] = useState('')
  const [wuBody, setWuBody] = useState('')

  // Summary form
  const [sumTitle, setSumTitle] = useState('')
  const [sumDate, setSumDate] = useState(today())
  const [sumBody, setSumBody] = useState('')

  // Timer
  const timerTotalRef = useRef(0)
  const [customSecs, setCustomSecs] = useState('')

  // Classroom setup
  const [newClassName, setNewClassName] = useState('')
  const [classroomError, setClassroomError] = useState('')

  // Toast
  const [toastMsg, setToastMsg] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toast(msg: string) {
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(''), 2200)
  }

  useEffect(() => {
    if (!token || !classroomId) return
    Promise.all([
      listWarmups(token).catch(() => []),
      listSummaries(token).catch(() => []),
    ]).then(([ws, ss]) => {
      setWarmups(ws)
      setSummaries(ss)
      if (ws.length > 0) setSelectedWarmupId(ws[0].id)
    })
  }, [token, classroomId])

  useEffect(() => {
    if (!token || selectedWarmupId === null) return
    listSubmissions(token, selectedWarmupId)
      .then(subs => {
        setSubmissions(subs)
        const g: Record<number, string> = {}
        subs.forEach(s => { if (s.grade) g[s.id] = s.grade })
        setGrades(g)
      })
      .catch(() => {})
  }, [token, selectedWarmupId])

  async function handleCreateClassroom() {
    if (!token || !newClassName.trim()) return
    try {
      await createClassroom(token, newClassName.trim())
      await refreshClassroom()
      setNewClassName('')
    } catch {
      setClassroomError('Failed to create classroom')
    }
  }

  async function handlePostWarmup() {
    if (!token || !wuTitle.trim()) return
    try {
      const w = await createWarmup(token, wuTitle.trim(), wuBody.trim())
      setWarmups(prev => [w, ...prev])
      setWuTitle('')
      setWuBody('')
      if (selectedWarmupId === null) setSelectedWarmupId(w.id)
      toast('Warm-up posted')
    } catch (e: any) {
      if (e.status === 401) logout()
    }
  }

  async function handleActivate(warmup: Warmup) {
    if (!token) return
    try {
      const updated = await activateWarmup(token, warmup.id)
      setWarmups(prev => prev.map(w => ({ ...w, is_active: w.id === updated.id })))
      toast('Warm-up activated')
    } catch (e: any) {
      if (e.status === 401) logout()
    }
  }

  async function handleDeactivate(warmup: Warmup) {
    if (!token) return
    try {
      const updated = await deactivateWarmup(token, warmup.id)
      setWarmups(prev => prev.map(w => w.id === updated.id ? updated : w))
      toast('Warm-up deactivated')
    } catch (e: any) {
      if (e.status === 401) logout()
    }
  }

  async function handleSaveGrades() {
    if (!token) return
    try {
      await Promise.all(
        Object.entries(grades).map(([id, grade]) =>
          gradeSubmission(token, Number(id), grade)
        )
      )
      setSubmissions(prev => prev.map(s => ({ ...s, grade: grades[s.id] ?? s.grade })))
      toast('Grades saved')
    } catch (e: any) {
      if (e.status === 401) logout()
    }
  }

  async function handlePostSummary() {
    if (!token || !sumTitle.trim()) return
    try {
      const s = await createSummary(token, sumTitle.trim(), sumBody.trim(), sumDate)
      setSummaries(prev => [s, ...prev])
      setSumTitle('')
      setSumBody('')
      setSumDate(today())
      toast('Summary posted')
    } catch (e: any) {
      if (e.status === 401) logout()
    }
  }

  function timerSet(s: number) {
    timerTotalRef.current = s
    timer.send({ action: 'set', seconds: s })
  }

  const timerClass = timer.remaining <= 0 ? 'done' : timer.remaining <= 60 ? 'warn' : ''
  const submittedCount = submissions.filter(s => s.content).length

  if (!classroom) {
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
            <div className="card-label">Create Your Classroom</div>
            <p className="card-body" style={{ marginBottom: 16 }}>
              Give your classroom a name to get started.
            </p>
            <label>Classroom Name</label>
            <input
              type="text"
              placeholder="e.g. Period 3 Physics"
              value={newClassName}
              onChange={e => setNewClassName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateClassroom()}
            />
            {classroomError && (
              <p style={{ color: 'var(--danger)', fontSize: '.85rem', marginBottom: 10 }}>{classroomError}</p>
            )}
            <div className="form-row">
              <button className="btn btn-primary" onClick={handleCreateClassroom}>Create Classroom</button>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="teacher-body">
      <header>
        <div className="logo">&#9670; ClassRoom</div>
        <div className="user-chip">
          <div className="avatar">{initials(user?.name ?? '?')}</div>
          {user?.name} &mdash; {classroom.name}
          <span style={{ marginLeft: 8, fontSize: '.75rem', color: 'var(--muted)' }}>
            ID: {classroom.id}
          </span>
        </div>
      </header>

      <nav>
        {(['warmups', 'submissions', 'summaries', 'timer'] as Tab[]).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'warmups' ? 'Warm-Ups' : t === 'submissions' ? 'Submissions' : t === 'summaries' ? 'Daily Summaries' : 'Timer'}
          </button>
        ))}
      </nav>

      <main className="teacher-main">

        {/* ── Warm-Ups ── */}
        <div className={`panel ${tab === 'warmups' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-label">New Warm-Up</div>
            <label>Title</label>
            <input type="text" placeholder="e.g. Newton's Third Law" value={wuTitle} onChange={e => setWuTitle(e.target.value)} />
            <label>Prompt / Question</label>
            <textarea placeholder="Write the question students will answer…" value={wuBody} onChange={e => setWuBody(e.target.value)} />
            <div className="form-row">
              <button className="btn btn-ghost" onClick={() => { setWuTitle(''); setWuBody('') }}>Clear</button>
              <button className="btn btn-primary" onClick={handlePostWarmup} disabled={!wuTitle.trim()}>Post Warm-Up</button>
            </div>
          </div>

          <div className="card">
            <div className="card-label">Warm-Up History</div>
            {warmups.length === 0 ? (
              <div className="empty-state">No warm-ups posted yet.</div>
            ) : (
              warmups.map(w => (
                <div key={w.id} className="warmup-row">
                  <div className="warmup-row-content">
                    <div className="warmup-row-title">
                      {w.title}
                      <span className={`warmup-pill ${w.is_active ? 'pill-active' : 'pill-inactive'}`} style={{ marginLeft: 8 }}>
                        {w.is_active ? '● Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="warmup-row-body">{w.content}</div>
                  </div>
                  <div className="warmup-row-actions">
                    <span style={{ fontSize: '.8rem', color: 'var(--muted)' }}>{fmtDate(w.created_at)}</span>
                    {w.is_active ? (
                      <button className="btn btn-sm btn-danger" onClick={() => handleDeactivate(w)}>Deactivate</button>
                    ) : (
                      <button className="btn btn-sm btn-ghost" onClick={() => handleActivate(w)}>Activate</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Submissions ── */}
        <div className={`panel ${tab === 'submissions' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-label">
              Submissions — {warmups.find(w => w.id === selectedWarmupId)?.title ?? 'Select a warm-up'}
            </div>
            <div className="sub-filter">
              <span style={{ fontSize: '.85rem', color: 'var(--muted)' }}>Warm-Up:</span>
              <select
                value={selectedWarmupId ?? ''}
                onChange={e => setSelectedWarmupId(Number(e.target.value))}
              >
                {warmups.map(w => (
                  <option key={w.id} value={w.id}>{w.title}{w.is_active ? ' (active)' : ''}</option>
                ))}
              </select>
              <span style={{ fontSize: '.85rem', color: 'var(--muted)', marginLeft: 'auto' }}>
                {submittedCount} submitted
              </span>
            </div>

            {submissions.length === 0 ? (
              <div className="empty-state">No submissions yet.</div>
            ) : (
              <>
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Response</th>
                      <th>Grade</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => (
                      <tr key={s.id}>
                        <td>{s.student_name}</td>
                        <td className="answer-text">{s.content}</td>
                        <td>
                          <input
                            type="text"
                            className="grade-input"
                            value={grades[s.id] ?? ''}
                            placeholder="—"
                            onChange={e => setGrades(prev => ({ ...prev, [s.id]: e.target.value }))}
                          />
                        </td>
                        <td>
                          <span className={`status-chip ${s.grade || grades[s.id] ? 'chip-graded' : 'chip-pending'}`}>
                            {s.grade || grades[s.id] ? 'Graded' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="form-row" style={{ marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" onClick={handleSaveGrades}>Save Grades</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Daily Summaries ── */}
        <div className={`panel ${tab === 'summaries' ? 'active' : ''}`}>
          <div className="card">
            <div className="card-label">Post Today's Summary</div>
            <div className="grid-2">
              <div>
                <label>Topic / Title</label>
                <input type="text" placeholder="e.g. Newton's Laws &amp; Applications" value={sumTitle} onChange={e => setSumTitle(e.target.value)} />
              </div>
              <div>
                <label>Date</label>
                <input type="date" value={sumDate} onChange={e => setSumDate(e.target.value)} />
              </div>
            </div>
            <label>Summary</label>
            <textarea placeholder="What did you cover today? Homework, upcoming quizzes, etc." value={sumBody} onChange={e => setSumBody(e.target.value)} />
            <div className="form-row">
              <button className="btn btn-ghost" onClick={() => { setSumTitle(''); setSumBody(''); setSumDate(today()) }}>Clear</button>
              <button className="btn btn-primary" onClick={handlePostSummary} disabled={!sumTitle.trim()}>Post Summary</button>
            </div>
          </div>

          <div className="card">
            <div className="card-label">Recent Summaries</div>
            {summaries.length === 0 ? (
              <div className="empty-state">No summaries posted yet.</div>
            ) : (
              summaries.map(s => (
                <div key={s.id} className="warmup-row">
                  <div className="warmup-row-content">
                    <div className="warmup-row-title">{s.title}</div>
                    <div className="warmup-row-body">{s.content}</div>
                  </div>
                  <span style={{ fontSize: '.8rem', color: 'var(--muted)', whiteSpace: 'nowrap', paddingTop: 2 }}>
                    {fmtDate(s.date)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Timer ── */}
        <div className={`panel ${tab === 'timer' ? 'active' : ''}`}>
          <div className="card" style={{ maxWidth: 480, margin: '0 auto' }}>
            <div className="card-label" style={{ textAlign: 'center' }}>Class Timer</div>
            <div className={`timer-display ${timerClass}`}>{fmt(timer.remaining)}</div>

            <div className="timer-controls">
              <button
                className="btn btn-success"
                onClick={() => timer.send({ action: 'start' })}
                disabled={timer.running || timer.remaining === 0}
              >
                &#9654; Start
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => timer.send({ action: 'pause' })}
                disabled={!timer.running}
              >
                &#10074;&#10074; Pause
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => timer.send({ action: 'reset' })}
              >
                &#8635; Reset
              </button>
            </div>

            <div className="preset-row">
              {[60, 120, 180, 300, 600].map(s => (
                <button key={s} className="preset-btn" onClick={() => timerSet(s)}>
                  {s < 60 ? `${s}s` : `${s / 60} min`}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 20, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <label>Custom (seconds)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="e.g. 240"
                  value={customSecs}
                  onChange={e => setCustomSecs(e.target.value)}
                  style={{ marginBottom: 0 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const v = parseInt(customSecs)
                      if (!isNaN(v) && v > 0) timerSet(v)
                    }
                  }}
                />
                <button
                  className="btn btn-ghost"
                  style={{ flexShrink: 0 }}
                  onClick={() => {
                    const v = parseInt(customSecs)
                    if (!isNaN(v) && v > 0) timerSet(v)
                  }}
                >
                  Set
                </button>
              </div>
            </div>
          </div>
        </div>

      </main>

      <div id="toast" className={toastMsg ? 'show' : ''}>
        {toastMsg ? `✓ ${toastMsg}` : ''}
      </div>
    </div>
  )
}
