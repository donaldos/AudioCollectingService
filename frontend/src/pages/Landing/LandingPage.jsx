import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function LandingPage() {
  const { token, user } = useAuthStore()
  const navigate = useNavigate()

  // 이미 로그인된 경우 자동 이동
  useEffect(() => {
    if (token && user) {
      navigate(user.is_admin ? '/admin/dashboard' : '/record', { replace: true })
    }
  }, [token, user, navigate])

  return (
    <div style={styles.container}>
      <div style={styles.hero}>
        <div style={styles.badge}>AI 한국어 음성 데이터 수집 플랫폼</div>
        <h1 style={styles.title}>VoiceCollect Service</h1>
        <p style={styles.subtitle}>
          여러분의 목소리로 AI를 학습시킵니다.<br />
          제시된 문장을 녹음하고 포인트를 적립하세요.
        </p>

        <div style={styles.buttonGroup}>
          <Link to="/register" style={{ ...styles.btn, ...styles.btnPrimary }}>
            회원가입
          </Link>
          <Link to="/login" style={{ ...styles.btn, ...styles.btnSecondary }}>
            로그인
          </Link>
          <Link to="/login" style={{ ...styles.btn, ...styles.btnOutline }}
            onClick={(e) => { e.preventDefault(); navigate('/login?admin=1') }}>
            어드민 로그인
          </Link>
        </div>
      </div>

      <div style={styles.featureGrid}>
        <FeatureCard
          icon="🎙"
          title="간편한 녹음"
          desc="브라우저에서 바로 녹음하세요. 별도 앱 설치 불필요."
        />
        <FeatureCard
          icon="💰"
          title="포인트 적립"
          desc="10문장 세션 완료 시 포인트가 자동 적립됩니다."
        />
        <FeatureCard
          icon="🔍"
          title="품질 분석"
          desc="AI가 녹음 품질을 자동 분석하여 검수합니다."
        />
      </div>

      <footer style={styles.footer}>
        <p style={{ margin: 0, color: '#9ca3af', fontSize: 13 }}>
          © 2025 VoiceCollect. AI 학습용 한국어 음성 데이터 수집 서비스.
        </p>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, desc }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardIcon}>{icon}</div>
      <h3 style={styles.cardTitle}>{title}</h3>
      <p style={styles.cardDesc}>{desc}</p>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '60px 24px 40px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  hero: {
    textAlign: 'center',
    maxWidth: 600,
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    borderRadius: 20,
    padding: '6px 16px',
    fontSize: 13,
    marginBottom: 20,
    letterSpacing: '0.03em',
  },
  title: {
    margin: '0 0 16px',
    fontSize: 48,
    fontWeight: 800,
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '0 0 40px',
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 1.7,
  },
  buttonGroup: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  btn: {
    display: 'inline-block',
    padding: '14px 32px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 16,
    textDecoration: 'none',
    transition: 'opacity 0.15s',
    cursor: 'pointer',
  },
  btnPrimary: {
    background: '#fff',
    color: '#2563eb',
  },
  btnSecondary: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  btnOutline: {
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    border: '1px solid rgba(255,255,255,0.3)',
    fontSize: 14,
  },
  featureGrid: {
    display: 'flex',
    gap: 20,
    marginTop: 60,
    flexWrap: 'wrap',
    justifyContent: 'center',
    maxWidth: 860,
  },
  card: {
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: '28px 24px',
    width: 240,
    textAlign: 'center',
    border: '1px solid rgba(255,255,255,0.15)',
  },
  cardIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  cardTitle: {
    margin: '0 0 8px',
    color: '#fff',
    fontSize: 17,
    fontWeight: 700,
  },
  cardDesc: {
    margin: 0,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    lineHeight: 1.6,
  },
  footer: {
    marginTop: 60,
    textAlign: 'center',
  },
}
