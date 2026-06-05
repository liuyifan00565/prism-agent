import { useVoice } from '../hooks/useVoice'

export default function VoiceInput({ onAudio }) {
  const { recording, audioBlob, start, stop, reset } = useVoice()

  function handleToggle() {
    if (recording) { stop() } else { reset(); start() }
  }

  function handleSubmit() {
    if (audioBlob) { onAudio(audioBlob); reset() }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button
        onClick={handleToggle}
        style={{
          width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
          background: recording
            ? 'var(--red)'
            : 'var(--accent-glow)',
          border: recording ? 'none' : '1px solid var(--border-active)',
          fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          boxShadow: recording ? '0 0 0 6px rgba(248,113,113,.2)' : '0 0 12px var(--accent-glow)',
        }}
        title={recording ? '停止录音' : '开始录音'}
      >
        {recording ? '■' : '🎙'}
      </button>
      {audioBlob && !recording && (
        <button
          onClick={handleSubmit}
          style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border-active)',
            background: 'var(--accent-glow)', color: 'var(--accent)',
            cursor: 'pointer', fontSize: 12,
          }}
        >
          发送录音
        </button>
      )}
      {recording && (
        <span style={{ fontSize: 11, color: 'var(--red)', animation: 'pulse 1s infinite' }}>
          ● 录音中...
        </span>
      )}
    </div>
  )
}
