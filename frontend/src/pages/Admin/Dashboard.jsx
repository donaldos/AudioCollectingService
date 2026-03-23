import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  BarChart, Bar,
} from 'recharts'
import { api } from '@/api'
import KPICard from '@/components/Admin/KPICard'

const STATUS_LABELS = { pending: '분석 대기', analyzed: '검수 대기', accepted: '수락', rejected: '반려' }
const STATUS_COLOR  = { pending: '#f59e0b', analyzed: '#3b82f6', accepted: '#10b981', rejected: '#ef4444' }

function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)  return `${diff}초 전`
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
  return `${Math.floor(diff / 3600)}시간 전`
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [feed, setFeed] = useState([])
  const navigate = useNavigate()

  const loadDashboard = () =>
    api.get('/stats/dashboard').then((r) => setData(r.data.data))

  const loadFeed = () =>
    api.get('/recordings', { params: { limit: 10 } }).then((r) => setFeed(r.data.data.items))

  useEffect(() => {
    loadDashboard()
    loadFeed()
    const timer = setInterval(loadFeed, 5000)
    return () => clearInterval(timer)
  }, [])

  if (!data) return <div style={pageStyle}><p style={{ color: '#6b7280' }}>로딩 중...</p></div>

  const genderData = Object.entries(data.gender_dist).map(([k, v]) => ({ name: k === 'male' ? '남' : k === 'female' ? '여' : '기타', value: v }))
  const ageData    = Object.entries(data.age_dist).map(([k, v]) => ({ name: k, value: v }))

  return (
    <div style={pageStyle}>
      <h2 style={pageTitle}>📊 대시보드</h2>

      {/* KPI */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        <KPICard title="전체 참여자"  value={data.total_users}      unit="명"  icon="👤" onClick={() => navigate('/admin/users')} />
        <KPICard title="전체 녹음"    value={data.total_recordings}  unit="건"  icon="🎙" onClick={() => navigate('/admin/recordings')} />
        <KPICard title="검수 대기"    value={data.pending_review}    unit="건"  icon="⚠️" onClick={() => navigate('/admin/recordings/review')} />
        <KPICard title="오늘 녹음"    value={data.today_recordings}  unit="건"  icon="📈" />
      </div>

      {/* 수락/반려 */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <div style={card}>
          <p style={cardLabel}>수락</p>
          <p style={{ ...cardValue, color: '#10b981' }}>{data.accepted.toLocaleString()}<span style={cardUnit}>건</span></p>
        </div>
        <div style={card}>
          <p style={cardLabel}>반려</p>
          <p style={{ ...cardValue, color: '#ef4444' }}>{data.rejected.toLocaleString()}<span style={cardUnit}>건</span></p>
        </div>
      </div>

      {/* 차트 행 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
        {/* 14일 추이 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={chartTitle}>최근 14일 녹음 추이</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data.daily_trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => [`${v}건`, '녹음']} labelFormatter={(d) => d} />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 성별 분포 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={chartTitle}>성별 분포</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={genderData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 연령대 분포 */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <h3 style={chartTitle}>연령대 분포</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ageData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 실시간 피드 */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <h3 style={{ ...chartTitle, marginBottom: 14 }}>최근 녹음 현황 (5초 갱신)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
              {['시간', '사용자', '문장', '시간(초)', 'SNR', '상태', ''].map((h) => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: '#6b7280', fontWeight: 600 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {feed.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #f9fafb' }}>
                <td style={td}>{timeAgo(r.created_at)}</td>
                <td style={td}>{r.user_name}</td>
                <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.sentence_text?.slice(0, 30)}
                </td>
                <td style={td}>{r.duration?.toFixed(1) ?? '-'}</td>
                <td style={{ ...td, color: snrColor(r.snr) }}>{r.snr?.toFixed(1) ?? '-'}</td>
                <td style={td}>
                  <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: STATUS_COLOR[r.status] + '22', color: STATUS_COLOR[r.status] }}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </td>
                <td style={td}>
                  {r.status === 'analyzed' && (
                    <button style={smBtn} onClick={() => navigate(`/admin/recordings/review?id=${r.id}`)}>
                      검수
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const snrColor = (snr) => snr == null ? '#9ca3af' : snr >= 20 ? '#10b981' : snr >= 10 ? '#f59e0b' : '#ef4444'

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: '0 0 20px', fontSize: 20, fontWeight: 700 }
const chartTitle = { margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: '#374151' }
const card       = { background: '#fff', borderRadius: 12, padding: '16px 20px', flex: 1, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardLabel  = { margin: '0 0 4px', fontSize: 12, color: '#6b7280' }
const cardValue  = { margin: 0, fontSize: 26, fontWeight: 700, color: '#111' }
const cardUnit   = { fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 3 }
const td         = { padding: '8px 8px' }
const smBtn      = { padding: '3px 10px', borderRadius: 6, border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', cursor: 'pointer', fontSize: 12 }
