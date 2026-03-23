import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import LoginPage from '@/pages/Auth/LoginPage'
import RegisterPage from '@/pages/Auth/RegisterPage'
import RecordPage from '@/pages/Record/RecordPage'
import MyPage from '@/pages/MyPage/MyPage'
import AdminLayout from '@/pages/Admin/AdminLayout'
import Dashboard from '@/pages/Admin/Dashboard'
import SentenceManager from '@/pages/Admin/SentenceManager'
import BulkImport from '@/pages/Admin/BulkImport'
import RecordingList from '@/pages/Admin/RecordingList'
import ReviewPage from '@/pages/Admin/ReviewPage'
import UserList from '@/pages/Admin/UserList'
import UserDetail from '@/pages/Admin/UserDetail'
import Settings from '@/pages/Admin/Settings'

// 로그인 필요 라우트
const PrivateRoute = ({ children }) => {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

// 어드민 전용 라우트
const AdminRoute = ({ children }) => {
  const { user, token } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (!user?.is_admin) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* 로그인 사용자 */}
        <Route path="/" element={<PrivateRoute><RecordPage /></PrivateRoute>} />
        <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />

        {/* 어드민 */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="sentences" element={<SentenceManager />} />
          <Route path="sentences/bulk-import" element={<BulkImport />} />
          <Route path="recordings" element={<RecordingList />} />
          <Route path="recordings/review" element={<ReviewPage />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="settings" element={<Settings />} />
        </Route>

        {/* 기타 → 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
