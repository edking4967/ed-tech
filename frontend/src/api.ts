export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export interface User {
  id: number
  email: string
  name: string
  role: 'student' | 'teacher'
  classroom_id: number | null
}

export interface Classroom {
  id: number
  name: string
  teacher_id: number
}

export interface Warmup {
  id: number
  title: string
  content: string
  classroom_id: number
  created_by: number
  created_at: string
  is_active: boolean
}

export interface Submission {
  id: number
  warmup_id: number
  student_id: number
  content: string
  grade: string | null
  submitted_at: string
}

export interface SubmissionWithStudent extends Submission {
  student_name: string
}

export interface SubmissionWithWarmup {
  id: number
  warmup_id: number
  warmup_title: string
  warmup_content: string
  content: string
  grade: string | null
  submitted_at: string
}

export interface Summary {
  id: number
  classroom_id: number
  title: string
  content: string
  date: string
  created_by: number
}

async function req<T>(path: string, token: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw Object.assign(new Error(text || res.statusText), { status: res.status })
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// Auth
export const getMe = (token: string) => req<User>('/auth/me', token)

// Classrooms
export const getMyClassroom = (token: string) => req<Classroom>('/classrooms/mine', token)
export const createClassroom = (token: string, name: string) =>
  req<Classroom>('/classrooms/', token, { method: 'POST', body: JSON.stringify({ name }) })
export const joinClassroom = (token: string, id: number) =>
  req<{ ok: boolean }>(`/classrooms/${id}/join`, token, { method: 'POST' })

// Warmups
export const getActiveWarmup = (token: string) => req<Warmup | null>('/warmups/active', token)
export const listWarmups = (token: string) => req<Warmup[]>('/warmups/', token)
export const createWarmup = (token: string, title: string, content: string) =>
  req<Warmup>('/warmups/', token, { method: 'POST', body: JSON.stringify({ title, content }) })
export const activateWarmup = (token: string, id: number) =>
  req<Warmup>(`/warmups/${id}/activate`, token, { method: 'POST' })
export const deactivateWarmup = (token: string, id: number) =>
  req<Warmup>(`/warmups/${id}/deactivate`, token, { method: 'POST' })

// Submissions
export const submitWarmup = (token: string, warmupId: number, content: string) =>
  req<Submission>(`/submissions/${warmupId}`, token, { method: 'POST', body: JSON.stringify({ content }) })
export const mySubmissions = (token: string) => req<SubmissionWithWarmup[]>('/submissions/mine', token)
export const listSubmissions = (token: string, warmupId: number) =>
  req<SubmissionWithStudent[]>(`/submissions/${warmupId}`, token)
export const gradeSubmission = (token: string, submissionId: number, grade: string) =>
  req<Submission>(`/submissions/${submissionId}/grade`, token, {
    method: 'PATCH',
    body: JSON.stringify({ grade }),
  })

// Summaries
export const getTodaySummary = (token: string) => req<Summary | null>('/summaries/today', token)
export const listSummaries = (token: string) => req<Summary[]>('/summaries/', token)
export const createSummary = (token: string, title: string, content: string, date: string) =>
  req<Summary>('/summaries/', token, { method: 'POST', body: JSON.stringify({ title, content, date }) })
