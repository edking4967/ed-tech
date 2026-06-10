import { useEffect, useRef, useState, useCallback } from 'react'
import { API } from './api'

export interface TimerState {
  remaining: number
  running: boolean
}

export function useTimer(classroomId: number | null) {
  const [state, setState] = useState<TimerState>({ remaining: 0, running: false })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (!classroomId) return
    const wsBase = API.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsBase}/timer/ws/${classroomId}`)
    wsRef.current = ws

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setState({ remaining: data.remaining ?? 0, running: data.running ?? false })
      } catch { /* ignore */ }
    }

    ws.onclose = () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      reconnectRef.current = setTimeout(connect, 2000)
    }
  }, [classroomId])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [connect])

  const send = useCallback((msg: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    }
  }, [])

  return { ...state, send }
}
