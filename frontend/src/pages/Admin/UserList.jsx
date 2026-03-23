import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api'
import Pagination from '@/components/Admin/Pagination'

const PAGE_SIZE = 20
const GENDER_LABEL = { male: '남성', female: '여성', other: '기타' }
const AGE_LABEL = { '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', '60s_above': '60대+' }

export default function UserList() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get('/users', { params: { skip: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE, include_inactive: true } })
      setItems(res.data.data.items)
      setTotal(res.data.data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  return (
    <div style={pageStyle}>
      <h2 style={pageTitle}>👥 사용자 관리</h2>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr style={thRow}>
              {['ID', '아이디', '이름', '성별', '연령대', '지역', '녹음 수', '포인트', '가입일', '상태', ''].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>로딩 중...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>데이터가 없습니다.</td></tr>
            ) : items.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{u.id}</td>
                <td style={td}>{u.username}</td>
                <td style={td}>{u.name}</td>
                <td style={td}>{GENDER_LABEL[u.gender] || u.gender}</td>
                <td style={td}>{AGE_LABEL[u.age_group] || u.age_group}</td>
                <td style={td}>{u.region}</td>
                <td style={td}>{u.recording_count}</td>
                <td style={{ ...td, fontWeight: 600, color: '#3b82f6' }}>{u.points}P</td>
                <td style={td}>{new Date(u.created_at).toLocaleDateString('ko-KR')}</td>
                <td style={td}>
                  {u.is_active
                    ? <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', background: '#d1fae5', padding: '2px 8px', borderRadius: 99 }}>활성</span>
                    : <span style={{ fontSize: 11, fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: 99 }}>비활성</span>
                  }
                </td>
                <td style={td}>
                  <button style={smBtn} onClick={() => navigate(`/admin/users/${u.id}`)}>상세</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} size={PAGE_SIZE} onChange={(p) => setPage(p)} />
    </div>
  )
}

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: '0 0 20px', fontSize: 20, fontWeight: 700 }
const tableWrap  = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thRow      = { background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }
const th         = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }
const td         = { padding: '10px 12px' }
const smBtn      = { padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }
