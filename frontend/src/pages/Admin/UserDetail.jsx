import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '@/api'

const GENDER_LABEL  = { male: '남성', female: '여성', other: '기타' }
const AGE_LABEL     = { '10s': '10대', '20s': '20대', '30s': '30대', '40s': '40대', '50s': '50대', '60s_above': '60대 이상' }
const DIALECT_LABEL = { standard: '표준어', gyeonggi: '경기도', chungcheong: '충청도', jeolla: '전라도', gyeongsang: '경상도', gangwon: '강원도', jeju: '제주도', other: '기타' }
const STATUS_META   = {
  pending:  { label: '분석 대기', color: '#6b7280', bg: '#f3f4f6' },
  analyzed: { label: '검수 대기', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: '수락',     color: '#059669', bg: '#d1fae5' },
  rejected: { label: '반려',     color: '#dc2626', bg: '#fee2e2' },
}

export default function UserDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [user, setUser]         = useState(null)
  const [recordings, setRecs]   = useState([])
  const [total, setTotal]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [deltaInput, setDelta]  = useState('')
  const [adjusting, setAdjusting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [userRes, recRes] = await Promise.all([
        api.get(`/users/${id}`),
        api.get('/recordings', { params: { user_id: id, limit: 30 } }),
      ])
      setUser(userRes.data.data)
      setRecs(recRes.data.data.items)
      setTotal(recRes.data.data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const handleActivate = async () => {
    if (!window.confirm(`[${user.name}] 계정을 활성화하시겠습니까?`)) return
    try {
      await api.patch(`/users/${id}/activate`)
      setUser((u) => ({ ...u, is_active: true }))
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const handleDeactivate = async () => {
    if (!window.confirm(`[${user.name}] 계정을 비활성화하시겠습니까?\n비활성화 시 로그인이 불가하며 녹음 데이터는 보존됩니다.`)) return
    try {
      await api.patch(`/users/${id}/deactivate`)
      setUser((u) => ({ ...u, is_active: false }))
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`[${user.name}] 계정을 완전히 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없으며 모든 녹음 데이터도 함께 삭제됩니다.`)) return
    if (!window.confirm('정말로 삭제하시겠습니까? 복구가 불가능합니다.')) return
    try {
      await api.delete(`/users/${id}`)
      alert('계정이 삭제되었습니다.')
      navigate('/admin/users')
    } catch {
      alert('처리 중 오류가 발생했습니다.')
    }
  }

  const handleAdjust = async (sign) => {
    const delta = parseInt(deltaInput)
    if (!deltaInput || isNaN(delta) || delta <= 0) { alert('포인트를 입력해 주세요.'); return }
    setAdjusting(true)
    try {
      const res = await api.patch(`/users/${id}/points`, { delta: sign * delta })
      setUser((u) => ({ ...u, points: res.data.data.points }))
      setDelta('')
    } finally {
      setAdjusting(false)
    }
  }

  if (loading) return <div style={pageStyle}><p style={{ color: '#9ca3af' }}>로딩 중...</p></div>
  if (!user)   return <div style={pageStyle}><p style={{ color: '#ef4444' }}>사용자를 찾을 수 없습니다.</p></div>

  const accepted = recordings.filter((r) => r.status === 'accepted').length
  const rejected = recordings.filter((r) => r.status === 'rejected').length
  const pending  = recordings.filter((r) => r.status === 'pending' || r.status === 'analyzed').length
  const progress = Math.min(100, Math.round((total / 100) * 100))

  return (
    <div style={pageStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button style={backBtn} onClick={() => navigate('/admin/users')}>← 목록</button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>
          👤 {user.name} (ID: {user.id})
          {!user.is_active && <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: '#ef4444', background: '#fee2e2', padding: '2px 8px', borderRadius: 99 }}>비활성</span>}
        </h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {user.is_active ? (
            <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #f59e0b', background: '#fff', color: '#d97706', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={handleDeactivate}>
              비활성화
            </button>
          ) : (
            <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #10b981', background: '#fff', color: '#059669', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              onClick={handleActivate}>
              활성화
            </button>
          )}
          <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            onClick={handleDelete}>
            삭제
          </button>
        </div>
      </div>

      {/* 기본 정보 + 통계 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* 기본 정보 */}
        <div style={card}>
          <h3 style={cardTitle}>기본 정보</h3>
          <InfoRow label="아이디"   value={user.username} />
          <InfoRow label="이름"     value={user.name} />
          <InfoRow label="이메일"   value={user.email} />
          <InfoRow label="성별"     value={GENDER_LABEL[user.gender]   || user.gender} />
          <InfoRow label="연령대"   value={AGE_LABEL[user.age_group]   || user.age_group} />
          <InfoRow label="지역"     value={user.region} />
          <InfoRow label="방언"     value={DIALECT_LABEL[user.dialect] || user.dialect} />
          <InfoRow label="가입일"   value={new Date(user.created_at).toLocaleDateString('ko-KR')} />
        </div>

        {/* 활동 통계 */}
        <div style={card}>
          <h3 style={cardTitle}>활동 통계</h3>
          <InfoRow label="전체 녹음" value={`${total}건`} />
          <InfoRow label="수락"      value={`${accepted}건`} />
          <InfoRow label="반려"      value={`${rejected}건`} />
          <InfoRow label="검수 대기" value={`${pending}건`} />
          <InfoRow label="누적 포인트" value={<span style={{ color: '#3b82f6', fontWeight: 700 }}>{user.points}P</span>} />

          {/* 진행률 */}
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#6b7280' }}>진행률 ({total}/100)</p>
            <div style={{ height: 8, background: '#e5e7eb', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', transition: 'width 0.4s' }} />
            </div>
          </div>

          {/* 포인트 조정 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #f3f4f6', paddingTop: 14 }}>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#374151' }}>포인트 수동 조정</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number" min="1" value={deltaInput}
                onChange={(e) => setDelta(e.target.value)}
                placeholder="포인트 입력"
                style={{ flex: 1, padding: '7px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}
              />
              <button style={{ ...smBtn, background: '#10b981', color: '#fff', border: 'none' }}
                onClick={() => handleAdjust(1)} disabled={adjusting}>
                + 추가
              </button>
              <button style={{ ...smBtn, background: '#ef4444', color: '#fff', border: 'none' }}
                onClick={() => handleAdjust(-1)} disabled={adjusting}>
                - 차감
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 녹음 목록 */}
      <div style={{ ...card }}>
        <h3 style={cardTitle}>녹음 목록 ({total}건)</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
              {['ID', '문장', '시간(초)', 'SNR(dB)', '상태', '날짜'].map((h) => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#6b7280', fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {recordings.map((r) => {
              const m = STATUS_META[r.status] || STATUS_META.pending
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px 10px' }}>{r.id}</td>
                  <td style={{ padding: '8px 10px', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.sentence_text}
                  </td>
                  <td style={{ padding: '8px 10px' }}>{r.duration?.toFixed(1) ?? '-'}</td>
                  <td style={{ padding: '8px 10px', color: r.snr >= 20 ? '#10b981' : r.snr >= 10 ? '#f59e0b' : '#ef4444' }}>
                    {r.snr?.toFixed(1) ?? '-'}
                  </td>
                  <td style={{ padding: '8px 10px' }}>
                    <span style={{ padding: '2px 7px', borderRadius: 99, fontSize: 11, fontWeight: 600, color: m.color, background: m.bg }}>
                      {m.label}
                    </span>
                  </td>
                  <td style={{ padding: '8px 10px', color: '#9ca3af', fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{value || '-'}</span>
    </div>
  )
}

const pageStyle = { padding: 28, fontFamily: 'sans-serif' }
const card      = { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardTitle = { margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#374151' }
const backBtn   = { padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 13 }
const smBtn     = { padding: '7px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }
