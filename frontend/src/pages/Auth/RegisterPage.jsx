import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '@/api'

const GENDER_OPTIONS = [
  { value: 'male', label: '남성' },
  { value: 'female', label: '여성' },
  { value: 'other', label: '기타' },
]
const AGE_OPTIONS = [
  { value: '10s', label: '10대' },
  { value: '20s', label: '20대' },
  { value: '30s', label: '30대' },
  { value: '40s', label: '40대' },
  { value: '50s', label: '50대' },
  { value: '60s_above', label: '60대 이상' },
]
const DIALECT_OPTIONS = [
  { value: 'standard', label: '표준어' },
  { value: 'gyeonggi', label: '경기도' },
  { value: 'chungcheong', label: '충청도' },
  { value: 'jeolla', label: '전라도' },
  { value: 'gyeongsang', label: '경상도' },
  { value: 'gangwon', label: '강원도' },
  { value: 'jeju', label: '제주도' },
  { value: 'other', label: '기타' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    username: '', password: '', passwordConfirm: '',
    name: '', email: '',
    gender: '', age_group: '', region: '', dialect: '',
    privacy_agreed: false,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.passwordConfirm) {
      return setError('비밀번호가 일치하지 않습니다.')
    }
    if (!form.privacy_agreed) {
      return setError('개인정보 수집에 동의해 주세요.')
    }

    setLoading(true)
    try {
      const { passwordConfirm, ...payload } = form
      await api.post('/auth/register', payload)
      alert('회원가입이 완료되었습니다. 로그인해 주세요.')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.detail || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>회원가입</h2>

        <form onSubmit={handleSubmit} style={styles.form}>
          <Row label="아이디">
            <input style={styles.input} value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="4~20자 영문+숫자" required />
          </Row>
          <Row label="비밀번호">
            <input style={styles.input} type="password" value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="8자 이상" required />
          </Row>
          <Row label="비밀번호 확인">
            <input style={styles.input} type="password" value={form.passwordConfirm}
              onChange={(e) => set('passwordConfirm', e.target.value)}
              placeholder="비밀번호 재입력" required />
          </Row>
          <Row label="이름">
            <input style={styles.input} value={form.name}
              onChange={(e) => set('name', e.target.value)} required />
          </Row>
          <Row label="이메일">
            <input style={styles.input} type="email" value={form.email}
              onChange={(e) => set('email', e.target.value)} required />
          </Row>

          <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
          <p style={styles.sectionLabel}>화자 정보</p>

          <Row label="성별">
            <Select options={GENDER_OPTIONS} value={form.gender}
              onChange={(v) => set('gender', v)} />
          </Row>
          <Row label="연령대">
            <Select options={AGE_OPTIONS} value={form.age_group}
              onChange={(v) => set('age_group', v)} />
          </Row>
          <Row label="거주 지역">
            <input style={styles.input} value={form.region}
              onChange={(e) => set('region', e.target.value)}
              placeholder="예: 서울특별시" required />
          </Row>
          <Row label="방언">
            <Select options={DIALECT_OPTIONS} value={form.dialect}
              onChange={(v) => set('dialect', v)} />
          </Row>

          <label style={styles.checkRow}>
            <input type="checkbox" checked={form.privacy_agreed}
              onChange={(e) => set('privacy_agreed', e.target.checked)} />
            <span>개인정보 수집 및 이용에 동의합니다 (음성 데이터 AI 학습 활용)</span>
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p style={styles.footer}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={styles.link}>로그인</Link>
        </p>
      </div>
    </div>
  )
}

const Row = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
    <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
    {children}
  </div>
)

const Select = ({ options, value, onChange }) => (
  <select style={{ ...styles.input, background: '#fff' }}
    value={value} onChange={(e) => onChange(e.target.value)} required>
    <option value="">선택하세요</option>
    {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
)

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f3f4f6',
    padding: '40px 16px',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    padding: '36px 32px',
    width: 420,
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  },
  title: { margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#111' },
  form: { display: 'flex', flexDirection: 'column', gap: 4 },
  sectionLabel: { margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#6b7280' },
  input: {
    padding: '9px 12px',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontSize: 14,
    outline: 'none',
  },
  checkRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', margin: '8px 0' },
  error: { color: '#ef4444', fontSize: 13, margin: '4px 0' },
  button: {
    marginTop: 12,
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
