import { useState, useRef } from 'react'

export function useVoice() {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])

  async function start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' })
      setAudioBlob(blob)
      stream.getTracks().forEach(t => t.stop())
    }
    mr.start()
    mediaRef.current = mr
    setRecording(true)
  }

  function stop() {
    mediaRef.current?.stop()
    setRecording(false)
  }

  return { recording, audioBlob, start, stop, reset: () => setAudioBlob(null) }
}
