import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRecorder } from '@/hooks/useRecorder'
import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'
import StepIndicator from '@/components/Record/StepIndicator'
import WaveformVisualizer from '@/components/Record/WaveformVisualizer'

function PreparePage({ onStart }) {
  return (
    <div style={layoutStyle}>
      <div style={cardStyle}>
        <h2 style={{ margin: '0 0 12px', fontSize: 22 }}>녹음 준비</h2>
        <p style={{ color: '#6b7280', margin: '0 0 20px', lineHeight: 1.6 }}>
          10개의 문장을 자연스럽게 읽어 주세요.
          <br />
          조용한 환경에서 마이크를 사용해 주세요.
        </p>
        <ul style={{ color: '#374151', margin: '0 0 28px', lineHeight: 2, paddingLeft: 20 }}>
          <li>문장을 보고 자연스럽게 읽어 주세요</li>
          <li>잘못 읽었다면 재녹음 할 수 있습니다</li>
          <li>10문장 완료 시 포인트가 적립됩니다</li>
        </ul>
        <button style={primaryBtn} onClick={onStart}>
          시작하기
        </button>
      </div>
    </div>
  )
}

function CompletePage({ pointsEarned, totalPoints, onContinue }) {
  return (
    <div style={layoutStyle}>
      <div style={{ ...cardStyle, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>세션 완료!</h2>
        <p style={{ color: '#6b7280', margin: '0 0 16px' }}>
          <strong style={{ color: '#22c55e', fontSize: 18 }}>+{pointsEarned}P</strong> 적립되었습니다
        </p>
        <p style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', margin: '0 0 28px' }}>
          누적 포인트: {totalPoints}P
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button style={primaryBtn} onClick={onContinue}>
            계속 녹음하기
          </button>
          <Link
            to="/mypage"
            style={{ ...secondaryBtn, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
          >
            마이페이지
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RecordPage() {
  const [sentences, setSentences] = useState([])
  const [sessionId, setSessionId] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [phase, setPhase] = useState('prepare') // prepare | recording | complete
  const [sessionResult, setSessionResult] = useState(null)
  const [loadError, setLoadError] = useState(false)

  const recorder = useRecorder()
  const { user, updatePoints } = useAuthStore()

  const loadSession = async () => {
    try {
      setLoadError(false)
      const res = await api.get('/sentences/random')
      setSentences(res.data.data.sentences)
      setSessionId(res.data.data.session_id)
    } catch {
      setLoadError(true)
    }
  }

  const handleStart = async () => {
    await loadSession()
    setCurrentIndex(0)
    recorder.resetRecording()
    setPhase('recording')
  }

  // 녹음 완료 시 자동 업로드
  useEffect(() => {
    if (
      recorder.status === 'recorded' &&
      recorder.audioBlob &&
      sessionId &&
      sentences[currentIndex]
    ) {
      handleUpload(recorder.audioBlob)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.status])

  const handleUpload = async (blob) => {
    if (!blob) return
    recorder.setStatus('uploading')

    const formData = new FormData()
    formData.append('audio', blob, 'recording.webm')
    formData.append('sentence_id', String(sentences[currentIndex].id))
    formData.append('session_id', String(sessionId))

    try {
      await api.post('/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      recorder.setStatus('done')
    } catch {
      alert('업로드 실패. 다시 시도해 주세요.')
      recorder.setStatus('recorded')
    }
  }

  const handleNext = async () => {
    if (currentIndex >= 9) {
      try {
        const res = await api.post('/recordings/complete-session', { session_id: sessionId })
        const { points_earned, total_points } = res.data.data
        updatePoints(total_points)
        setSessionResult({ pointsEarned: points_earned, totalPoints: total_points })
        setPhase('complete')
      } catch {
        alert('세션 완료 처리에 실패했습니다.')
      }
    } else {
      setCurrentIndex((i) => i + 1)
      recorder.resetRecording()
    }
  }

  const handleContinue = () => {
    setSentences([])
    setSessionId(null)
    setSessionResult(null)
    recorder.resetRecording()
    setPhase('prepare')
  }

  if (phase === 'prepare') return <PreparePage onStart={handleStart} />
  if (phase === 'complete') return (
    <CompletePage
      pointsEarned={sessionResult?.pointsEarned || 0}
      totalPoints={sessionResult?.totalPoints || user?.points || 0}
      onContinue={handleContinue}
    />
  )

  if (loadError) {
    return (
      <div style={layoutStyle}>
        <div style={cardStyle}>
          <p style={{ color: '#ef4444', margin: '0 0 16px' }}>문장을 불러오지 못했습니다.</p>
          <button style={primaryBtn} onClick={loadSession}>
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  const currentSentence = sentences[currentIndex]
  const progress = ((currentIndex + (recorder.status === 'done' ? 1 : 0)) / 10) * 100
  const isUploading = recorder.status === 'uploading'

  return (
    <div style={layoutStyle}>
      {/* 헤더 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>VoiceCollect</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            {user?.name}님 ({user?.points || 0}P)
          </span>
          <Link to="/mypage" style={{ color: '#3b82f6', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
            마이페이지
          </Link>
        </div>
      </div>

      {/* 스텝 인디케이터 */}
      <StepIndicator total={10} current={currentIndex} done={recorder.status === 'done'} />

      {/* 프로그레스바 */}
      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden', marginBottom: 24 }}>
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
            transition: 'width 0.4s ease',
          }}
        />
      </div>

      {/* 문장 카드 */}
      <div style={{ ...cardStyle, marginBottom: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#6b7280' }}>
          {currentIndex + 1} / 10
        </p>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 600, lineHeight: 1.6, color: '#111' }}>
          {currentSentence?.text || '문장 로딩 중...'}
        </p>
      </div>

      {/* 파형 시각화 */}
      <WaveformVisualizer isRecording={recorder.status === 'recording'} volume={recorder.volume} />

      {/* 타이머 (녹음 중) */}
      <div style={{ height: 24, textAlign: 'center', marginBottom: 8 }}>
        {recorder.status === 'recording' && (
          <span style={{ color: '#ef4444', fontWeight: 600, fontSize: 15 }}>
            {String(Math.floor(recorder.duration / 60)).padStart(2, '0')}:
            {String(recorder.duration % 60).padStart(2, '0')}
          </span>
        )}
        {isUploading && (
          <span style={{ color: '#6b7280', fontSize: 14 }}>업로드 중...</span>
        )}
      </div>

      {/* 재청취 오디오 */}
      {(recorder.status === 'recorded' || recorder.status === 'done') && recorder.audioUrl && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <audio controls src={recorder.audioUrl} style={{ height: 36, maxWidth: '100%' }} />
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* 녹음 시작 */}
        {recorder.status === 'idle' && (
          <button style={{ ...primaryBtn, background: '#22c55e' }} onClick={recorder.startRecording}>
            녹음 시작
          </button>
        )}

        {/* 녹음 중지 */}
        {recorder.status === 'recording' && (
          <button style={{ ...primaryBtn, background: '#ef4444' }} onClick={recorder.stopRecording}>
            녹음 중지
          </button>
        )}

        {/* 다시 녹음 */}
        {(recorder.status === 'recorded' || recorder.status === 'uploading' || recorder.status === 'done') && (
          <button style={secondaryBtn} onClick={recorder.resetRecording} disabled={isUploading}>
            다시 녹음
          </button>
        )}

        {/* 다음 문장 / 완료 */}
        {recorder.status === 'done' && (
          <button style={primaryBtn} onClick={handleNext}>
            {currentIndex >= 9 ? '완료' : '다음 문장'}
          </button>
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
  padding: 24,
  boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
}

const primaryBtn = {
  padding: '11px 24px',
  borderRadius: 8,
  border: 'none',
  background: '#3b82f6',
  color: '#fff',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
}

const secondaryBtn = {
  padding: '11px 24px',
  borderRadius: 8,
  border: '1px solid #d1d5db',
  background: '#fff',
  color: '#374151',
  fontWeight: 600,
  fontSize: 15,
  cursor: 'pointer',
}
