# 08. 어드민 페이지 설계 (ADMIN PAGE DESIGN)

## 어드민 전체 페이지 구조 (사이트맵)

```
/admin
├── /dashboard          ← 통계 대시보드 (홈)
├── /sentences          ← 문장 관리
│   ├── /               ← 문장 목록 + CRUD
│   └── /bulk-import    ← CSV 일괄 등록
├── /recordings         ← 녹음 데이터 관리
│   ├── /               ← 전체 목록 + 필터
│   └── /review         ← 품질 검수 (핵심)
├── /users              ← 사용자 관리
│   ├── /               ← 사용자 목록
│   └── /:id            ← 사용자 상세
└── /settings           ← 시스템 설정
    ├── /points         ← 포인트 정책
    └── /export         ← 데이터 내보내기
```

---

## 레이아웃 구조

```
┌─────────────────────────────────────────────────────────────────┐
│ HEADER  [VoiceCollect Admin]          [관리자명 ▼] [로그아웃]   │
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                       │
│ SIDEBAR  │              MAIN CONTENT                            │
│          │                                                       │
│ 📊 대시보드│                                                      │
│ 📝 문장관리│                                                      │
│ 🎙 녹음관리│                                                      │
│ 👥 사용자  │                                                      │
│ ⚙️ 설정   │                                                      │
│          │                                                       │
└──────────┴──────────────────────────────────────────────────────┘
```

### React 레이아웃 컴포넌트

```javascript
// frontend/src/pages/Admin/AdminLayout.jsx
import { NavLink, Outlet } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/admin/dashboard',   icon: '📊', label: '대시보드' },
  { to: '/admin/sentences',   icon: '📝', label: '문장 관리' },
  { to: '/admin/recordings',  icon: '🎙', label: '녹음 관리' },
  { to: '/admin/users',       icon: '👥', label: '사용자 관리' },
  { to: '/admin/settings',    icon: '⚙️', label: '설정' },
]

export default function AdminLayout() {
  return (
    <div className="admin-layout">
      <header className="admin-header">
        <span className="logo">🎙 VoiceCollect Admin</span>
        <AdminUserMenu />
      </header>
      <div className="admin-body">
        <nav className="admin-sidebar">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) =>
              `nav-item ${isActive ? 'active' : ''}`
            }>
              <span className="icon">{item.icon}</span>
              <span className="label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
```

---

## PAGE 1: 통계 대시보드 `/admin/dashboard`

### 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 대시보드                          오늘: 2025-01-15 (수)       │
├──────────┬──────────┬──────────┬──────────────────────────────── │
│ 전체참여자 │ 전체녹음  │ 검수대기  │  오늘 녹음                      │
│  234 명  │ 8,921 건 │  156 건  │   43 건                         │
│  👤      │  🎙      │  ⚠️      │  📈 +12%                        │
├──────────┴──────────┴──────────┴────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────┐  ┌─────────────────────────┐  │
│  │  최근 14일 녹음 추이          │  │  녹음 상태 분포          │  │
│  │  (꺾은선 그래프)              │  │  (도넛 차트)             │  │
│  │                              │  │  ✅ 승인 88%            │  │
│  │  ▁▂▄▃▅▆▅▄▆▇██▇▆             │  │  ⏳ 대기  7%            │  │
│  └──────────────────────────────┘  │  ❌ 반려  5%            │  │
│                                    └─────────────────────────┘  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  성별 분포        │  │  연령대 분포      │  │  평균 품질     │  │
│  │  남 48% 여 49%   │  │  30대 42%        │  │  SNR: 24.5dB  │  │
│  │  기타 3%         │  │  20대 30% ...    │  │  Dur: 3.4초   │  │
│  └──────────────────┘  └──────────────────┘  └───────────────┘  │
│                                                                  │
│  📋 최근 녹음 10건 (실시간 피드)                                   │
│  ─────────────────────────────────────────────────────────────  │
│  방금 전  홍길동  "오늘 날씨가 참 맑고..."  3.2초  SNR 28dB  ⏳   │
│  2분 전   김영희  "저는 매일 아침 커피..."  2.9초  SNR 31dB  ⏳   │
└─────────────────────────────────────────────────────────────────┘
```

### KPI 카드 컴포넌트
```javascript
// frontend/src/components/Admin/KPICard.jsx
const KPICard = ({ title, value, unit, icon, trend, color = 'blue' }) => (
  <div className={`kpi-card kpi-card--${color}`}>
    <div className="kpi-icon">{icon}</div>
    <div className="kpi-content">
      <p className="kpi-title">{title}</p>
      <p className="kpi-value">
        {value.toLocaleString()} <span className="kpi-unit">{unit}</span>
      </p>
      {trend && <p className={`kpi-trend ${trend > 0 ? 'up' : 'down'}`}>
        {trend > 0 ? '▲' : '▼'} {Math.abs(trend)}% 전일 대비
      </p>}
    </div>
  </div>
)
```

### 실시간 피드 (5초 폴링)
```javascript
// 실시간 최근 녹음 피드
const RecentFeed = () => {
  const [recordings, setRecordings] = useState([])

  useEffect(() => {
    const fetch = () => api.get('/recordings?limit=10&sort=desc').then(r =>
      setRecordings(r.data.data.items)
    )
    fetch()
    const timer = setInterval(fetch, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="recent-feed">
      <h3>최근 녹음 현황</h3>
      {recordings.map(r => (
        <div key={r.id} className="feed-item">
          <span className="feed-time">{timeAgo(r.created_at)}</span>
          <span className="feed-user">{r.user_name}</span>
          <span className="feed-sentence">"{r.sentence_text.slice(0, 20)}..."</span>
          <span className="feed-duration">{r.duration?.toFixed(1)}초</span>
          <span className={`feed-status status--${r.status}`}>
            {STATUS_LABELS[r.status]}
          </span>
          <button onClick={() => navigate(`/admin/recordings/review?id=${r.id}`)}>
            검수
          </button>
        </div>
      ))}
    </div>
  )
}
```

---

## PAGE 2: 문장 관리 `/admin/sentences`

### 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│ 📝 문장 관리                                                      │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 문장 검색...........] [카테고리 ▼] [상태 ▼]  [+ 문장추가] [📥 CSV 가져오기] │
├────┬──────────────────────────────┬──────┬───────┬──────┬──────┤
│ ID │ 문장 텍스트                   │카테고리│녹음수 │ 상태 │ 관리 │
├────┼──────────────────────────────┼──────┼───────┼──────┼──────┤
│  1 │ 오늘 날씨가 참 맑고 따뜻하네요.│ 일상  │  189  │ 활성 │수정 비활│
│  2 │ 저는 매일 아침 커피 한 잔으로  │ 일상  │  201  │ 활성 │수정 비활│
│  3 │ 이번 주말에 가족과 함께...     │ 일상  │   45  │ 활성 │수정 비활│
├────┴──────────────────────────────┴──────┴───────┴──────┴──────┤
│  총 100개 문장  |  활성 97개  |  비활성 3개    [< 1 2 3 4 5 >]  │
└─────────────────────────────────────────────────────────────────┘
```

### 문장 추가/수정 모달

```
┌──────────────────────────────────────────────────────┐
│ 문장 추가                                         [✕] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  발화 문장 *                                          │
│  ┌────────────────────────────────────────────────┐  │
│  │ 오늘 날씨가 참 맑고 따뜻하네요.                   │  │
│  └────────────────────────────────────────────────┘  │
│  ※ 발음하기 자연스러운 1~3개 문장 권장                 │
│                                                      │
│  카테고리 (선택)          언어                        │
│  [일상대화         ▼]    [한국어 (ko)   ▼]           │
│                                                      │
│  [취소]                              [저장]          │
└──────────────────────────────────────────────────────┘
```

### CSV 일괄 등록 페이지 `/admin/sentences/bulk-import`

```
┌─────────────────────────────────────────────────────────────────┐
│ 📥 문장 일괄 등록 (CSV)                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CSV 파일 형식                                                    │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ text,category,language                                      │  │
│  │ "오늘 날씨가 참 맑고 따뜻하네요.",일상,ko                    │  │
│  │ "저는 매일 아침 커피 한 잔으로 시작합니다.",일상,ko           │  │
│  └────────────────────────────────────────────────────────────┘  │
│  [📄 템플릿 다운로드]                                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │           📂 CSV 파일을 여기에 드래그하거나               │    │
│  │               클릭하여 선택하세요                         │    │
│  │                                                          │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [미리보기 - 파일 선택 후 표시]                                    │
│  ─────────────────────────────────────────────────────────────  │
│  ✅ 유효: 95개   ⚠️ 중복: 3개   ❌ 오류: 2개                     │
│                                        [취소] [📥 등록하기]      │
└─────────────────────────────────────────────────────────────────┘
```

### FastAPI 일괄 등록 API
```python
# backend/app/routers/sentences.py
import csv, io
from fastapi import UploadFile

@router.post("/bulk-import", dependencies=[Depends(require_admin)])
async def bulk_import_sentences(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    content = await file.read()
    reader = csv.DictReader(io.StringIO(content.decode('utf-8-sig')))

    results = {"success": 0, "duplicate": 0, "error": 0, "errors": []}

    for i, row in enumerate(reader, start=2):
        try:
            text = row.get('text', '').strip()
            if not text:
                results["error"] += 1
                results["errors"].append(f"행 {i}: 문장이 비어있습니다")
                continue

            # 중복 확인
            if db.query(Sentence).filter(Sentence.text == text).first():
                results["duplicate"] += 1
                continue

            db.add(Sentence(
                text=text,
                category=row.get('category', '').strip() or None,
                language=row.get('language', 'ko').strip()
            ))
            results["success"] += 1
        except Exception as e:
            results["error"] += 1
            results["errors"].append(f"행 {i}: {str(e)}")

    db.commit()
    return {"success": True, "data": results}
```

---

## PAGE 3: 녹음 전체 목록 `/admin/recordings`

### 화면 구성

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎙 녹음 데이터 관리                                               │
├─────────────────────────────────────────────────────────────────┤
│ [상태: 검수대기 ▼] [성별: 전체 ▼] [연령: 전체 ▼] [기간: 전체 ▼]    │
│ [🔍 사용자/문장 검색.....] [SNR ≥ __ dB] [Duration ≥ __ 초]     │
│                                              [📊 CSV 내보내기]  │
├──────┬────────┬──────────────────┬──────┬──────┬──────┬───────┤
│  ID  │발화자  │ 문장 텍스트       │ 시간 │ SNR  │ 상태 │  액션  │
├──────┼────────┼──────────────────┼──────┼──────┼──────┼───────┤
│ 4521 │홍길동  │오늘 날씨가...     │ 3.2초│28.1dB│ ⏳대기│[검수]  │
│ 4520 │김영희  │저는 매일 아침...  │ 2.9초│31.4dB│ ⏳대기│[검수]  │
│ 4519 │이철수  │이번 주말에...     │ 4.1초│ 8.2dB│ ⏳대기│[검수]  │  ← SNR 낮음 경고
│ 4518 │박민수  │저의 취미는...     │ 1.2초│25.3dB│✅승인│[보기]  │
├──────┴────────┴──────────────────┴──────┴──────┴──────┴───────┤
│  총 8,921건  검수대기: 156건                [< 1 2 3 ... 89 >]  │
└─────────────────────────────────────────────────────────────────┘
```

### SNR 색상 경고 처리
```javascript
const getSNRColor = (snr) => {
  if (snr === null) return 'gray'
  if (snr >= 20) return 'green'
  if (snr >= 10) return 'orange'
  return 'red'
}

// 테이블 셀
<td style={{ color: getSNRColor(r.snr), fontWeight: r.snr < 10 ? 'bold' : 'normal' }}>
  {r.snr?.toFixed(1) ?? '-'} dB
</td>
```

### FastAPI 목록 API (필터 + 페이지네이션)
```python
@router.get("/")
async def list_recordings(
    status: Optional[str] = None,
    gender: Optional[str] = None,
    age_group: Optional[str] = None,
    min_snr: Optional[float] = None,
    min_duration: Optional[float] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    query = (
        db.query(Recording, User, Sentence)
        .join(User, Recording.user_id == User.id)
        .join(Sentence, Recording.sentence_id == Sentence.id)
    )

    if status:      query = query.filter(Recording.status == status)
    if gender:      query = query.filter(User.gender == gender)
    if age_group:   query = query.filter(User.age_group == age_group)
    if min_snr:     query = query.filter(Recording.snr >= min_snr)
    if min_duration:query = query.filter(Recording.duration >= min_duration)
    if keyword:
        query = query.filter(
            User.name.contains(keyword) | Sentence.text.contains(keyword)
        )

    total = query.count()
    items = query.order_by(Recording.created_at.desc()) \
                 .offset((page-1)*size).limit(size).all()

    return {
        "success": True,
        "data": {
            "total": total,
            "page": page,
            "size": size,
            "items": [format_recording(r, u, s) for r, u, s in items]
        }
    }
```

---

## PAGE 4: 녹음 품질 검수 `/admin/recordings/review`

### 화면 구성 (상세 설계)

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 품질 검수          검수대기: 156건          [← 목록으로]        │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  검수 대기 목록   │  상세 검수 패널                               │
│  ─────────────  │  ──────────────────────────────────────────  │
│ ▶ #4521 홍길동  │  녹음 #4521                    2025-01-15    │
│   "오늘 날씨가.."│                                              │
│   3.2초 | 28dB  │  👤 발화자 정보                               │
│                 │  ┌──────────────────────────────────────┐    │
│   #4520 김영희  │  │ 이름: 홍길동 (남성, 30대)              │    │
│   "저는 매일..."│  │ 지역: 서울특별시 | 방언: 표준어         │    │
│   2.9초 | 31dB  │  └──────────────────────────────────────┘    │
│                 │                                              │
│   #4519 이철수  │  📝 발화 문장                                  │
│   "이번 주말에" │  ┌──────────────────────────────────────┐    │
│   4.1초 | 8dB⚠│  │ "오늘 날씨가 참 맑고 따뜻하네요."      │    │
│                 │  └──────────────────────────────────────┘    │
│  [이전][다음]   │                                              │
│                 │  🔊 파형 시각화                               │
│                 │  ┌──────────────────────────────────────┐    │
│                 │  │▁▂▃▄▅▆▇█▇▆▅▄▃▂▃▄▅▆▇▆▅▄▃▂▁▁▁▁▁▁▁▁▁▁│    │
│                 │  └──────────────────────────────────────┘    │
│                 │  [▶ 재생]  [⏮ 처음]  ──●────────  00:02.1   │
│                 │                                              │
│                 │  📊 품질 지표                                  │
│                 │  ┌──────────┬──────────┬────────────────┐    │
│                 │  │ Duration │   SNR    │     Energy     │    │
│                 │  │  3.2 초  │ 28.1 dB  │   0.04231      │    │
│                 │  │  ✅ 양호 │  ✅ 양호 │    ✅ 양호      │    │
│                 │  └──────────┴──────────┴────────────────┘    │
│                 │                                              │
│                 │  💬 검수 메모 (선택)                           │
│                 │  ┌──────────────────────────────────────┐    │
│                 │  │ (예: 끝 부분 잡음 있음, 발음 불명확 등) │   │
│                 │  └──────────────────────────────────────┘    │
│                 │                                              │
│                 │  ┌─────────────────┐  ┌─────────────────┐   │
│                 │  │  ✅ 승인 (Accept)│  │  ❌ 반려 (Reject)│   │
│                 │  └─────────────────┘  └─────────────────┘   │
│                 │                        [다음 건으로 자동이동 ☑] │
└──────────────────┴──────────────────────────────────────────────┘
```

### 키보드 단축키 지원
```javascript
// 검수 효율을 높이기 위한 키보드 단축키
useEffect(() => {
  const handleKey = (e) => {
    if (e.target.tagName === 'TEXTAREA') return  // 메모 입력 중 무시
    switch(e.key) {
      case 'a': case 'A': handleReview('accept'); break  // A키: 승인
      case 'r': case 'R': handleReview('reject'); break  // R키: 반려
      case ' ':            wavesurfer.playPause(); break  // Space: 재생/정지
      case 'ArrowRight':   handleNext(); break             // →: 다음
      case 'ArrowLeft':    handlePrev(); break             // ←: 이전
    }
  }
  window.addEventListener('keydown', handleKey)
  return () => window.removeEventListener('keydown', handleKey)
}, [selected])
```

---

## PAGE 5: 사용자 관리 `/admin/users`

### 사용자 목록 화면

```
┌─────────────────────────────────────────────────────────────────┐
│ 👥 사용자 관리                                                    │
├─────────────────────────────────────────────────────────────────┤
│ [🔍 이름/아이디 검색....] [성별 ▼] [연령대 ▼] [방언 ▼]           │
├────┬────────┬────────────┬──────┬──────┬───────┬──────┬───────┤
│ ID │아이디  │ 이름        │ 성별 │연령대│ 진행률│포인트│ 관리  │
├────┼────────┼────────────┼──────┼──────┼───────┼──────┼───────┤
│  1 │john123 │ 홍길동      │ 남   │ 30대 │72/100 │  72pt│[상세] │
│  2 │jane456 │ 김영희      │ 여   │ 20대 │45/100 │  45pt│[상세] │
│  3 │park789 │ 박민수      │ 남   │ 40대 │100/100│ 100pt│[상세] │
├────┴────────┴────────────┴──────┴──────┴───────┴──────┴───────┤
│  총 234명                                   [< 1 2 3 ... 12 >] │
└─────────────────────────────────────────────────────────────────┘
```

### 사용자 상세 페이지 `/admin/users/:id`

```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 사용자 상세 - 홍길동 (ID: 1)                    [← 목록으로]  │
├────────────────────────┬────────────────────────────────────────┤
│  기본 정보              │  활동 통계                              │
│  ──────────────────    │  ────────────────────────────────────  │
│  아이디: john123       │  총 녹음:   72건                        │
│  이름:   홍길동        │  승인:      68건  (94.4%)               │
│  이메일: john@...      │  반려:       3건  ( 4.2%)               │
│  성별:   남성          │  검수대기:   1건  ( 1.4%)               │
│  연령대: 30대          │  누적 포인트: 72pt                       │
│  지역:   서울특별시    │  가입일: 2025-01-01                      │
│  방언:   표준어        │  마지막 활동: 2025-01-15                 │
│                        │                                        │
│  포인트 수동 조정       │  진행률                                 │
│  현재: 72pt            │  ████████████████████░░░░░░  72/100   │
│  [+ 추가] [- 차감]     │                                        │
├────────────────────────┴────────────────────────────────────────┤
│  해당 사용자 녹음 목록                                            │
│  ──────────────────────────────────────────────────────────     │
│  [상태 필터 ▼]                                                   │
├──────┬──────────────────────────────┬──────┬──────┬────────────┤
│  ID  │ 문장 텍스트                   │  시간 │ SNR  │   상태     │
├──────┼──────────────────────────────┼──────┼──────┼────────────┤
│ 4521 │ 오늘 날씨가 참 맑고...        │ 3.2초│28dB  │  ⏳ 대기   │
│ 4501 │ 저는 매일 아침 커피...        │ 2.9초│31dB  │  ✅ 승인   │
└──────┴──────────────────────────────┴──────┴──────┴────────────┘
```

### FastAPI 사용자 상세 API
```python
@router.get("/{user_id}")
async def get_user_detail(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id, User.is_admin == False).first()
    if not user:
        raise HTTPException(404, "사용자를 찾을 수 없습니다")

    # 통계 집계
    stats = dict(
        db.query(Recording.status, func.count(Recording.id))
        .filter(Recording.user_id == user_id)
        .group_by(Recording.status)
        .all()
    )
    total = sum(stats.values())

    # 녹음 목록
    recordings = (
        db.query(Recording, Sentence)
        .join(Sentence, Recording.sentence_id == Sentence.id)
        .filter(Recording.user_id == user_id)
        .order_by(Recording.created_at.desc())
        .all()
    )

    return {
        "success": True,
        "data": {
            "user": user_to_dict(user),
            "stats": {
                "total": total,
                "accepted": stats.get('accepted', 0),
                "rejected": stats.get('rejected', 0),
                "pending": stats.get('analyzed', 0) + stats.get('pending', 0),
                "progress": f"{total}/100"
            },
            "recordings": [format_recording_simple(r, s) for r, s in recordings]
        }
    }

@router.patch("/{user_id}/points")
async def adjust_points(
    user_id: int,
    req: PointAdjustRequest,  # { delta: int, reason: str }
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404)
    
    user.points = max(0, user.points + req.delta)  # 음수 방지
    db.commit()
    return {"success": True, "data": {"points": user.points}}
```

---

## PAGE 6: 시스템 설정 `/admin/settings`

### 탭 구성

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚙️ 시스템 설정                                                    │
├─────────────────────────────────────────────────────────────────┤
│  [💰 포인트 정책]  [📤 데이터 내보내기]                            │
├─────────────────────────────────────────────────────────────────┤
```

### 탭 1: 포인트 정책

```
│  💰 포인트 정책                                                   │
│  ──────────────────────────────────────────────────────────     │
│                                                                  │
│  세션 완료 포인트 (10문장 녹음 완료 시)                            │
│  현재값: [  10  ] 포인트     [저장]                               │
│                                                                  │
│  문장당 포인트                                                    │
│  현재값: [   1  ] 포인트     [저장]                               │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  ℹ️ 변경사항은 이후 세션부터 적용됩니다.                           │
```

### 탭 2: 데이터 내보내기

```
│  📤 데이터 내보내기                                               │
│  ──────────────────────────────────────────────────────────     │
│                                                                  │
│  내보내기 조건 설정                                               │
│  상태:     [✅ 승인됨만  ▼]                                      │
│  기간:     [시작일 ____] ~ [종료일 ____]                          │
│  성별:     [전체 ▼]                                              │
│  연령대:   [전체 ▼]                                              │
│  방언:     [전체 ▼]                                              │
│  SNR 최솟값: [ 0 ] dB                                           │
│                                                                  │
│  ─────────────────────────────────────────────────────────────  │
│  예상 결과: 7,890건의 녹음 데이터                                  │
│                                                                  │
│  [📄 메타데이터 CSV 다운로드]   [📦 WAV + CSV ZIP 다운로드]        │
│                                                                  │
│  ⚠️ ZIP 다운로드는 데이터가 많을 경우 수 분이 소요될 수 있습니다.  │
```

### FastAPI 설정 API
```python
# backend/app/models/system_config.py
class SystemConfig(Base):
    __tablename__ = "system_config"
    key   = Column(String(50), primary_key=True)
    value = Column(String(255), nullable=False)

# backend/app/routers/settings.py
@router.get("/points-policy")
async def get_points_policy(
    _: User = Depends(require_admin), db: Session = Depends(get_db)
):
    configs = {c.key: c.value for c in db.query(SystemConfig).all()}
    return {"success": True, "data": {
        "session_points": int(configs.get("session_points", 10)),
        "per_sentence_points": int(configs.get("per_sentence_points", 1))
    }}

@router.put("/points-policy")
async def update_points_policy(
    req: PointsPolicyRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    db.merge(SystemConfig(key="session_points", value=str(req.session_points)))
    db.merge(SystemConfig(key="per_sentence_points", value=str(req.per_sentence_points)))
    db.commit()
    return {"success": True}
```

---

## 어드민 공통 컴포넌트

### 페이지네이션
```javascript
const Pagination = ({ total, page, size, onChange }) => {
  const totalPages = Math.ceil(total / size)
  return (
    <div className="pagination">
      <button onClick={() => onChange(1)} disabled={page === 1}>«</button>
      <button onClick={() => onChange(page - 1)} disabled={page === 1}>‹</button>
      {getPageNumbers(page, totalPages).map(p => (
        <button key={p} onClick={() => onChange(p)}
          className={p === page ? 'active' : ''}>{p}</button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</button>
      <button onClick={() => onChange(totalPages)} disabled={page === totalPages}>»</button>
      <span className="total-info">총 {total.toLocaleString()}건</span>
    </div>
  )
}
```

### 공통 필터 훅
```javascript
const useAdminFilter = (initialFilters) => {
  const [filters, setFilters] = useState(initialFilters)
  const [page, setPage] = useState(1)

  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)  // 필터 변경 시 1페이지로 리셋
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(initialFilters)
    setPage(1)
  }, [initialFilters])

  return { filters, page, setPage, updateFilter, resetFilters }
}
```

---

## 어드민 라우터 설정

```javascript
// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom'

export default function App() {
  return (
    <Routes>
      {/* 일반 사용자 */}
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/record"   element={<PrivateRoute><RecordPage /></PrivateRoute>} />
      <Route path="/mypage"   element={<PrivateRoute><MyPage /></PrivateRoute>} />

      {/* 어드민 */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"                 element={<Dashboard />} />
        <Route path="sentences"                 element={<SentenceList />} />
        <Route path="sentences/bulk-import"     element={<BulkImport />} />
        <Route path="recordings"                element={<RecordingList />} />
        <Route path="recordings/review"         element={<ReviewPage />} />
        <Route path="users"                     element={<UserList />} />
        <Route path="users/:id"                 element={<UserDetail />} />
        <Route path="settings"                  element={<Settings />} />
      </Route>

      <Route path="/" element={<Navigate to="/record" replace />} />
    </Routes>
  )
}
```

---

## 어드민 CSS 기본 스타일 (변수)

```css
/* frontend/src/styles/admin.css */
:root {
  --admin-sidebar-width: 220px;
  --admin-header-height: 56px;
  --admin-bg: #f8fafc;
  --admin-sidebar-bg: #1e293b;
  --admin-sidebar-text: #94a3b8;
  --admin-sidebar-active: #ffffff;
  --admin-sidebar-active-bg: #3b82f6;
  --admin-border: #e2e8f0;
  --admin-card-bg: #ffffff;

  /* 상태 색상 */
  --status-pending:  #f59e0b;
  --status-analyzed: #3b82f6;
  --status-accepted: #10b981;
  --status-rejected: #ef4444;
}

.admin-layout {
  display: grid;
  grid-template-rows: var(--admin-header-height) 1fr;
  grid-template-columns: var(--admin-sidebar-width) 1fr;
  min-height: 100vh;
}

.admin-header {
  grid-column: 1 / -1;
  background: var(--admin-sidebar-bg);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
}

.admin-sidebar {
  background: var(--admin-sidebar-bg);
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  color: var(--admin-sidebar-text);
  text-decoration: none;
  border-radius: 6px;
  margin: 0 8px;
  transition: all 0.15s;
}

.nav-item.active,
.nav-item:hover {
  background: var(--admin-sidebar-active-bg);
  color: var(--admin-sidebar-active);
}

.admin-main {
  background: var(--admin-bg);
  padding: 2rem;
  overflow-y: auto;
}
```
