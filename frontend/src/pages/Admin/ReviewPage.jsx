import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '@/api'

const SNR_COLOR = (snr) => snr == null ? '#9ca3af' : snr >= 20 ? '#10b981' : snr >= 10 ? '#f59e0b' : '#ef4444'
const SNR_LABEL = (snr) => snr == null ? '-' : snr >= 20 ? '양호' : snr >= 10 ? '주의' : '불량'

export default function ReviewPage() {
  const [queue, setQueue] = useState([])         // 검수 대기 목록
  const [selected, setSelected] = useState(null) // 현재 선택된 녹음
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [autoNext, setAutoNext] = useState(true)
  const audioRef = useRef(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const loadQueue = async () => {
    setLoading(true)
    try {
      const res = await api.get('/recordings', { params: { status: 'analyzed', limit: 50 } })
      const items = res.data.data.items
      setQueue(items)
      // URL에 id 파라미터가 있으면 해당 항목 선택
      const idParam = searchParams.get('id')
      if (idParam) {
        const target = items.find((r) => r.id === parseInt(idParam))
        if (target) { setSelected(target); setNote('') }
        else if (items.length > 0) { setSelected(items[0]); setNote('') }
      } else if (items.length > 0) {
        setSelected(items[0])
        setNote('')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, [])

  // 키보드 단축키
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return
      if (e.key === 'a' || e.key === 'A') handleReview('accept')
      if (e.key === 'r' || e.key === 'R') handleReview('reject')
      if (e.key === ' ') { e.preventDefault(); audioRef.current?.paused ? audioRef.current?.play() : audioRef.current?.pause() }
      if (e.key === 'ArrowRight') selectNext()
      if (e.key === 'ArrowLeft')  selectPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [selected, queue, note])

  const selectNext = useCallback(() => {
    const idx = queue.findIndex((r) => r.id === selected?.id)
    if (idx < queue.length - 1) { setSelected(queue[idx + 1]); setNote('') }
  }, [selected, queue])

  const selectPrev = useCallback(() => {
    const idx = queue.findIndex((r) => r.id === selected?.id)
    if (idx > 0) { setSelected(queue[idx - 1]); setNote('') }
  }, [selected, queue])

  const handleReview = async (action) => {
    if (!selected || submitting) return
    setSubmitting(true)
    try {
      await api.patch(`/recordings/${selected.id}/review`, { action, note })
      const newQueue = queue.filter((r) => r.id !== selected.id)
      setQueue(newQueue)
      if (autoNext && newQueue.length > 0) {
        const idx = queue.findIndex((r) => r.id === selected.id)
        const next = newQueue[Math.min(idx, newQueue.length - 1)]
        setSelected(next)
        setNote('')
      } else {
        setSelected(null)
        setNote('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const audioSrc = selected ? `/api/v1/recordings/${selected.id}/file` : null

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      {/* 왼쪽: 검수 대기 목록 */}
      <div style={{ width: 260, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px 14px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>검수 대기 ({queue.length}건)</h3>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3b82f6', fontSize: 12 }} onClick={loadQueue}>
              새로고침
            </button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>로딩 중...</p>
          ) : queue.length === 0 ? (
            <p style={{ padding: 16, color: '#9ca3af', fontSize: 13 }}>검수 대기 항목이 없습니다.</p>
          ) : queue.map((r) => (
            <div
              key={r.id}
              onClick={() => { setSelected(r); setNote('') }}
              style={{
                padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                background: selected?.id === r.id ? '#eff6ff' : '#fff',
                borderLeft: selected?.id === r.id ? '3px solid #3b82f6' : '3px solid transparent',
              }}
            >
              <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13, color: '#111' }}>#{r.id} {r.user_name}</p>
              <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {r.sentence_text?.slice(0, 30)}
              </p>
              <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>
                {r.duration?.toFixed(1)}초 | SNR {r.snr?.toFixed(1) ?? '-'}dB
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽: 상세 검수 패널 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
        {/* 헤더 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>🔍 품질 검수</h2>
          <button style={outlineBtn} onClick={() => navigate('/admin/recordings')}>← 목록으로</button>
        </div>

        {!selected ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
            <p style={{ fontSize: 40 }}>✅</p>
            <p>검수할 항목이 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 발화자 정보 */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={cardTitle}>👤 발화자 정보 — 녹음 #{selected.id}</h3>
              <p style={{ margin: 0, fontSize: 14, color: '#374151' }}>
                {selected.user_name} | {new Date(selected.created_at).toLocaleString('ko-KR')}
              </p>
            </div>

            {/* 발화 문장 */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={cardTitle}>📝 발화 문장</h3>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 600, lineHeight: 1.6, color: '#111' }}>
                "{selected.sentence_text}"
              </p>
            </div>

            {/* 오디오 플레이어 */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={cardTitle}>🔊 오디오 재생 <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(Space: 재생/정지)</span></h3>
              <audio
                ref={audioRef}
                key={audioSrc}
                src={audioSrc}
                controls
                style={{ width: '100%' }}
              />
            </div>

            {/* 품질 지표 */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={cardTitle}>📊 품질 지표</h3>
              <div style={{ display: 'flex', gap: 16 }}>
                <MetricBox label="Duration" value={`${selected.duration?.toFixed(1) ?? '-'}초`}
                  ok={selected.duration != null && selected.duration >= 0.5} />
                <MetricBox label="SNR" value={`${selected.snr?.toFixed(1) ?? '-'}dB`}
                  ok={selected.snr != null && selected.snr >= 10}
                  color={SNR_COLOR(selected.snr)} sub={SNR_LABEL(selected.snr)} />
                <MetricBox label="Energy" value={selected.energy?.toFixed(5) ?? '-'}
                  ok={selected.energy != null && selected.energy > 0.001} />
              </div>
            </div>

            {/* 검수 메모 */}
            <div style={{ ...card, marginBottom: 16 }}>
              <h3 style={cardTitle}>💬 검수 메모 <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>(선택)</span></h3>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="예: 끝 부분 잡음 있음, 발음 불명확 등"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical', minHeight: 60, boxSizing: 'border-box' }}
              />
            </div>

            {/* 승인/반려 버튼 */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                style={{ ...actionBtn, background: '#10b981', flex: 1 }}
                onClick={() => handleReview('accept')}
                disabled={submitting}
              >
                ✅ 승인 (Accept) <span style={{ fontSize: 12, opacity: 0.8 }}>— A</span>
              </button>
              <button
                style={{ ...actionBtn, background: '#ef4444', flex: 1 }}
                onClick={() => handleReview('reject')}
                disabled={submitting}
              >
                ❌ 반려 (Reject) <span style={{ fontSize: 12, opacity: 0.8 }}>— R</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" id="autoNext" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
              <label htmlFor="autoNext" style={{ fontSize: 13, color: '#6b7280', cursor: 'pointer' }}>
                다음 건으로 자동 이동
              </label>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
                ← → 이전/다음 | Space 재생
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MetricBox({ label, value, ok, color, sub }) {
  return (
    <div style={{ flex: 1, background: '#f8fafc', borderRadius: 8, padding: '12px 14px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>{label}</p>
      <p style={{ margin: '0 0 2px', fontSize: 18, fontWeight: 700, color: color || '#111' }}>{value}</p>
      <p style={{ margin: 0, fontSize: 11, color: ok ? '#10b981' : '#ef4444', fontWeight: 600 }}>
        {ok == null ? '' : ok ? '✅ 양호' : '⚠️ 주의'} {sub || ''}
      </p>
    </div>
  )
}

const card       = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardTitle  = { margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#6b7280' }
const outlineBtn = { padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const actionBtn  = { padding: '14px', borderRadius: 10, border: 'none', color: '#fff', fontWeight: 700, fontSize: 16, cursor: 'pointer' }
