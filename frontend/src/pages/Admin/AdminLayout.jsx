import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: '📊 대시보드' },
  { to: '/admin/sentences', label: '📝 문장 관리' },
  { to: '/admin/recordings', label: '🎙 녹음 목록' },
  { to: '/admin/recordings/review', label: '🔍 검수' },
  { to: '/admin/users', label: '👥 사용자' },
  { to: '/admin/settings', label: '⚙️ 설정' },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      {/* 사이드바 */}
      <aside style={sideStyle}>
        <div style={{ padding: '20px 16px 12px' }}>
          <Link to="/admin/dashboard" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 16 }}>
            VoiceCollect Admin
          </Link>
        </div>
        <nav style={{ flex: 1 }}>
          {NAV_ITEMS.map(({ to, label }) => (
            <NavLink key={to} to={to} style={({ isActive }) => ({
              ...navItemStyle,
              background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            })}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 8px' }}>{user?.name}</p>
          <button onClick={handleLogout} style={logoutBtn}>로그아웃</button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main style={{ flex: 1, background: '#f3f4f6', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}

const sideStyle = {
  width: 220, background: '#1e293b', color: '#fff',
  display: 'flex', flexDirection: 'column', flexShrink: 0,
}
const navItemStyle = {
  display: 'block', padding: '11px 20px',
  color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
  fontSize: 14, transition: 'background 0.15s',
}
const logoutBtn = {
  width: '100%', padding: '8px', borderRadius: 6,
  border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
  color: '#fff', cursor: 'pointer', fontSize: 13,
}
