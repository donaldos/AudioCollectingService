import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'

const TEMPLATE = 'text,category,language\n"오늘 날씨가 참 맑고 따뜻하네요.",일상,ko\n"저는 매일 아침 커피 한 잔으로 시작합니다.",일상,ko\n'

export default function BulkImport() {
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  const handleFile = (f) => {
    if (!f || !f.name.endsWith('.csv')) { alert('CSV 파일만 허용됩니다.'); return }
    setFile(f)
    setResult(null)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await api.post('/sentences/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data.data)
    } catch (err) {
      alert(err.response?.data?.detail || '업로드에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'sentence_template.csv'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <Link to="/admin/sentences" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14 }}>← 문장 목록</Link>
        <h2 style={pageTitle}>📥 문장 일괄 등록 (CSV)</h2>
      </div>

      {/* CSV 형식 안내 */}
      <div style={{ ...card, marginBottom: 20 }}>
        <h3 style={cardTitle}>CSV 파일 형식</h3>
        <pre style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 13, color: '#374151', margin: '0 0 12px', overflowX: 'auto' }}>
{`text,category,language
"오늘 날씨가 참 맑고 따뜻하네요.",일상,ko
"저는 매일 아침 커피 한 잔으로 시작합니다.",일상,ko`}
        </pre>
        <button style={outlineBtn} onClick={downloadTemplate}>📄 템플릿 다운로드</button>
      </div>

      {/* 파일 드롭존 */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div
          style={{
            border: `2px dashed ${dragging ? '#3b82f6' : '#d1d5db'}`,
            borderRadius: 10,
            padding: '40px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#eff6ff' : '#fafafa',
            transition: 'all 0.2s',
          }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
        >
          <p style={{ fontSize: 32, margin: '0 0 8px' }}>📂</p>
          {file ? (
            <>
              <p style={{ fontWeight: 600, color: '#111', margin: '0 0 4px' }}>{file.name}</p>
              <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>({(file.size / 1024).toFixed(1)} KB)</p>
            </>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>CSV 파일을 여기에 드래그하거나 클릭하여 선택하세요</p>
              <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>UTF-8 또는 UTF-8 BOM 인코딩</p>
            </>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />

        {file && !result && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
            <button style={cancelBtn} onClick={() => setFile(null)}>취소</button>
            <button style={primaryBtn} onClick={handleUpload} disabled={loading}>
              {loading ? '등록 중...' : '📥 등록하기'}
            </button>
          </div>
        )}
      </div>

      {/* 결과 */}
      {result && (
        <div style={card}>
          <h3 style={cardTitle}>등록 결과</h3>
          <div style={{ display: 'flex', gap: 20, marginBottom: 16 }}>
            <span style={{ color: '#10b981', fontWeight: 700, fontSize: 16 }}>✅ 등록: {result.success}개</span>
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16 }}>⚠️ 중복: {result.duplicate}개</span>
            <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>❌ 오류: {result.error}개</span>
          </div>
          {result.errors?.length > 0 && (
            <ul style={{ margin: 0, padding: '0 0 0 20px', color: '#ef4444', fontSize: 13 }}>
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
          <div style={{ marginTop: 16 }}>
            <Link to="/admin/sentences" style={primaryBtn}>문장 목록으로</Link>
          </div>
        </div>
      )}
    </div>
  )
}

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: 0, fontSize: 20, fontWeight: 700 }
const card       = { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
const cardTitle  = { margin: '0 0 14px', fontSize: 14, fontWeight: 700, color: '#374151' }
const primaryBtn = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'none', display: 'inline-block' }
const outlineBtn = { padding: '7px 14px', borderRadius: 8, border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const cancelBtn  = { padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }
