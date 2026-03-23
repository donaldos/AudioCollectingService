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
    username: '',
    password: '',
    passwordConfirm: '',
    name: '',
    email: '',
    gender: '',
    age_group: '',
    region: '',
    dialect: '',
    privacy_agreed: false,
  })
  const [errors, setErrors] = useState([])
  const [loading, setLoading] = useState(false)

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const validate = () => {
    const errs = []

    if (!form.username) {
      errs.push('아이디를 입력해 주세요.')
    } else if (form.username.length < 4 || form.username.length > 20) {
      errs.push('아이디는 4~20자여야 합니다.')
    } else if (!/^[a-zA-Z0-9]+$/.test(form.username)) {
      errs.push('아이디는 영문과 숫자만 사용 가능합니다.')
    }

    if (!form.password) {
      errs.push('비밀번호를 입력해 주세요.')
    } else if (form.password.length < 8) {
      errs.push('비밀번호는 8자 이상이어야 합니다.')
    }

    if (!form.passwordConfirm) {
      errs.push('비밀번호 확인을 입력해 주세요.')
    } else if (form.password !== form.passwordConfirm) {
      errs.push('비밀번호가 일치하지 않습니다.')
    }

    if (!form.name.trim()) errs.push('이름을 입력해 주세요.')
    if (!form.email.trim()) errs.push('이메일을 입력해 주세요.')
    if (!form.gender) errs.push('성별을 선택해 주세요.')
    if (!form.age_group) errs.push('연령대를 선택해 주세요.')
    if (!form.region.trim()) errs.push('거주 지역을 입력해 주세요.')
    if (!form.dialect) errs.push('방언을 선택해 주세요.')
    if (!form.privacy_agreed) errs.push('개인정보 수집 및 이용에 동의해 주세요.')

    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const errs = validate()
    if (errs.length > 0) {
      setErrors(errs)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setErrors([])
    setLoading(true)
    try {
      const { passwordConfirm, ...payload } = form
      await api.post('/auth/register', payload)
      alert('회원가입이 완료되었습니다. 로그인해 주세요.')
      navigate('/login')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        setErrors(detail.map((d) => d.msg || JSON.stringify(d)))
      } else if (typeof detail === 'string') {
        setErrors([detail])
      } else {
        setErrors(['회원가입에 실패했습니다. 다시 시도해 주세요.'])
      }
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setLoading(false)
    }
  }

  const inputCss = (touched) =>
    touched
      ? 'border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 12px; font-size: 14px; width: 100%; box-sizing: border-box; outline: none;'
      : 'border: 1px solid #d1d5db; border-radius: 8px; padding: 9px 12px; font-size: 14px; width: 100%; box-sizing: border-box; outline: none;'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '40px 16px' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: '36px 32px', width: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#111' }}>회원가입</h2>

        {errors.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ margin: '0 0 6px', fontWeight: 700, color: '#dc2626', fontSize: 13 }}>
              ⚠️ 아래 항목을 확인해 주세요.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {errors.map((msg, i) => (
                <li key={i} style={{ color: '#dc2626', fontSize: 13, lineHeight: 1.6 }}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Field label="아이디">
            <input
              style={fieldInput}
              value={form.username}
              onChange={(e) => update('username', e.target.value)}
              placeholder="4~20자 영문+숫자"
            />
          </Field>
          <Field label="비밀번호">
            <input
              style={fieldInput}
              type="password"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              placeholder="8자 이상"
            />
          </Field>
          <Field label="비밀번호 확인">
            <input
              style={fieldInput}
              type="password"
              value={form.passwordConfirm}
              onChange={(e) => update('passwordConfirm', e.target.value)}
              placeholder="비밀번호 재입력"
            />
          </Field>
          <Field label="이름">
            <input
              style={fieldInput}
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </Field>
          <Field label="이메일">
            <input
              style={fieldInput}
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
            />
          </Field>

          <hr style={{ margin: '12px 0', borderColor: '#e5e7eb' }} />
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#6b7280' }}>화자 정보</p>

          <Field label="성별">
            <select style={fieldSelect} value={form.gender} onChange={(e) => update('gender', e.target.value)}>
              <option value="">선택하세요</option>
              {GENDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="연령대">
            <select style={fieldSelect} value={form.age_group} onChange={(e) => update('age_group', e.target.value)}>
              <option value="">선택하세요</option>
              {AGE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="거주 지역">
            <input
              style={fieldInput}
              value={form.region}
              onChange={(e) => update('region', e.target.value)}
              placeholder="예: 서울특별시"
            />
          </Field>
          <Field label="방언">
            <select style={fieldSelect} value={form.dialect} onChange={(e) => update('dialect', e.target.value)}>
              <option value="">선택하세요</option>
              {DIALECT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', margin: '8px 0' }}>
            <input
              type="checkbox"
              checked={form.privacy_agreed}
              onChange={(e) => update('privacy_agreed', e.target.checked)}
            />
            <span>개인정보 수집 및 이용에 동의합니다 (음성 데이터 AI 학습 활용)</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ marginTop: 12, padding: '12px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#6b7280' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>로그인</Link>
        </p>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 4 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{label}</label>
      {children}
    </div>
  )
}

const fieldInput = {
  padding: '9px 12px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const fieldSelect = {
  ...fieldInput,
  background: '#fff',
}
