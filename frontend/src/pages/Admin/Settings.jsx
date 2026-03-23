import { useState, useEffect } from 'react'
import { api } from '@/api'

export default function Settings() {
  const [tab, setTab] = useState('points')

  return (
    <div style={pageStyle}>
      <h2 style={pageTitle}>⚙️ 시스템 설정</h2>

      {/* 탭 */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e7eb' }}>
        {[['points', '💰 포인트 정책'], ['export', '📤 데이터 내보내기']].map(([key, label]) => (
          <button
            key={key}
            style={{
              padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14,
              fontWeight: tab === key ? 700 : 400,
              color: tab === key ? '#3b82f6' : '#6b7280',
              borderBottom: `2px solid ${tab === key ? '#3b82f6' : 'transparent'}`,
              marginBottom: -2,
            }}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'points' && <PointsTab />}
      {tab === 'export' && <ExportTab />}
    </div>
  )
}

function PointsTab() {
  const [policy, setPolicy]   = useState({ session_points: 10 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  useEffect(() => {
    api.get('/settings/points-policy')
      .then((r) => setPolicy(r.data.data))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings/points-policy', policy)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ color: '#9ca3af' }}>로딩 중...</p>

  return (
    <div style={card}>
      <h3 style={cardTitle}>💰 포인트 정책</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
        변경사항은 이후 세션부터 적용됩니다.
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>세션 완료 포인트 (10문장 녹음 완료 시)</label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="number" min="0" max="1000"
            value={policy.session_points}
            onChange={(e) => setPolicy({ ...policy, session_points: parseInt(e.target.value) || 0 })}
            style={inputStyle}
          />
          <span style={{ fontSize: 14, color: '#374151' }}>포인트</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button style={primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? '저장 중...' : '저장'}
        </button>
        {saved && <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>✅ 저장되었습니다</span>}
      </div>
    </div>
  )
}

function ExportTab() {
  const [status, setStatus]   = useState('accepted')
  const [downloading, setDl]  = useState(false)

  const handleDownload = async () => {
    setDl(true)
    try {
      const url = `/api/v1/stats/export/metadata?status=${status}`
      const a = document.createElement('a')
      a.href = url
      a.download = `metadata_${status}.csv`
      a.click()
    } finally {
      setTimeout(() => setDl(false), 1500)
    }
  }

  return (
    <div style={card}>
      <h3 style={cardTitle}>📤 데이터 내보내기</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>
        메타데이터 CSV를 다운로드합니다. (file_path, sentence, user, quality 지표 포함)
      </p>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>내보낼 녹음 상태</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{ ...inputStyle, maxWidth: 200 }}
        >
          <option value="accepted">수락됨 (accepted)</option>
          <option value="analyzed">분석 완료 (analyzed)</option>
          <option value="pending">분석 대기 (pending)</option>
          <option value="rejected">반려됨 (rejected)</option>
        </select>
      </div>

      <div style={{ background: '#fef3c7', borderRadius: 8, padding: '12px 16px', marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 13, color: '#92400e' }}>
          ⚠️ 데이터가 많을 경우 수 초가 소요될 수 있습니다.
        </p>
      </div>

      <button style={primaryBtn} onClick={handleDownload} disabled={downloading}>
        {downloading ? '다운로드 중...' : '📄 메타데이터 CSV 다운로드'}
      </button>
    </div>
  )
}

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: '0 0 20px', fontSize: 20, fontWeight: 700 }
const card       = { background: '#fff', borderRadius: 12, padding: 28, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', maxWidth: 540 }
const cardTitle  = { margin: '0 0 8px', fontSize: 16, fontWeight: 700, color: '#111' }
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }
const inputStyle = { padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, width: 120 }
const primaryBtn = { padding: '10px 20px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }
