import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'
import { api } from '@/api'

// src: API 경로 (예: /recordings/123/file)
export default function WaveformPlayer({ src }) {
  const containerRef = useRef(null)
  const wsRef        = useRef(null)
  const blobUrlRef   = useRef(null)
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(false)

  useEffect(() => {
    if (!containerRef.current || !src) return

    // 이전 인스턴스 정리
    wsRef.current?.destroy()
    wsRef.current = null
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoading(true)
    setError(false)

    // JWT 인증 헤더 포함하여 Blob 다운로드
    api.get(src, { responseType: 'blob' })
      .then((res) => {
        const blobUrl = URL.createObjectURL(res.data)
        blobUrlRef.current = blobUrl

        const ws = WaveSurfer.create({
          container:     containerRef.current,
          waveColor:     '#93c5fd',
          progressColor: '#3b82f6',
          cursorColor:   '#1d4ed8',
          height:        80,
          barWidth:      2,
          barGap:        1,
          barRadius:     2,
          normalize:     true,
          url:           blobUrl,
        })

        ws.on('ready',        () => { setDuration(ws.getDuration()); setLoading(false) })
        ws.on('audioprocess', () => setCurrentTime(ws.getCurrentTime()))
        ws.on('seeking',      () => setCurrentTime(ws.getCurrentTime()))
        ws.on('play',         () => setPlaying(true))
        ws.on('pause',        () => setPlaying(false))
        ws.on('finish',       () => setPlaying(false))

        wsRef.current = ws
      })
      .catch(() => { setLoading(false); setError(true) })

    return () => {
      wsRef.current?.destroy()
      wsRef.current = null
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [src])

  const togglePlay = () => wsRef.current?.playPause()

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }

  if (error) return (
    <div style={{ padding: 14, background: '#fef2f2', borderRadius: 10, color: '#dc2626', fontSize: 13 }}>
      오디오 파일을 불러올 수 없습니다.
    </div>
  )

  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px' }}>
      {loading && (
        <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: '20px 0' }}>
          파형 로딩 중...
        </div>
      )}
      <div ref={containerRef} style={{ display: loading ? 'none' : 'block' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: loading ? 0 : 10 }}>
        <button
          onClick={togglePlay}
          disabled={loading}
          style={{
            width: 36, height: 36, borderRadius: '50%', border: 'none',
            background: loading ? '#d1d5db' : '#3b82f6',
            color: '#fff', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
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
