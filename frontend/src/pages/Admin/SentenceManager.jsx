import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api'
import Pagination from '@/components/Admin/Pagination'

const PAGE_SIZE = 20

export default function SentenceManager() {
  const [sentences, setSentences] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState(null) // null | { mode: 'add' | 'edit', data }

  const load = async (p = page) => {
    setLoading(true)
    try {
      const res = await api.get('/sentences', { params: { skip: (p - 1) * PAGE_SIZE, limit: PAGE_SIZE } })
      setSentences(res.data.data.items)
      setTotal(res.data.data.total)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page])

  const handleDeactivate = async (id) => {
    if (!confirm('비활성화하시겠습니까?')) return
    await api.delete(`/sentences/${id}`)
    load(page)
  }

  const handleSave = async (form) => {
    if (modal.mode === 'add') {
      await api.post('/sentences', form)
    } else {
      await api.put(`/sentences/${modal.data.id}`, form)
    }
    setModal(null)
    load(page)
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={pageTitle}>📝 문장 관리</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/admin/sentences/bulk-import" style={outlineBtn}>📥 CSV 가져오기</Link>
          <button style={primaryBtn} onClick={() => setModal({ mode: 'add', data: null })}>+ 문장 추가</button>
        </div>
      </div>

      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr style={thRow}>
              {['ID', '문장 텍스트', '카테고리', '언어', '상태', '관리'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#9ca3af' }}>로딩 중...</td></tr>
            ) : sentences.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={td}>{s.id}</td>
                <td style={{ ...td, maxWidth: 360 }}>{s.text}</td>
                <td style={td}>{s.category || '-'}</td>
                <td style={td}>{s.language}</td>
                <td style={td}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                    background: s.is_active ? '#d1fae5' : '#fee2e2',
                    color: s.is_active ? '#059669' : '#dc2626' }}>
                    {s.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td style={td}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={smBtn} onClick={() => setModal({ mode: 'edit', data: s })}>수정</button>
                    {s.is_active && (
                      <button style={{ ...smBtn, color: '#ef4444', borderColor: '#ef4444' }}
                        onClick={() => handleDeactivate(s.id)}>
                        비활성
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination total={total} page={page} size={PAGE_SIZE} onChange={(p) => setPage(p)} />

      {modal && (
        <SentenceModal
          mode={modal.mode}
          data={modal.data}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  )
}

function SentenceModal({ mode, data, onSave, onClose }) {
  const [form, setForm] = useState({ text: data?.text || '', category: data?.category || '', language: data?.language || 'ko' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try { await onSave(form) }
    finally { setSaving(false) }
  }

  return (
    <div style={overlay}>
      <div style={modalBox}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{mode === 'add' ? '문장 추가' : '문장 수정'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <Label>발화 문장 *</Label>
          <textarea
            style={{ ...inputStyle, height: 80, resize: 'vertical' }}
            value={form.text}
            onChange={(e) => setForm({ ...form, text: e.target.value })}
            required
          />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <Label>카테고리</Label>
              <input style={inputStyle} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="예: 일상, 뉴스" />
            </div>
            <div style={{ flex: 1 }}>
              <Label>언어</Label>
              <select style={inputStyle} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="ko">한국어 (ko)</option>
                <option value="en">영어 (en)</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" style={cancelBtn} onClick={onClose}>취소</button>
            <button type="submit" style={primaryBtn} disabled={saving}>{saving ? '저장 중...' : '저장'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const Label = ({ children }) => <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{children}</label>

const pageStyle  = { padding: 28, fontFamily: 'sans-serif' }
const pageTitle  = { margin: 0, fontSize: 20, fontWeight: 700 }
const tableWrap  = { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }
const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const thRow      = { background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }
const th         = { padding: '10px 12px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12 }
const td         = { padding: '10px 12px' }
const primaryBtn = { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'none', display: 'inline-block' }
const outlineBtn = { padding: '8px 16px', borderRadius: 8, border: '1px solid #3b82f6', background: '#fff', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', fontSize: 13, textDecoration: 'none', display: 'inline-block' }
const cancelBtn  = { padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', fontSize: 13 }
const smBtn      = { padding: '4px 10px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: '#374151', cursor: 'pointer', fontSize: 12 }
const overlay    = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }
const modalBox   = { background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '90vw' }
const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, boxSizing: 'border-box' }
