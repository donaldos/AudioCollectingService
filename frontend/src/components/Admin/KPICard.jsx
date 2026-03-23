export default function KPICard({ title, value, unit = '', icon, color = '#3b82f6', onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', flex: 1, minWidth: 0, cursor: onClick ? 'pointer' : 'default', transition: 'box-shadow 0.15s' }}
      onMouseEnter={(e) => { if (onClick) e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)' }}
      onMouseLeave={(e) => { if (onClick) e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280' }}>{title}</p>
          <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
            {unit && <span style={{ fontSize: 14, fontWeight: 400, color: '#6b7280', marginLeft: 4 }}>{unit}</span>}
          </p>
        </div>
        <span style={{ fontSize: 28 }}>{icon}</span>
      </div>
    </div>
  )
}
