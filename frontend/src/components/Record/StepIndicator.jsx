export default function StepIndicator({ total, current, done }) {
  return (
    <div style={containerStyle}>
      {Array.from({ length: total }, (_, i) => {
        const isCompleted = i < current || (i === current && done)
        const isActive = i === current && !done
        return (
          <div
            key={i}
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: isCompleted || isActive ? '#3b82f6' : '#d1d5db',
              boxShadow: isActive ? '0 0 0 3px #bfdbfe' : 'none',
              transition: 'all 0.2s',
              flexShrink: 0,
            }}
          />
        )
      })}
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'center',
  marginBottom: 10,
}
