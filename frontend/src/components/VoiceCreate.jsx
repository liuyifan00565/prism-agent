import { useRef, useEffect } from 'react'

/* ── contenteditable helper：仅在内容非用户输入时才刷新 DOM ── */
function useSyncedRef(value) {
  const ref  = useRef(null)
  const prev = useRef(undefined)
  useEffect(() => {
    if (!ref.current) return
    if (value === prev.current) return
    prev.current = value
    if (document.activeElement === ref.current) return
    ref.current.textContent = value
  }, [value])
  return ref
}

/* ── Spinner ─────────────────────────────────────────────── */
function Spinner({ size = 16 }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: '2px solid rgba(123,110,246,0.3)', borderTopColor: 'var(--accent)',
      display: 'inline-block', animation: 'spin 0.75s linear infinite',
    }} />
  )
}

/* ── RecordBtn ───────────────────────────────────────────── */
function RecordBtn({ isRecording, onStart, onStop, size = 60 }) {
  return (
    <button
      onMouseDown={onStart}
      onMouseUp={onStop}
      onMouseLeave={e => { if (isRecording) onStop(e) }}
      onTouchStart={e => { e.preventDefault(); onStart() }}
      onTouchEnd={e => { e.preventDefault(); onStop() }}
      style={{
        width: size, height: size, borderRadius: '50%',
        border: isRecording
          ? '2px solid rgba(248,113,113,0.5)'
          : '2px solid rgba(123,110,246,0.3)',
        background: isRecording
          ? 'rgba(248,113,113,0.12)'
          : 'rgba(123,110,246,0.08)',
        fontSize: size * 0.38, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none',
        boxShadow: isRecording
          ? '0 0 0 8px rgba(248,113,113,0.08), 0 0 24px rgba(248,113,113,0.2)'
          : '0 0 20px rgba(123,110,246,0.15)',
        transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
        animation: isRecording ? 'pulse-glow 1.5s ease-in-out infinite' : 'none',
      }}
    >
      {isRecording ? '■' : '🎙'}
    </button>
  )
}

/* ══ main component ════════════════════════════════════════ */
export default function VoiceCreate({ vc }) {
  const {
    transcript, isRecording, isGenerating,
    generatedTitle, generatedBody,
    titleCandidates, showTitleCandidates, loadingCandidates,
    history, refineDesc,
    isRefineOpen, isRefineRecording, isRefineLoading, refineTranscript,
    setGeneratedTitle, setGeneratedBody,
    setShowTitleCandidates,
    startRecording, stopRecording,
    regenerateTitles, selectTitle,
    startRefineRecording, stopRefineRecording,
    setIsRefineOpen, closeRefine,
    undo, reset,
  } = vc

  const titleRef = useSyncedRef(generatedTitle)
  const bodyRef  = useSyncedRef(generatedBody)

  const hasContent = !!(generatedTitle || generatedBody)
  const showRecord  = !hasContent && !isGenerating
  const showLoading = isGenerating && !hasContent
  const showContent = hasContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Record card ─────────────────────────────────── */}
      {showRecord && (
        <div className="glass-panel" style={{
          padding: '22px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
          border: isRecording ? '1px solid rgba(248,113,113,0.25)' : '1px solid var(--border)',
          transition: 'border-color 0.2s',
          animation: 'fadeUp .3s ease',
        }}>
          <p style={{
            fontSize: 13, margin: 0, textAlign: 'center', lineHeight: 1.6,
            color: isRecording ? 'var(--text-2)' : 'var(--text-3)',
          }}>
            {isRecording
              ? <><span style={{ color: 'var(--red)' }}>🎙</span> 录音中，松开后自动生成内容...</>
              : <>🎤 按住按钮，说出你想写的内容</>
            }
          </p>

          {transcript && (
            <div style={{
              width: '100%', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
              maxHeight: 72, overflow: 'auto',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r-sm)', padding: '8px 10px',
              fontFamily: 'var(--font-display)',
            }}>
              {transcript}
            </div>
          )}

          <RecordBtn isRecording={isRecording} onStart={startRecording} onStop={stopRecording} />

          <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
            {isRecording
              ? <span style={{ color: 'var(--red)', animation: 'pulse 1s infinite' }}>● 松开即生成</span>
              : '○ 按住录音，松开生成'
            }
          </p>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────── */}
      {showLoading && (
        <div className="glass-panel" style={{
          padding: '32px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          animation: 'fadeUp .3s ease',
        }}>
          <Spinner size={22} />
          <p style={{ fontSize: 13, color: 'var(--accent)', margin: 0, fontWeight: 500 }}>
            ✦ 大模型理解中...
          </p>
          {transcript && (
            <p style={{
              fontSize: 11, color: 'var(--text-3)', margin: 0,
              maxWidth: '90%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              fontStyle: 'italic',
            }}>
              「{transcript.slice(0, 50)}{transcript.length > 50 ? '...' : ''}」
            </p>
          )}
        </div>
      )}

      {/* ── Generated content ───────────────────────────── */}
      {showContent && (
        <>
          {/* Refine loading */}
          {isRefineLoading && (
            <div className="glass-panel" style={{
              padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 10,
              border: '1px solid rgba(123,110,246,0.2)',
              animation: 'fadeUp .2s ease',
            }}>
              <Spinner size={14} />
              <span style={{ fontSize: 13, color: 'var(--accent)' }}>✦ 优化中...</span>
            </div>
          )}

          {/* Title */}
          <div className="glass-panel" style={{ padding: '10px 12px' }}>
            <div style={{
              fontSize: 10, color: 'var(--text-3)', marginBottom: 6,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              标题
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onInput={e => setGeneratedTitle(e.currentTarget.textContent)}
                style={{
                  flex: 1, fontSize: 14, fontWeight: 600,
                  color: 'var(--text-1)',
                  outline: 'none', minHeight: 22, lineHeight: 1.5,
                  padding: '2px 4px', borderRadius: 4,
                  border: '1px solid transparent', cursor: 'text',
                  transition: 'border-color 0.15s, background 0.15s',
                  fontFamily: 'var(--font-display)',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
                  e.currentTarget.style.background  = 'rgba(123,110,246,0.05)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'transparent'
                  e.currentTarget.style.background  = 'transparent'
                }}
              />
              <button
                onClick={regenerateTitles}
                style={{
                  flexShrink: 0, padding: '4px 10px', fontSize: 11,
                  borderRadius: 'var(--r-sm)',
                  background: 'transparent', border: '1px solid var(--border)',
                  color: 'var(--text-3)', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-3)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }}
              >
                换一个
              </button>
            </div>
          </div>

          {/* Title candidates */}
          {showTitleCandidates && (
            <div className="glass-panel" style={{
              padding: 10,
              display: 'flex', flexDirection: 'column', gap: 6,
              animation: 'fadeUp .2s ease',
            }}>
              {loadingCandidates ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
                  <Spinner size={12} />
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>生成备选标题中...</span>
                </div>
              ) : (
                titleCandidates.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8, padding: '7px 10px',
                    background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--r-sm)',
                    border: '1px solid var(--border)',
                    animation: `fadeUp .15s ease ${i * 50}ms both`,
                    transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  >
                    <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, lineHeight: 1.4 }}>{t}</span>
                    <button
                      onClick={() => selectTitle(t)}
                      style={{
                        flexShrink: 0, padding: '3px 10px', fontSize: 11,
                        borderRadius: 'var(--r-sm)',
                        background: 'rgba(123,110,246,0.1)',
                        border: '1px solid rgba(123,110,246,0.3)',
                        color: 'var(--accent)', cursor: 'pointer',
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(123,110,246,0.18)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(123,110,246,0.1)')}
                    >
                      用这个
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={() => setShowTitleCandidates(false)}
                style={{
                  alignSelf: 'center', fontSize: 11, color: 'var(--text-3)',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
                  transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                收起
              </button>
            </div>
          )}

          {/* Body */}
          <div className="glass-panel" style={{ padding: '10px 12px', position: 'relative' }}>
            <div style={{
              fontSize: 10, color: 'var(--text-3)', marginBottom: 6,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              正文
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => setGeneratedBody(e.currentTarget.textContent)}
              style={{
                fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75,
                outline: 'none', minHeight: 120, maxHeight: 280,
                overflow: 'auto', whiteSpace: 'pre-wrap',
                padding: '2px 4px', borderRadius: 4,
                border: '1px solid transparent', cursor: 'text',
                transition: 'border-color 0.15s, background 0.15s',
                fontFamily: 'var(--font-display)',
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
                e.currentTarget.style.background  = 'rgba(123,110,246,0.03)'
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = 'transparent'
                e.currentTarget.style.background  = 'transparent'
              }}
            />
            <div style={{
              position: 'absolute', bottom: 8, right: 10,
              fontSize: 10, color: 'var(--text-3)',
              pointerEvents: 'none',
              fontFamily: 'var(--font-mono)',
            }}>
              {generatedBody.length} 字
            </div>
          </div>

          {/* Undo / refine desc */}
          {(refineDesc || history.length > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', flex: 1 }}>
                {refineDesc ? `✎ ${refineDesc}` : ''}
              </span>
              {history.length > 0 && (
                <button
                  onClick={undo}
                  style={{
                    fontSize: 11, color: 'var(--text-3)', background: 'transparent',
                    border: 'none', cursor: 'pointer', flexShrink: 0, padding: '2px 4px',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
                >
                  ↩ 撤销
                </button>
              )}
            </div>
          )}

          {/* Voice refine toggle */}
          {!isRefineOpen ? (
            <button
              onClick={() => setIsRefineOpen(true)}
              disabled={isRefineLoading}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 'var(--r-md)', fontSize: 13,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: 'var(--text-3)',
                cursor: isRefineLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => {
                if (!isRefineLoading) {
                  e.currentTarget.style.borderColor = 'rgba(123,110,246,0.3)'
                  e.currentTarget.style.color = 'var(--accent)'
                  e.currentTarget.style.background = 'rgba(123,110,246,0.05)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text-3)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              🎤 语音优化
            </button>
          ) : (
            <div className="glass-panel" style={{
              padding: 16,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              border: '1px solid rgba(123,110,246,0.2)',
              animation: 'fadeUp .25s cubic-bezier(0.34,1.56,0.64,1)',
            }}>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                按住录音，说出修改要求<br />
                <span style={{ fontSize: 11, color: 'var(--text-3)', opacity: 0.7 }}>
                  例如：「把第二段再详细一点」「标题改得更吸引人」
                </span>
              </p>

              {refineTranscript && (
                <div style={{
                  width: '100%', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-sm)', padding: '7px 10px',
                }}>
                  {refineTranscript}
                </div>
              )}

              <RecordBtn
                isRecording={isRefineRecording}
                onStart={startRefineRecording}
                onStop={stopRefineRecording}
                size={50}
              />

              <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0 }}>
                {isRefineRecording
                  ? <span style={{ color: 'var(--red)', animation: 'pulse 1s infinite' }}>● 录音中，松开发送</span>
                  : '○ 按住录音'
                }
              </p>

              <button
                onClick={closeRefine}
                style={{
                  fontSize: 11, color: 'var(--text-3)', background: 'transparent',
                  border: 'none', cursor: 'pointer', transition: 'color .15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                取消
              </button>
            </div>
          )}

          {/* Re-record */}
          <button
            onClick={reset}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 'var(--r-sm)', fontSize: 11,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-3)', cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            重新录音
          </button>
        </>
      )}
    </div>
  )
}
