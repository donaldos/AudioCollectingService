import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.post('/auth/login', form)
      const { access_token, user } = res.data.data
      login(user, access_token)
      navigate(user.is_admin ? '/admin/dashboard' : '/record')
    } catch (err) {
      setError(err.response?.data?.detail || '로그인에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>VoiceCollect</h1>
        <p style={styles.subtitle}>AI 학습용 한국어 음성 데이터 수집</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>아이디</label>
          <input
            style={styles.input}
            type="text"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="아이디 입력"
            required
          />

          <label style={styles.label}>비밀번호</label>
          <input
            style={styles.input}
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder="비밀번호 입력"
            required
          />

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={styles.footer}>
          계정이 없으신가요?{' '}
          <Link to="/register" style={styles.link}>회원가입</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '40px 36px',
    width: 360,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#111' },
  subtitle: { margin: '6px 0 28px', color: '#6b7280', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 8 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
    marginBottom: 8,
  },
  error: { color: '#ef4444', fontSize: 13, margin: '4px 0' },
  button: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#3b82f6',
    color: '#fff',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' },
  link: { color: '#3b82f6', textDecoration: 'none', fontWeight: 600 },
}
