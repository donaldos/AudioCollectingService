import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'

export default function RecordPage() {
  const { user, logout } = useAuthStore()

  return (
    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>VoiceCollect</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/mypage" style={linkStyle}>마이페이지</Link>
          <button onClick={logout} style={btnStyle}>로그아웃</button>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>안녕하세요, {user?.name}님!</h2>
        <p style={{ color: '#6b7280', margin: '0 0 24px' }}>
          누적 포인트: <strong>{user?.points || 0}P</strong>
        </p>
        <p style={{ color: '#374151', lineHeight: 1.6 }}>
          녹음 기능을 준비 중입니다. (Phase 9에서 구현 예정)
        </p>
      </div>
    </div>
  )
}

const cardStyle = {
  background: '#fff', borderRadius: 12, padding: 28,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
}
const linkStyle = { color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }
const btnStyle = {
  padding: '6px 14px', borderRadius: 8, border: '1px solid #d1d5db',
  background: '#fff', cursor: 'pointer', fontSize: 13,
}
