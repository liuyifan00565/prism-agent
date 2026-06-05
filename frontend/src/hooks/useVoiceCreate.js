import { useState, useRef } from 'react'

const BASE = '/api'

async function post(path, data) {
  const r = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  return r.json()
}

async function postForm(path, fd) {
  const r = await fetch(BASE + path, { method: 'POST', body: fd })
  return r.json()
}

/* ─── MediaRecorder + Web Speech helper ─────────────────── */
function createRecorder(onTranscript) {
  let mr = null
  let sr = null
  let chunks = []

  async function start() {
    chunks = []
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mr = new MediaRecorder(stream)
    mr.ondataavailable = e => chunks.push(e.data)
    mr.start()

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SR) {
      sr = new SR()
      sr.lang = 'zh-CN'
      sr.continuous = true
      sr.interimResults = true
      sr.onresult = e => {
        const text = Array.from(e.results).map(r => r[0].transcript).join('')
        onTranscript(text)
      }
      try { sr.start() } catch {}
    }
  }

  function stop() {
    try { sr?.stop() } catch {}
    sr = null
    return new Promise(resolve => {
      if (!mr) { resolve(null); return }
      mr.onstop = () => {
        mr.stream?.getTracks().forEach(t => t.stop())
        resolve(chunks.length ? new Blob(chunks, { type: 'audio/wav' }) : null)
      }
      mr.stop()
    })
  }

  return { start, stop }
}

/* ─── hook ────────────────────────────────────────────────── */
export function useVoiceCreate() {
  /* main recording */
  const [transcript,    setTranscript]    = useState('')
  const [isRecording,   setIsRecording]   = useState(false)
  const [isGenerating,  setIsGenerating]  = useState(false)

  /* generated content */
  const [generatedTitle, setGeneratedTitle] = useState('')
  const [generatedBody,  setGeneratedBody]  = useState('')
  const [contentSummary, setContentSummary] = useState('')

  /* title candidates */
  const [titleCandidates,     setTitleCandidates]     = useState([])
  const [showTitleCandidates, setShowTitleCandidates] = useState(false)
  const [loadingCandidates,   setLoadingCandidates]   = useState(false)

  /* history for undo */
  const [history,    setHistory]    = useState([])
  const [refineDesc, setRefineDesc] = useState('')

  /* refine overlay */
  const [isRefineOpen,      setIsRefineOpen]      = useState(false)
  const [isRefineRecording, setIsRefineRecording] = useState(false)
  const [isRefineLoading,   setIsRefineLoading]   = useState(false)
  const [refineTranscript,  setRefineTranscript]  = useState('')

  const mainRecRef   = useRef(null)
  const refineRecRef = useRef(null)

  /* ── main recording ──────────────────────────────────── */
  async function startRecording() {
    setTranscript('')
    setIsRecording(true)
    const rec = createRecorder(setTranscript)
    mainRecRef.current = rec
    try {
      await rec.start()
    } catch (err) {
      console.error('Mic error:', err)
      setIsRecording(false)
    }
  }

  async function stopRecording() {
    setIsRecording(false)
    setIsGenerating(true)

    const blob = await mainRecRef.current?.stop()
    mainRecRef.current = null

    try {
      let finalText = transcript

      // Precise Whisper transcription
      if (blob && blob.size > 100) {
        const fd = new FormData()
        fd.append('audio', blob, 'recording.wav')
        const res = await postForm('/voice/transcribe', fd)
        if (res.transcript) {
          finalText = res.transcript
          setTranscript(finalText)
        }
      }

      if (!finalText.trim()) { setIsGenerating(false); return }

      const result = await post('/voice/generate', { transcript: finalText })
      setGeneratedTitle(result.title   || '')
      setGeneratedBody(result.body     || '')
      setContentSummary(result.summary || '')
      setHistory([])
      setRefineDesc('')
    } catch (err) {
      console.error('Generate error:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  /* ── title candidates ────────────────────────────────── */
  async function regenerateTitles() {
    setShowTitleCandidates(true)
    setLoadingCandidates(true)
    setTitleCandidates([])
    try {
      const res = await post('/voice/titles', {
        summary:       contentSummary,
        body:          generatedBody,
        current_title: generatedTitle,
      })
      setTitleCandidates(res.titles || [])
    } finally {
      setLoadingCandidates(false)
    }
  }

  function selectTitle(t) {
    setGeneratedTitle(t)
    setShowTitleCandidates(false)
  }

  /* ── refine recording ────────────────────────────────── */
  async function startRefineRecording() {
    setRefineTranscript('')
    setIsRefineRecording(true)
    const rec = createRecorder(setRefineTranscript)
    refineRecRef.current = rec
    try {
      await rec.start()
    } catch (err) {
      console.error('Refine mic error:', err)
      setIsRefineRecording(false)
    }
  }

  async function stopRefineRecording() {
    setIsRefineRecording(false)
    const blob = await refineRecRef.current?.stop()
    refineRecRef.current = null

    let instruction = refineTranscript

    if (blob && blob.size > 100) {
      const fd = new FormData()
      fd.append('audio', blob, 'refine.wav')
      const res = await postForm('/voice/transcribe', fd)
      if (res.transcript) {
        instruction = res.transcript
        setRefineTranscript(instruction)
      }
    }

    if (!instruction.trim()) { setIsRefineOpen(false); return }

    // save snapshot for undo
    setHistory(h => [...h, { title: generatedTitle, body: generatedBody }])

    setIsRefineLoading(true)
    try {
      const res = await post('/voice/refine', {
        instruction,
        current_title: generatedTitle,
        current_body:  generatedBody,
        summary:       contentSummary,
      })
      if (res.title) setGeneratedTitle(res.title)
      if (res.body)  setGeneratedBody(res.body)
      setRefineDesc(res.change_desc || '')
      setIsRefineOpen(false)
      setRefineTranscript('')
    } catch (err) {
      console.error('Refine error:', err)
    } finally {
      setIsRefineLoading(false)
    }
  }

  function closeRefine() {
    setIsRefineOpen(false)
    setRefineTranscript('')
  }

  /* ── undo ────────────────────────────────────────────── */
  function undo() {
    setHistory(h => {
      if (!h.length) return h
      const prev = h[h.length - 1]
      setGeneratedTitle(prev.title)
      setGeneratedBody(prev.body)
      setRefineDesc('')
      return h.slice(0, -1)
    })
  }

  /* ── reset ───────────────────────────────────────────── */
  function reset() {
    setTranscript('')
    setIsRecording(false)
    setIsGenerating(false)
    setGeneratedTitle('')
    setGeneratedBody('')
    setContentSummary('')
    setTitleCandidates([])
    setShowTitleCandidates(false)
    setHistory([])
    setRefineDesc('')
    setIsRefineOpen(false)
    setIsRefineRecording(false)
    setIsRefineLoading(false)
    setRefineTranscript('')
  }

  return {
    /* state */
    transcript, isRecording, isGenerating,
    generatedTitle, generatedBody, contentSummary,
    titleCandidates, showTitleCandidates, loadingCandidates,
    history, refineDesc,
    isRefineOpen, isRefineRecording, isRefineLoading, refineTranscript,
    /* setters for contenteditable sync */
    setGeneratedTitle, setGeneratedBody,
    setShowTitleCandidates,
    /* actions */
    startRecording, stopRecording,
    regenerateTitles, selectTitle,
    startRefineRecording, stopRefineRecording,
    setIsRefineOpen, closeRefine,
    undo, reset,
  }
}
