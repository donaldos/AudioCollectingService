import { useState, useEffect } from 'react'

const BAR_COUNT = 32

export default function WaveformVisualizer({ isRecording, volume }) {
  const [bars, setBars] = useState(Array(BAR_COUNT).fill(3))

  useEffect(() => {
    if (isRecording) {
      setBars((prev) => {
        const next = prev.slice(1)
        const h = Math.max(3, Math.min(64, volume * 0.85))
        next.push(h)
        return next
      })
    } else {
      setBars(Array(BAR_COUNT).fill(3))
    }
  }, [volume, isRecording])

  return (
    <div style={containerStyle}>
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: h,
            background: isRecording ? '#3b82f6' : '#d1d5db',
            borderRadius: 2,
            transition: 'height 0.05s ease, background 0.3s',
            alignSelf: 'center',
          }}
        />
      ))}
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 3,
  height: 80,
  padding: '0 12px',
  justifyContent: 'center',
  background: '#f9fafb',
  borderRadius: 10,
  marginBottom: 12,
}
