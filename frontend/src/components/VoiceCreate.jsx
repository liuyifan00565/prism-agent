import { useRef, useEffect } from 'react'

/* ── contenteditable helper：仅在内容非用户输入时才刷新 DOM ── */
function useSyncedRef(value) {
  const ref  = useRef(null)
  const prev = useRef(undefined)
  useEffect(() => {
    if (!ref.current) return
    if (value === prev.current) return          // 内容未变，跳过
    prev.current = value
    if (document.activeElement === ref.current) return // 用户正在编辑，跳过
    ref.current.textContent = value
  }, [value])
  return ref
}

/* ── small sub-components ─────────────────────────────────── */
function Spinner({ size = 16, color = '#c8f55a' }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      border: `2px solid ${color}`, borderTopColor: 'transparent',
      display: 'inline-block', animation: 'spin 0.75s linear infinite',
    }} />
  )
}

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
        border: `2px solid ${isRecording ? '#ff6b6b' : '#c8f55a55'}`,
        background: isRecording ? 'rgba(255,107,107,0.15)' : 'rgba(200,245,90,0.07)',
        fontSize: size * 0.38, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        userSelect: 'none', WebkitUserSelect: 'none',
        boxShadow: isRecording ? '0 0 0 8px rgba(255,107,107,0.1)' : 'none',
        transition: 'all 0.15s',
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

  const hasContent  = !!(generatedTitle || generatedBody)
  const isAnything  = isRecording || isGenerating || isRefineLoading

  /* ── PHASE 1: recording / waiting ─────────────────────── */
  const showRecord = !hasContent && !isGenerating

  /* ── PHASE 2: loading ──────────────────────────────────── */
  const showLoading = isGenerating && !hasContent

  /* ── PHASE 3: content ──────────────────────────────────── */
  const showContent = hasContent

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Record card ─────────────────────────────────── */}
      {showRecord && (
        <div style={{
          background: '#16161a',
          border: `1px solid ${isRecording ? '#ff6b6b33' : '#1e1e24'}`,
          borderRadius: 10, padding: '22px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
          transition: 'border-color 0.2s',
        }}>
          <p style={{ fontSize: 13, color: isRecording ? '#aaa' : '#555', margin: 0, textAlign: 'center' }}>
            {isRecording ? '🎙 录音中，松开后自动生成内容...' : '🎤 按住按钮，说出你想写的内容'}
          </p>

          {/* realtime transcript */}
          {transcript && (
            <div style={{
              width: '100%', fontSize: 12, color: '#888', lineHeight: 1.6,
              maxHeight: 72, overflow: 'auto',
              background: '#0d0d0f', borderRadius: 6, padding: '8px 10px',
            }}>
              {transcript}
            </div>
          )}

          <RecordBtn isRecording={isRecording} onStart={startRecording} onStop={stopRecording} />

          <p style={{ fontSize: 11, color: '#333', margin: 0 }}>
            {isRecording ? '● 松开即生成' : '○ 按住录音，松开生成'}
          </p>
        </div>
      )}

      {/* ── Loading ─────────────────────────────────────── */}
      {showLoading && (
        <div style={{
          background: '#16161a', border: '1px solid #1e1e24',
          borderRadius: 10, padding: '32px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <Spinner size={20} />
          <p style={{ fontSize: 13, color: '#c8f55a', margin: 0 }}>✦ 大模型理解中...</p>
          {transcript && (
            <p style={{
              fontSize: 11, color: '#444', margin: 0,
              maxWidth: '100%', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              「{transcript.slice(0, 50)}{transcript.length > 50 ? '...' : ''}」
            </p>
          )}
        </div>
      )}

      {/* ── Generated content ───────────────────────────── */}
      {showContent && (
        <>
          {/* Refine loading overlay (reuses isRefineLoading) */}
          {isRefineLoading && (
            <div style={{
              background: '#16161a', border: '1px solid #1e1e24',
              borderRadius: 8, padding: '14px',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <Spinner size={14} />
              <span style={{ fontSize: 13, color: '#c8f55a' }}>✦ 优化中...</span>
            </div>
          )}

          {/* Title */}
          <div style={{
            background: '#16161a', border: '1px solid #1e1e24',
            borderRadius: 8, padding: '10px 12px',
          }}>
            <div style={{ fontSize: 10, color: '#444', marginBottom: 6, letterSpacing: '0.5px' }}>
              标题
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onInput={e => setGeneratedTitle(e.currentTarget.textContent)}
                style={{
                  flex: 1, fontSize: 14, fontWeight: 500, color: '#ddd',
                  outline: 'none', minHeight: 20, lineHeight: 1.5,
                  padding: '1px 3px', borderRadius: 3,
                  border: '1px solid transparent', cursor: 'text',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = '#2e2e38')}
                onBlur={e  => (e.currentTarget.style.borderColor = 'transparent')}
              />
              <button
                onClick={regenerateTitles}
                style={{
                  flexShrink: 0, padding: '4px 10px', fontSize: 11, borderRadius: 6,
                  background: 'transparent', border: '1px solid #2a2a30',
                  color: '#666', cursor: 'pointer', whiteSpace: 'nowrap',
                  transition: 'color 0.15s, border-color 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#c8f55a'; e.currentTarget.style.borderColor = '#c8f55a44' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#666';    e.currentTarget.style.borderColor = '#2a2a30' }}
              >
                换一个
              </button>
            </div>
          </div>

          {/* Title candidates */}
          {showTitleCandidates && (
            <div style={{
              background: '#0d0d0f', border: '1px solid #1e1e24',
              borderRadius: 8, padding: '10px',
              display: 'flex', flexDirection: 'column', gap: 6,
            }}>
              {loadingCandidates ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '8px 0' }}>
                  <Spinner size={12} color="#555" />
                  <span style={{ fontSize: 12, color: '#555' }}>生成备选标题中...</span>
                </div>
              ) : (
                titleCandidates.map((t, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: 8, padding: '7px 10px',
                    background: '#16161a', borderRadius: 6, border: '1px solid #1e1e24',
                  }}>
                    <span style={{ fontSize: 13, color: '#ccc', flex: 1, lineHeight: 1.4 }}>{t}</span>
                    <button
                      onClick={() => selectTitle(t)}
                      style={{
                        flexShrink: 0, padding: '3px 10px', fontSize: 11, borderRadius: 5,
                        background: 'rgba(200,245,90,0.08)', border: '1px solid #c8f55a33',
                        color: '#c8f55a', cursor: 'pointer',
                      }}
                    >
                      用这个
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={() => setShowTitleCandidates(false)}
                style={{
                  alignSelf: 'center', fontSize: 11, color: '#444',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 0',
                }}
              >
                收起
              </button>
            </div>
          )}

          {/* Body */}
          <div style={{
            background: '#16161a', border: '1px solid #1e1e24',
            borderRadius: 8, padding: '10px 12px',
            position: 'relative',
          }}>
            <div style={{ fontSize: 10, color: '#444', marginBottom: 6, letterSpacing: '0.5px' }}>
              正文
            </div>
            <div
              ref={bodyRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => setGeneratedBody(e.currentTarget.textContent)}
              style={{
                fontSize: 13, color: '#888', lineHeight: 1.75,
                outline: 'none', minHeight: 120, maxHeight: 260,
                overflow: 'auto', whiteSpace: 'pre-wrap',
                padding: '1px 3px', borderRadius: 3,
                border: '1px solid transparent', cursor: 'text',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = '#2e2e38')}
              onBlur={e  => (e.currentTarget.style.borderColor = 'transparent')}
            />
            <div style={{
              position: 'absolute', bottom: 8, right: 10,
              fontSize: 10, color: '#2a2a30', pointerEvents: 'none',
            }}>
              {generatedBody.length} 字
            </div>
          </div>

          {/* Undo / refine desc row */}
          {(refineDesc || history.length > 0) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#555', fontStyle: 'italic', flex: 1 }}>
                {refineDesc ? `✎ ${refineDesc}` : ''}
              </span>
              {history.length > 0 && (
                <button
                  onClick={undo}
                  style={{
                    fontSize: 11, color: '#555', background: 'transparent',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                    padding: '2px 4px',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#aaa')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#555')}
                >
                  ↩ 撤销
                </button>
              )}
            </div>
          )}

          {/* Voice refine button / overlay */}
          {!isRefineOpen ? (
            <button
              onClick={() => setIsRefineOpen(true)}
              disabled={isRefineLoading}
              style={{
                width: '100%', padding: '9px 0', borderRadius: 8, fontSize: 13,
                background: 'transparent', border: '1px solid #2a2a30',
                color: '#666', cursor: isRefineLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isRefineLoading) e.currentTarget.style.borderColor = '#555' }}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a30')}
            >
              🎤 语音优化
            </button>
          ) : (
            <div style={{
              background: '#16161a', border: '1px solid #2a2a30',
              borderRadius: 10, padding: '16px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
            }}>
              <p style={{ fontSize: 12, color: '#666', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                按住录音，说出修改要求<br />
                <span style={{ fontSize: 11, color: '#444' }}>
                  例如：「把第二段再详细一点」「标题改得更吸引人」
                </span>
              </p>

              {refineTranscript && (
                <div style={{
                  width: '100%', fontSize: 12, color: '#888', lineHeight: 1.6,
                  background: '#0d0d0f', borderRadius: 6, padding: '7px 10px',
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

              <p style={{ fontSize: 11, color: '#333', margin: 0 }}>
                {isRefineRecording ? '● 录音中，松开发送' : '○ 按住录音'}
              </p>

              <button
                onClick={closeRefine}
                style={{
                  fontSize: 11, color: '#444', background: 'transparent',
                  border: 'none', cursor: 'pointer',
                }}
              >
                取消
              </button>
            </div>
          )}

          {/* Re-record */}
          <button
            onClick={reset}
            style={{
              width: '100%', padding: '7px 0', borderRadius: 6, fontSize: 11,
              background: 'transparent', border: '1px solid #1a1a1e',
              color: '#444', cursor: 'pointer', transition: 'color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#777')}
            onMouseLeave={e => (e.currentTarget.style.color = '#444')}
          >
            重新录音
          </button>
        </>
      )}
    </div>
  )
}
