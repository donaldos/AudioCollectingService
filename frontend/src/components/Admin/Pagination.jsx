export default function Pagination({ total, page, size, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / size))
  if (totalPages <= 1) return null

  const pages = []
  const delta = 2
  for (let i = Math.max(1, page - delta); i <= Math.min(totalPages, page + delta); i++) {
    pages.push(i)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center', padding: '16px 0' }}>
      <PBtn onClick={() => onChange(1)} disabled={page === 1}>«</PBtn>
      <PBtn onClick={() => onChange(page - 1)} disabled={page === 1}>‹</PBtn>
      {pages[0] > 1 && <span style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>}
      {pages.map((p) => (
        <PBtn key={p} onClick={() => onChange(p)} active={p === page}>{p}</PBtn>
      ))}
      {pages[pages.length - 1] < totalPages && <span style={{ padding: '0 4px', color: '#9ca3af' }}>…</span>}
      <PBtn onClick={() => onChange(page + 1)} disabled={page === totalPages}>›</PBtn>
      <PBtn onClick={() => onChange(totalPages)} disabled={page === totalPages}>»</PBtn>
      <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>
        총 {total.toLocaleString()}건
      </span>
    </div>
  )
}

function PBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32, height: 32, padding: '0 6px',
        borderRadius: 6, border: '1px solid #e5e7eb',
        background: active ? '#3b82f6' : disabled ? '#f9fafb' : '#fff',
        color: active ? '#fff' : disabled ? '#d1d5db' : '#374151',
        cursor: disabled ? 'default' : 'pointer',
        fontSize: 13, fontWeight: active ? 700 : 400,
      }}
    >
      {children}
    </button>
  )
}
