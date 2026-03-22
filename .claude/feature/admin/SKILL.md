# 06. 어드민 (ADMIN)

## 어드민 기능 목록

| 기능 | 우선순위 | 설명 |
|------|---------|------|
| 통계 대시보드 | ⭐ 1순위 | 전체 현황 한눈에 파악 |
| 문장 관리 CRUD | ⭐ 1순위 | 문장 추가/수정/비활성화 |
| 녹음 품질 검수 | ⭐ 1순위 | accept/reject + 파형 시각화 |
| 사용자 목록 | 2순위 | 화자 정보, 진행률 확인 |
| 데이터 내보내기 | 2순위 | CSV 메타데이터 + ZIP 다운로드 |

---

## 어드민 접근 제어

```python
# 모든 어드민 라우터에 require_admin dependency 적용
@router.get("/")
async def get_all_recordings(
    current_user: User = Depends(require_admin),  # ← 어드민만 접근 가능
    db: Session = Depends(get_db)
):
    ...

# React: 어드민 전용 라우트 가드
const AdminRoute = ({ children }) => {
  const { user } = useAuthStore()
  if (!user?.is_admin) return <Navigate to="/" />
  return children
}

// 라우팅
<Route path="/admin/*" element={
  <AdminRoute><AdminLayout /></AdminRoute>
} />
```

---

## 1. 통계 대시보드

### API
```
GET /api/v1/stats/dashboard
```

### 응답
```json
{
  "success": true,
  "data": {
    "total_users": 234,
    "total_recordings": 8921,
    "pending_review": 156,
    "accepted": 7890,
    "rejected": 875,
    "today_recordings": 43,
    "completion_rate": 89.1,
    "avg_duration": 3.4,
    "avg_snr": 24.5,
    "daily_trend": [
      { "date": "2025-01-01", "count": 120 },
      { "date": "2025-01-02", "count": 98 },
      ...
    ],
    "gender_dist": { "male": 45, "female": 52, "other": 3 },
    "age_dist": { "20s": 30, "30s": 42, "40s": 18, "50s": 8, "60s_above": 2 },
    "region_dist": { "서울특별시": 89, "경기도": 67, ... }
  }
}
```

### FastAPI 구현
```python
# backend/app/routers/stats.py
from sqlalchemy import func, case

@router.get("/dashboard")
async def get_dashboard(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    from datetime import date, timedelta

    # 기본 집계
    total_users = db.query(func.count(User.id)).filter(User.is_admin == False).scalar()
    total_recordings = db.query(func.count(Recording.id)).scalar()

    status_counts = dict(
        db.query(Recording.status, func.count(Recording.id))
        .group_by(Recording.status)
        .all()
    )

    # 오늘 녹음 수
    today = date.today()
    today_recordings = db.query(func.count(Recording.id)).filter(
        func.date(Recording.created_at) == today
    ).scalar()

    # 최근 7일 트렌드
    daily_trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        count = db.query(func.count(Recording.id)).filter(
            func.date(Recording.created_at) == d
        ).scalar()
        daily_trend.append({"date": str(d), "count": count})

    # 평균 품질 지표
    avg_metrics = db.query(
        func.avg(Recording.duration),
        func.avg(Recording.snr)
    ).filter(Recording.status != 'pending').first()

    # 성별 분포
    gender_dist = dict(
        db.query(User.gender, func.count(User.id))
        .filter(User.is_admin == False)
        .group_by(User.gender)
        .all()
    )

    return {
        "success": True,
        "data": {
            "total_users": total_users,
            "total_recordings": total_recordings,
            "pending_review": status_counts.get('analyzed', 0),
            "accepted": status_counts.get('accepted', 0),
            "rejected": status_counts.get('rejected', 0),
            "today_recordings": today_recordings,
            "avg_duration": round(avg_metrics[0] or 0, 2),
            "avg_snr": round(avg_metrics[1] or 0, 2),
            "daily_trend": daily_trend,
            "gender_dist": gender_dist,
        }
    }
```

### React 대시보드 UI 구성

```javascript
// frontend/src/pages/Admin/Dashboard.jsx
// 사용 라이브러리: recharts

import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const Dashboard = () => {
  const { data } = useDashboardStats()

  return (
    <div className="dashboard-grid">
      {/* KPI 카드 */}
      <KPICard title="전체 참여자" value={data.total_users} unit="명" />
      <KPICard title="전체 녹음" value={data.total_recordings} unit="건" />
      <KPICard title="검수 대기" value={data.pending_review} unit="건" color="orange" />
      <KPICard title="승인 완료" value={data.accepted} unit="건" color="green" />

      {/* 일별 녹음 추이 (꺾은선 그래프) */}
      <ChartCard title="최근 7일 녹음 현황">
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data.daily_trend}>
            <Line type="monotone" dataKey="count" stroke="#3b82f6" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 상태별 분포 (도넛 차트) */}
      <ChartCard title="녹음 상태 분포">
        <PieChart>
          <Pie data={statusData} dataKey="value" cx="50%" cy="50%" innerRadius={60}>
            {statusData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ChartCard>

      {/* 성별/연령대 분포 */}
      <ChartCard title="화자 성별 분포">
        <BarChart data={genderData}>
          <Bar dataKey="count" fill="#8b5cf6" />
          <XAxis dataKey="name" />
          <Tooltip />
        </BarChart>
      </ChartCard>
    </div>
  )
}
```

---

## 2. 문장 관리 CRUD

### API
```
GET    /api/v1/sentences?page=1&size=20&keyword=&is_active=
POST   /api/v1/sentences          → 문장 추가
PUT    /api/v1/sentences/{id}     → 문장 수정
DELETE /api/v1/sentences/{id}     → 문장 비활성화 (is_active=False, 물리 삭제 금지)
```

### FastAPI 구현
```python
@router.post("/", dependencies=[Depends(require_admin)])
async def create_sentence(req: SentenceCreate, db: Session = Depends(get_db)):
    sentence = Sentence(text=req.text, category=req.category, language=req.language or 'ko')
    db.add(sentence)
    db.commit()
    return {"success": True, "data": {"id": sentence.id, "text": sentence.text}}

@router.put("/{sentence_id}", dependencies=[Depends(require_admin)])
async def update_sentence(
    sentence_id: int, req: SentenceUpdate, db: Session = Depends(get_db)
):
    sentence = db.query(Sentence).filter(Sentence.id == sentence_id).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")
    if req.text: sentence.text = req.text
    if req.category is not None: sentence.category = req.category
    db.commit()
    return {"success": True, "data": {"id": sentence.id}}

@router.delete("/{sentence_id}", dependencies=[Depends(require_admin)])
async def deactivate_sentence(sentence_id: int, db: Session = Depends(get_db)):
    sentence = db.query(Sentence).filter(Sentence.id == sentence_id).first()
    if not sentence:
        raise HTTPException(404, "문장을 찾을 수 없습니다")
    sentence.is_active = False  # 물리 삭제 대신 비활성화
    db.commit()
    return {"success": True, "message": "문장이 비활성화되었습니다"}
```

### React 문장 관리 UI

```javascript
// 문장 목록 테이블 + CRUD 모달
const SentenceManager = () => {
  const [sentences, setSentences] = useState([])
  const [editTarget, setEditTarget] = useState(null)
  const [showModal, setShowModal] = useState(false)

  return (
    <div>
      <div className="toolbar">
        <input placeholder="문장 검색..." onChange={handleSearch} />
        <button onClick={() => { setEditTarget(null); setShowModal(true) }}>
          + 문장 추가
        </button>
        <button onClick={handleBulkImport}>CSV 일괄 등록</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th><th>문장</th><th>카테고리</th>
            <th>녹음 수</th><th>상태</th><th>관리</th>
          </tr>
        </thead>
        <tbody>
          {sentences.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.text}</td>
              <td>{s.category || '-'}</td>
              <td>{s.recording_count}</td>
              <td>
                <span className={s.is_active ? 'badge-active' : 'badge-inactive'}>
                  {s.is_active ? '활성' : '비활성'}
                </span>
              </td>
              <td>
                <button onClick={() => { setEditTarget(s); setShowModal(true) }}>수정</button>
                <button onClick={() => handleDeactivate(s.id)}>비활성화</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <SentenceModal
          sentence={editTarget}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
```

---

## 3. 녹음 품질 검수 (accept/reject)

### API
```
GET   /api/v1/recordings?status=analyzed&page=1&size=20
PATCH /api/v1/recordings/{id}/review
GET   /api/v1/recordings/{id}/file  → WAV 스트리밍
```

### 검수 업데이트
```python
@router.patch("/{recording_id}/review")
async def review_recording(
    recording_id: int,
    req: ReviewRequest,   # { action: 'accept'|'reject', note: str }
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    recording = db.query(Recording).filter(Recording.id == recording_id).first()
    if not recording:
        raise HTTPException(404, "녹음을 찾을 수 없습니다")

    recording.status = 'accepted' if req.action == 'accept' else 'rejected'
    recording.review_note = req.note
    recording.reviewed_by = current_user.id
    recording.reviewed_at = datetime.utcnow()
    db.commit()

    return {"success": True, "data": {"recording_id": recording_id, "status": recording.status}}
```

### React 검수 UI

```javascript
// frontend/src/pages/Admin/ReviewPage.jsx
const ReviewPage = () => {
  const [recordings, setRecordings] = useState([])
  const [selected, setSelected] = useState(null)
  const [note, setNote] = useState('')

  return (
    <div className="review-layout">
      {/* 좌: 검수 대기 목록 */}
      <div className="review-list">
        <div className="filter-bar">
          <select onChange={handleStatusFilter}>
            <option value="analyzed">검수 대기</option>
            <option value="accepted">승인 완료</option>
            <option value="rejected">반려</option>
          </select>
        </div>
        {recordings.map(r => (
          <div
            key={r.id}
            className={`review-item ${selected?.id === r.id ? 'active' : ''}`}
            onClick={() => setSelected(r)}
          >
            <span className="user-name">{r.user_name}</span>
            <span className="sentence-preview">{r.sentence_text.slice(0, 20)}...</span>
            <div className="metrics">
              <span>⏱ {r.duration?.toFixed(1)}초</span>
              <span>📊 SNR {r.snr?.toFixed(1)}dB</span>
              <span className={getQualityClass(r)}>●</span>
            </div>
          </div>
        ))}
      </div>

      {/* 우: 상세 검수 패널 */}
      {selected && (
        <div className="review-panel">
          <h3>검수 상세</h3>
          <div className="speaker-info">
            <p>발화자: {selected.user_name} ({selected.gender}, {selected.age_group})</p>
            <p>지역: {selected.region} / {selected.dialect}</p>
          </div>

          {/* 발화 문장 */}
          <div className="sentence-box">
            <p>{selected.sentence_text}</p>
          </div>

          {/* 오디오 플레이어 */}
          <AudioPlayer src={`/api/v1/recordings/${selected.id}/file`} />

          {/* 파형 시각화 (WaveSurfer.js) */}
          <WaveformPlayer recordingId={selected.id} />

          {/* 품질 지표 */}
          <div className="metrics-grid">
            <MetricCard label="Duration" value={`${selected.duration?.toFixed(2)}초`} />
            <MetricCard label="SNR" value={`${selected.snr?.toFixed(1)} dB`} />
            <MetricCard label="Energy" value={selected.energy?.toFixed(5)} />
          </div>

          {/* 검수 액션 */}
          <textarea
            placeholder="검수 메모 (선택사항)"
            value={note}
            onChange={e => setNote(e.target.value)}
          />
          <div className="review-actions">
            <button
              className="btn-accept"
              onClick={() => handleReview('accept')}
            >
              ✅ 승인 (Accept)
            </button>
            <button
              className="btn-reject"
              onClick={() => handleReview('reject')}
            >
              ❌ 반려 (Reject)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## 파형 시각화 (WaveSurfer.js)

```javascript
// frontend/src/components/WaveformPlayer.jsx
import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'

export const WaveformPlayer = ({ recordingId }) => {
  const containerRef = useRef(null)
  const wavesurferRef = useRef(null)

  useEffect(() => {
    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#3b82f6',
      progressColor: '#1d4ed8',
      height: 80,
      barWidth: 2,
      barGap: 1,
      responsive: true,
    })

    wavesurferRef.current.load(
      `/api/v1/recordings/${recordingId}/file`,
      null,
      'auto'
    )

    return () => wavesurferRef.current?.destroy()
  }, [recordingId])

  return (
    <div>
      <div ref={containerRef} />
      <div className="player-controls">
        <button onClick={() => wavesurferRef.current?.playPause()}>
          ▶ / ⏸
        </button>
      </div>
    </div>
  )
}
```

---

## 데이터 내보내기 (CSV + 메타데이터)

```python
# backend/app/routers/stats.py
import csv, io, zipfile
from fastapi.responses import StreamingResponse

@router.get("/export/metadata")
async def export_metadata(
    status: str = 'accepted',
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    AI Hub 등 납품용 메타데이터 CSV 생성
    """
    recordings = (
        db.query(Recording, User, Sentence)
        .join(User, Recording.user_id == User.id)
        .join(Sentence, Recording.sentence_id == Sentence.id)
        .filter(Recording.status == status)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        'file_path', 'sentence_id', 'text',
        'user_id', 'gender', 'age_group', 'region', 'dialect',
        'duration', 'snr', 'energy', 'status', 'created_at'
    ])

    for rec, user, sent in recordings:
        writer.writerow([
            rec.file_path, sent.id, sent.text,
            user.id, user.gender, user.age_group, user.region, user.dialect,
            rec.duration, rec.snr, rec.energy, rec.status,
            rec.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=metadata.csv'}
    )
```
