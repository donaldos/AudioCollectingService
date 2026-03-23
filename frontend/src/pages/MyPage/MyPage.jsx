import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function MyPage() {
  const { user } = useAuthStore()

  return (
    <div style={{ maxWidth: 640, margin: '60px auto', padding: '0 16px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14 }}>← 녹음하기</Link>
      </div>
      <h2 style={{ margin: '0 0 20px' }}>마이페이지</h2>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <p><strong>이름:</strong> {user?.name}</p>
        <p><strong>아이디:</strong> {user?.username}</p>
        <p><strong>누적 포인트:</strong> {user?.points || 0}P</p>
      </div>
    </div>
  )
}
