# 04. 녹음 UI (RECORDING)

## 전체 녹음 플로우

```
[마이페이지]
    │
    │ "녹음 시작" 클릭
    ▼
[사전 준비 화면]
    ├── 마이크 권한 요청
    ├── 마이크 테스트 (간단한 레벨 미터)
    └── "시작하기" 클릭
    ▼
[세션 초기화 API 호출]
    └── GET /api/v1/sentences/random → 10문장 배열 수신
    ▼
[슬라이드 녹음 화면]  ← 핵심 화면
    ├── 문장 1/10 표시
    ├── 문장 텍스트 크게 표시
    ├── 녹음 버튼 (시작/정지)
    ├── 파형 시각화 (실시간)
    ├── 재청취 버튼 (녹음 후 활성화)
    ├── 재녹음 버튼 (같은 문장 다시)
    ├── 다음 버튼 (업로드 완료 후 활성화)
    └── 전체 진행 프로그레스바 (1~10)
    ▼
[완료 화면]
    ├── 포인트 적립 애니메이션
    ├── 누적 포인트 표시
    └── "계속 녹음" / "마이페이지로" 버튼
```

---

## 슬라이드 녹음 UI 상세

### 화면 레이아웃

```
┌─────────────────────────────────────────────┐
│  ● 1 ● 2 ○ 3 ○ 4 ○ 5 ○ 6 ○ 7 ○ 8 ○ 9 ○10  │ ← 스텝 인디케이터
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━             │ ← 프로그레스바 (20%)
│                                             │
│         문장 2 / 10                          │
│                                             │
│  "오늘 날씨가 참 맑고 따뜻하네요."           │ ← 발화 문장 (큰 글씨)
│                                             │
│    ▓▓▓▒▒▓▓▓▓▒▒▒▓▓▒▒▒▒▒▒▒▒▒▒▒▒▒           │ ← 파형 시각화
│                                             │
│          [ 🎙 녹음 중... 00:03 ]            │ ← 녹음 버튼 + 타이머
│                                             │
│    [◀ 다시듣기]              [다음 ▶]        │
└─────────────────────────────────────────────┘
```

### 버튼 상태 전이

```
상태: IDLE
  → 녹음 버튼: "🎙 녹음 시작" (활성)
  → 재청취 버튼: 비활성
  → 다음 버튼: 비활성

상태: RECORDING
  → 녹음 버튼: "⏹ 중지" (빨간색, 펄스 애니메이션)
  → 재청취 버튼: 비활성
  → 다음 버튼: 비활성

상태: RECORDED (녹음 완료, 업로드 전)
  → 녹음 버튼: "🔄 다시 녹음" (재녹음 허용)
  → 재청취 버튼: 활성
  → 다음 버튼: 비활성 (업로드 완료 후 활성화)

상태: UPLOADING
  → 모든 버튼: 비활성 (스피너 표시)

상태: DONE (업로드 완료)
  → 녹음 버튼: "🔄 다시 녹음" (재녹음 허용)
  → 재청취 버튼: 활성
  → 다음 버튼: 활성 ← 이때만 다음으로 이동 가능
```

---

## React 구현

### useRecorder 커스텀 훅

```javascript
// frontend/src/hooks/useRecorder.js
import { useState, useRef, useCallback } from 'react'

export const useRecorder = () => {
  const [status, setStatus] = useState('idle') // idle|recording|recorded|uploading|done
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0)  // 실시간 볼륨 (파형용)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      streamRef.current = stream

      // 실시간 볼륨 분석 (파형 시각화용)
      const audioCtx = new AudioContext()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      analyserRef.current = analyser

      const updateVolume = () => {
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setVolume(avg)
        if (status === 'recording') requestAnimationFrame(updateVolume)
      }
      requestAnimationFrame(updateVolume)

      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setStatus('recorded')
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      startTimeRef.current = Date.now()

      // 타이머
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      setStatus('recording')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('마이크 권한을 허용해 주세요.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }, [])

  const resetRecording = useCallback(() => {
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setVolume(0)
    setStatus('idle')
  }, [])

  return {
    status, audioBlob, audioUrl, duration, volume,
    startRecording, stopRecording, resetRecording,
    setStatus,
  }
}
```

### 슬라이드 녹음 페이지

```javascript
// frontend/src/pages/Record/RecordPage.jsx
import { useState, useEffect } from 'react'
import { useRecorder } from '@/hooks/useRecorder'
import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'

const POINTS_PER_SESSION = 10  // 세션 완료 시 지급 포인트

export default function RecordPage() {
  const [sentences, setSentences] = useState([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [sessionId, setSessionId] = useState(null)
  const [completedCount, setCompletedCount] = useState(0)
  const [phase, setPhase] = useState('prepare') // prepare|recording|complete

  const recorder = useRecorder()
  const { updatePoints } = useAuthStore()

  // 세션 초기화
  useEffect(() => {
    const initSession = async () => {
      const res = await api.get('/sentences/random')
      setSentences(res.data.data.sentences)
      setSessionId(res.data.data.session_id)
    }
    initSession()
  }, [])

  const currentSentence = sentences[currentIndex]
  const progress = ((currentIndex + (recorder.status === 'done' ? 1 : 0)) / 10) * 100

  // 녹음 업로드
  const handleUpload = async () => {
    if (!recorder.audioBlob) return
    recorder.setStatus('uploading')

    const formData = new FormData()
    formData.append('audio', recorder.audioBlob, 'recording.webm')
    formData.append('sentence_id', currentSentence.id)
    formData.append('session_id', sessionId)

    try {
      await api.post('/recordings/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      recorder.setStatus('done')
      setCompletedCount(prev => prev + 1)
    } catch (err) {
      alert('업로드 실패. 다시 시도해 주세요.')
      recorder.setStatus('recorded')
    }
  }

  // 다음 문장으로 이동
  const handleNext = async () => {
    if (currentIndex === 9) {
      // 세션 완료
      const res = await api.post('/recordings/complete-session', { session_id: sessionId })
      updatePoints(res.data.data.total_points)
      setPhase('complete')
    } else {
      setCurrentIndex(prev => prev + 1)
      recorder.resetRecording()
    }
  }

  if (phase === 'prepare') return <PreparePage onStart={() => setPhase('recording')} />
  if (phase === 'complete') return <CompletePage points={POINTS_PER_SESSION} />

  return (
    <div className="record-container">
      {/* 프로그레스바 */}
      <div className="progress-section">
        <StepIndicator total={10} current={currentIndex} done={recorder.status === 'done'} />
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* 문장 표시 */}
      <div className="sentence-card">
        <p className="sentence-count">{currentIndex + 1} / 10</p>
        <p className="sentence-text">{currentSentence?.text}</p>
      </div>

      {/* 파형 시각화 */}
      <WaveformVisualizer
        isRecording={recorder.status === 'recording'}
        volume={recorder.volume}
      />

      {/* 녹음 컨트롤 */}
      <RecordControls
        status={recorder.status}
        duration={recorder.duration}
        audioUrl={recorder.audioUrl}
        onStart={recorder.startRecording}
        onStop={async () => {
          recorder.stopRecording()
          // 녹음 중지 후 자동 업로드
          setTimeout(handleUpload, 300)
        }}
        onReset={recorder.resetRecording}
        onNext={handleNext}
      />
    </div>
  )
}
```

---

## 프로그레스바 컴포넌트

```javascript
// 스텝 인디케이터 (● ● ○ ○ ... 형태)
const StepIndicator = ({ total, current, done }) => (
  <div className="step-indicator">
    {Array.from({ length: total }, (_, i) => (
      <div
        key={i}
        className={`step-dot ${
          i < current ? 'completed' :
          i === current && done ? 'completed' :
          i === current ? 'active' : 'pending'
        }`}
      />
    ))}
  </div>
)
```

```css
/* 프로그레스바 스타일 */
.progress-bar {
  width: 100%;
  height: 6px;
  background: #e5e7eb;
  border-radius: 3px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #8b5cf6);
  transition: width 0.4s ease;
}
.step-dot {
  width: 12px; height: 12px;
  border-radius: 50%;
}
.step-dot.completed { background: #3b82f6; }
.step-dot.active    { background: #3b82f6; box-shadow: 0 0 0 3px #bfdbfe; }
.step-dot.pending   { background: #d1d5db; }
```

---

## 백엔드: 문장 랜덤 추출 API

```python
# backend/app/routers/sentences.py
@router.get("/random")
async def get_random_sentences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user_id = current_user.id

    # 이미 녹음한 문장 ID 목록
    recorded_ids = [
        r.sentence_id for r in
        db.query(Recording.sentence_id).filter(Recording.user_id == user_id).all()
    ]

    # 미녹음 문장 우선 랜덤 추출
    query = db.query(Sentence).filter(Sentence.is_active == True)
    if recorded_ids:
        query = query.filter(~Sentence.id.in_(recorded_ids))

    sentences = query.order_by(func.rand()).limit(10).all()

    # 미녹음 문장이 10개 미만이면 이미 녹음한 것도 포함
    if len(sentences) < 10:
        additional = (
            db.query(Sentence)
            .filter(Sentence.is_active == True)
            .filter(Sentence.id.in_(recorded_ids))
            .order_by(func.rand())
            .limit(10 - len(sentences))
            .all()
        )
        sentences.extend(additional)

    # 세션 생성
    session = RecordingSession(
        user_id=user_id,
        sentence_ids=[s.id for s in sentences]
    )
    db.add(session)
    db.commit()

    return {
        "success": True,
        "data": {
            "session_id": session.id,
            "sentences": [{"id": s.id, "text": s.text} for s in sentences]
        }
    }
```

---

## 포인트 지급 로직

```python
# backend/app/routers/recordings.py
@router.post("/complete-session")
async def complete_session(
    req: CompleteSessionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session = db.query(RecordingSession).filter(
        RecordingSession.id == req.session_id,
        RecordingSession.user_id == current_user.id,
        RecordingSession.is_completed == False
    ).first()

    if not session:
        raise HTTPException(400, "유효하지 않은 세션입니다")

    # 세션 내 실제 완료된 녹음 수 확인
    completed = db.query(Recording).filter(
        Recording.user_id == current_user.id,
        Recording.sentence_id.in_(session.sentence_ids)
    ).count()

    # 포인트 계산 (문장당 1포인트, 최대 10포인트)
    points = min(completed, 10)

    # 포인트 적립
    current_user.points += points
    session.is_completed = True
    session.completed_count = completed
    session.points_awarded = points
    session.completed_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "data": {
            "points_earned": points,
            "total_points": current_user.points,
            "completed_count": completed
        }
    }
```

---

## 마이크 권한 오류 처리

```javascript
// 마이크 권한 거부 시 안내 화면
const MicPermissionError = () => (
  <div className="permission-error">
    <h2>🎙 마이크 권한이 필요합니다</h2>
    <p>브라우저 주소창 옆의 🔒 아이콘을 클릭하여 마이크 권한을 허용해 주세요.</p>
    <img src="/images/mic-permission-guide.png" alt="권한 허용 방법" />
    <button onClick={() => window.location.reload()}>다시 시도</button>
  </div>
)
```

---

## 브라우저 호환성 주의사항

| 브라우저 | 상태 | 주의사항 |
|---------|------|---------|
| Chrome 70+ | ✅ 정상 | `audio/webm;codecs=opus` 지원 |
| Firefox | ✅ 정상 | `audio/ogg;codecs=opus` 로 폴백 |
| Safari 14.1+ | ⚠️ 주의 | `audio/mp4` 사용, 별도 처리 필요 |
| iOS Safari | ⚠️ 주의 | MediaRecorder 제한, polyfill 검토 |

```javascript
// MIME 타입 자동 감지
const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm',
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}
```
