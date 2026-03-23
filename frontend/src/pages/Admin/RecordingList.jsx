import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import Pagination from '@/components/Admin/Pagination'

const PAGE_SIZE = 20
const STATUS_OPTIONS = ['', 'pending', 'analyzed', 'accepted', 'rejected']
const STATUS_META = {
  pending:  { label: '분석 대기', color: '#6b7280', bg: '#f3f4f6' },
  analyzed: { label: '검수 대기', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: '수락',     color: '#059669', bg: '#d1fae5' },
  rejected: { label: '반려',     color: '#dc2626', bg: '#fee2e2' },
}
const STATUS_LABEL = { '': '전체', pending: '분석 대기', analyzed: '검수 대기', accepted: '수락', rejected: '반려' }

const snrColor = (snr) => snr == null ? '#9ca3af' : snr >= 20 ? '#10b981' : snr >= 10 ? '#f59e0b' : '#ef4444'

export default function RecordingList() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const load = async (p = page, s = status) => {
    setLoading(true)
    try {
      const params = { skip: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE }
      if (s) params.status = s
      const res = await api.get('/recordings', { params })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page, status) }, [page, status])

  const handleStatusChange = (s) => {
    setStatus(s)
    setPage(1)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(`녹음 #${id}을 삭제하시겠습니까?\n파일도 함께 삭제되며 복구할 수 없습니다.`)) return
    try {
      await api.delete(`/recordings/${id}`)
      setItems((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => t - 1)
    } catch {
      alert('삭제 중 오류가 발생했습니다.')
    }
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={pageTitle}>🎙 녹음 데이터 관리</h2>
        <button style={outlineBtn} onClick={() => window.open('/api/v1/stats/export/metadata?status=accepted', '_blank')}>
          📊 메타데이터 CSV
        </button>
      </div>

      {/* 필터 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
              border: `1px solid ${status === s ? '#3b82f6' : '#e5e7eb'}`,
              background: status === s ? '#3b82f6' : '#fff',
              color: status === s ? '#fff' : '#374151',
              fontWeight: status === s ? 600 : 400,
            }}
            onClick={() => handleStatusChange(s)}
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr style={thRow}>
              {['ID', '발화자', '문장 텍스트', '시간(초)', 'SNR(dB)', '상태', '액션'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td></tr>
            ) : items.map((r) => {
              const m = STATUS_META[r.status] || STATUS_META.pending
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={td}>{r.id}</td>
                  <td style={td}>{r.user_name}</td>
                  <td style={{ ...td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.sentence_text}
                  </td>
                  <td style={td}>{r.duration?.toFixed(1) ?? '-'}</td>
                  <td style={{ ...td, color: snrColor(r.snr), fontWeight: r.snr != null && r.snr < 10 ? 700 : 400 }}>
                    {r.snr?.toFixed(1) ?? '-'}
                  </td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: m.color, background: m.bg }}>
                      {m.label}
                    </span>
                  </td>
                  <td style={{ ...td, display: 'flex', gap: 6 }}>
                    <button style={smBtn} onClick={() => navigate(`/admin/recordings/review?id=${r.id}`)}>
                      {r.status === 'analyzed' ? '검수' : '보기'}
                    </button>
                    <button style={delBtn} onClick={() => handleDelete(r.id)}>삭제</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} size={PAGE_SIZE} onChange={(p) => setPage(p)} />
    </div>
  )
}

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: 0, fontSize: 20, fontWeight: 700 }
const tableWrap  = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thRow      = { background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }
const th         = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }
const td         = { padding: '10px 12px' }
const outlineBtn = { padding: '7px 14px', borderRadius: 8, border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const smBtn      = { padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }
const delBtn     = { padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: 12 }
