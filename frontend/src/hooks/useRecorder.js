import { useState, useRef, useCallback } from 'react'

const getSupportedMimeType = () => {
  const types = [
    'audio/webm;codecs=opus',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/webm',
  ]
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

export const useRecorder = () => {
  const [status, setStatus] = useState('idle') // idle|recording|recorded|uploading|done
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)
  const isRecordingRef = useRef(false)
  const audioUrlRef = useRef(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
      streamRef.current = stream

      const audioCtx = new AudioContext()
      const analyser = audioCtx.createAnalyser()
      const source = audioCtx.createMediaStreamSource(stream)
      source.connect(analyser)
      analyser.fftSize = 256
      analyserRef.current = analyser
      isRecordingRef.current = true

      const updateVolume = () => {
        if (!isRecordingRef.current) return
        const data = new Uint8Array(analyser.frequencyBinCount)
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setVolume(avg)
        animFrameRef.current = requestAnimationFrame(updateVolume)
      }
      animFrameRef.current = requestAnimationFrame(updateVolume)

      chunksRef.current = []
      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        isRecordingRef.current = false
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        setVolume(0)
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const url = URL.createObjectURL(blob)
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
        audioUrlRef.current = url
        setAudioBlob(blob)
        setAudioUrl(url)
        setStatus('recorded')
        stream.getTracks().forEach((t) => t.stop())
      }

      recorder.start()
      mediaRecorderRef.current = recorder
      startTimeRef.current = Date.now()

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)

      setStatus('recording')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('마이크 권한을 허용해 주세요.')
      } else {
        console.error('녹음 오류:', err)
        alert('녹음을 시작할 수 없습니다.')
      }
    }
  }, [])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const resetRecording = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setDuration(0)
    setVolume(0)
    setStatus('idle')
  }, [])

  return {
    status,
    audioBlob,
    audioUrl,
    duration,
    volume,
    startRecording,
    stopRecording,
    resetRecording,
    setStatus,
  }
}
