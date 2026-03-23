import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'

const GENDER_LABEL = { male: '남성', female: '여성', other: '기타' }
const AGE_LABEL = {
  '10s': '10대', '20s': '20대', '30s': '30대',
  '40s': '40대', '50s': '50대', '60s_above': '60대 이상',
}
const DIALECT_LABEL = {
  standard: '표준어', gyeonggi: '경기도', chungcheong: '충청도',
  jeolla: '전라도', gyeongsang: '경상도', gangwon: '강원도',
  jeju: '제주도', other: '기타',
}

const STATUS_META = {
  pending:  { label: '분석 대기', color: '#6b7280', bg: '#f3f4f6' },
  analyzed: { label: '검수 대기', color: '#d97706', bg: '#fef3c7' },
  accepted: { label: '수락',     color: '#059669', bg: '#d1fae5' },
  rejected: { label: '반려',     color: '#dc2626', bg: '#fee2e2' },
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.pending
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600, color: m.color, background: m.bg }}>
      {m.label}
    </span>
  )
}

function StatCard({ label, value }) {
  return (
    <div style={{ ...cardStyle, textAlign: 'center', padding: '16px 8px', flex: 1 }}>
      <p style={{ margin: '0 0 4px', fontSize: 12, color: '#6b7280' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111' }}>{value}</p>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>{value || '-'}</span>
    </div>
  )
}

export default function MyPage() {
  const { user: storeUser, updatePoints } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [recordings, setRecordings] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [meRes, recRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/recordings/my', { params: { limit: 20 } }),
        ])
        const me = meRes.data.data
        setProfile(me)
        updatePoints(me.points)
        setRecordings(recRes.data.data.items)
        setTotal(recRes.data.data.total)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ ...layoutStyle, textAlign: 'center', paddingTop: 60 }}>
        <p style={{ color: '#6b7280' }}>불러오는 중...</p>
      </div>
    )
  }

  const user = profile || storeUser
  const accepted = recordings.filter((r) => r.status === 'accepted').length
  const rejected = recordings.filter((r) => r.status === 'rejected').length
  const pending  = recordings.filter((r) => r.status === 'pending' || r.status === 'analyzed').length

  return (
    <div style={layoutStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
          ← 녹음하기
        </Link>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>마이페이지</h2>
        <div style={{ width: 56 }} />
      </div>

      {/* 포인트 강조 카드 */}
      <div style={{ ...cardStyle, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: '#fff', marginBottom: 14, textAlign: 'center' }}>
        <p style={{ margin: '0 0 4px', fontSize: 13, opacity: 0.85 }}>누적 포인트</p>
        <p style={{ margin: 0, fontSize: 42, fontWeight: 800, lineHeight: 1.1 }}>
          {user?.points || 0}
          <span style={{ fontSize: 18, fontWeight: 400 }}>P</span>
        </p>
      </div>

      {/* 통계 */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <StatCard label="전체 녹음" value={total} />
        <StatCard label="수락"      value={accepted} />
        <StatCard label="검수 대기" value={pending} />
        <StatCard label="반려"      value={rejected} />
      </div>

      {/* 프로필 */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={sectionTitle}>프로필</h3>
        <Row label="이름"   value={user?.name} />
        <Row label="아이디" value={user?.username} />
        <Row label="이메일" value={user?.email} />
      </div>

      {/* 화자 정보 */}
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <h3 style={sectionTitle}>화자 정보</h3>
        <Row label="성별"   value={GENDER_LABEL[user?.gender]   || user?.gender} />
        <Row label="연령대" value={AGE_LABEL[user?.age_group]   || user?.age_group} />
        <Row label="지역"   value={user?.region} />
        <Row label="방언"   value={DIALECT_LABEL[user?.dialect] || user?.dialect} />
      </div>

      {/* 최근 녹음 목록 */}
      <div style={cardStyle}>
        <h3 style={sectionTitle}>최근 녹음 ({total}개)</h3>
        {recordings.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>아직 녹음이 없습니다.</p>
        ) : (
          <div>
            {recordings.map((r) => (
              <div
                key={r.id}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f3f4f6',
                }}
              >
                <div>
                  <span style={{ fontSize: 13, color: '#374151' }}>문장 #{r.sentence_id}</span>
                  {r.duration != null && (
                    <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>
                      {r.duration.toFixed(1)}초
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={r.status} />
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>
                    {new Date(r.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const layoutStyle = {
  maxWidth: 600,
  margin: '40px auto',
  padding: '0 16px',
  fontFamily: 'sans-serif',
}

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
}

const sectionTitle = {
  margin: '0 0 10px',
  fontSize: 14,
  fontWeight: 700,
  color: '#374151',
}
