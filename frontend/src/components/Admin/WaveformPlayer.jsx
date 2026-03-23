import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function WaveformPlayer({ src, onReady }) {
  const containerRef = useRef(null)
  const wsRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current || !src) return

    // 이전 인스턴스 정리
    if (wsRef.current) {
      wsRef.current.destroy()
      wsRef.current = null
    }

    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoading(true)

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#93c5fd',
      progressColor: '#3b82f6',
      cursorColor: '#1d4ed8',
      height: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      url: src,
    })

    ws.on('ready', () => {
      setDuration(ws.getDuration())
      setLoading(false)
      onReady?.()
    })

    ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()))
    ws.on('seeking', () => setCurrentTime(ws.getCurrentTime()))
    ws.on('play', () => setPlaying(true))
    ws.on('pause', () => setPlaying(false))
    ws.on('finish', () => setPlaying(false))

    wsRef.current = ws

    return () => {
      ws.destroy()
      wsRef.current = null
    }
  }, [src])

  const togglePlay = () => {
    wsRef.current?.playPause()
  }

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  // 스페이스바 재생/정지 (부모에서도 처리하므로 여기선 노출만)
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.key === ' ') { e.preventDefault(); wsRef.current?.playPause() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, marginBottom: 8 }}>
          파형 로딩 중...
        </div>
      )}
      <div ref={containerRef} style={{ opacity: loading ? 0.3 : 1 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10 }}>
        <button
          onClick={togglePlay}
          disabled={loading}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: '#3b82f6', color: '#fff', fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <span style={{ fontSize: 12, color: '#6b7280', minWidth: 70 }}>
          {fmt(currentTime)} / {fmt(duration)}
        </span>
        <span style={{ fontSize: 11, color: '#9ca3af' }}>Space: 재생/정지</span>
      </div>
    </div>
  )
}
