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
      {/* Record button */}
      <button
        onClick={handleToggle}
        style={{
          width: 40, height: 40, borderRadius: '50%', cursor: 'pointer',
          background: recording
            ? 'rgba(248,113,113,0.2)'
            : 'rgba(123,110,246,0.1)',
          border: recording
            ? '1px solid rgba(248,113,113,0.4)'
            : '1px solid rgba(123,110,246,0.3)',
          fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all .2s',
          boxShadow: recording
            ? '0 0 0 6px rgba(248,113,113,0.15), 0 0 20px rgba(248,113,113,0.2)'
            : '0 0 12px rgba(123,110,246,0.2)',
          animation: recording ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
          color: recording ? 'var(--red)' : 'var(--accent)',
          flexShrink: 0,
        }}
        title={recording ? '停止录音' : '开始录音'}
      >
        {recording ? '■' : '🎙'}
      </button>

      {/* Send button (after recording) */}
      {audioBlob && !recording && (
        <button
          onClick={handleSubmit}
          style={{
            padding: '7px 14px', borderRadius: 'var(--r-md)',
            border: '1px solid rgba(123,110,246,0.3)',
            background: 'rgba(123,110,246,0.1)',
            color: 'var(--accent)',
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
            transition: 'all .2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(123,110,246,0.18)'
            e.currentTarget.style.boxShadow  = '0 0 12px rgba(123,110,246,0.3)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(123,110,246,0.1)'
            e.currentTarget.style.boxShadow  = 'none'
          }}
        >
          ↑ 发送录音
        </button>
      )}

      {/* Recording indicator */}
      {recording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--red)', display: 'inline-block',
            animation: 'pulse 1s infinite',
          }} />
          <span style={{ fontSize: 11, color: 'var(--red)' }}>录音中...</span>
        </div>
      )}
    </div>
  )
}
