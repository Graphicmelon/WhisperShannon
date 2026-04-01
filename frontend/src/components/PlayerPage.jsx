import { useState, useEffect, useRef, useCallback } from 'react'
import { audioUrl } from '../api.js'

const SPEEDS = [0.5, 0.75, 1, 1.25]

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(sec) {
  if (!isFinite(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Binary search: find which segment contains `time`, and which word inside it.
 * Returns [segIdx, wordIdx] or [-1, -1] if between segments.
 */
function findCurrentWord(segments, time) {
  // find segment
  let lo = 0, hi = segments.length - 1, si = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    const seg = segments[mid]
    if (time < seg.start - 0.05) { hi = mid - 1 }
    else if (time > seg.end + 0.3)  { lo = mid + 1 }
    else { si = mid; break }
  }
  if (si === -1) return [-1, -1]

  const words = segments[si].words
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi]
    // give each word a small grace window after it ends
    const next = words[wi + 1]
    const effectiveEnd = next ? next.start : w.end + 0.5
    if (time >= w.start - 0.04 && time < effectiveEnd) return [si, wi]
  }
  // inside segment but between word gaps — highlight last word seen
  for (let wi = words.length - 1; wi >= 0; wi--) {
    if (time >= words[wi].start) return [si, wi]
  }
  return [si, 0]
}

// ── component ─────────────────────────────────────────────────────────────────

export default function PlayerPage({ tape, onBack }) {
  const segments = tape.data?.segments ?? []

  const audioRef    = useRef(null)
  const activeRef   = useRef(null)    // ref attached to the active word element
  const transcriptRef = useRef(null)

  const [isPlaying,    setIsPlaying]    = useState(false)
  const [currentTime,  setCurrentTime]  = useState(0)
  const [duration,     setDuration]     = useState(0)
  const [speed,        setSpeed]        = useState(1)
  const [currentWord,  setCurrentWord]  = useState([-1, -1])

  // A-B loop  { a: number|null, b: number|null }
  const [ab, setAb]             = useState({ a: null, b: null })
  const [loopEnabled, setLoopEnabled] = useState(false)

  // ── audio event wiring ─────────────────────────────────────────────────────

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => {
      const t = audio.currentTime
      setCurrentTime(t)
      setCurrentWord(findCurrentWord(segments, t))

      // A-B loop enforcement
      if (loopEnabled && ab.a !== null && ab.b !== null && t >= ab.b) {
        audio.currentTime = ab.a
      }
    }

    const onDurationChange = () => setDuration(audio.duration)
    const onPlay  = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => {
      setIsPlaying(false)
      if (loopEnabled && ab.a !== null) audio.currentTime = ab.a
    }

    audio.addEventListener('timeupdate',     onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('play',           onPlay)
    audio.addEventListener('pause',          onPause)
    audio.addEventListener('ended',          onEnded)

    return () => {
      audio.removeEventListener('timeupdate',     onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('play',           onPlay)
      audio.removeEventListener('pause',          onPause)
      audio.removeEventListener('ended',          onEnded)
    }
  }, [segments, ab, loopEnabled])

  // ── auto-scroll to active word ─────────────────────────────────────────────

  useEffect(() => {
    const el = activeRef.current
    const container = transcriptRef.current
    if (!el || !container) return

    const elRect   = el.getBoundingClientRect()
    const cRect    = container.getBoundingClientRect()
    const isVisible = elRect.top >= cRect.top + 20 && elRect.bottom <= cRect.bottom - 20

    if (!isVisible) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentWord[0], currentWord[1]])

  // ── playback controls ──────────────────────────────────────────────────────

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    isPlaying ? audio.pause() : audio.play()
  }, [isPlaying])

  const seek = useCallback((time) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(time, duration))
  }, [duration])

  const skip = useCallback((delta) => {
    seek(currentTime + delta)
  }, [currentTime, seek])

  const changeSpeed = useCallback((s) => {
    setSpeed(s)
    if (audioRef.current) audioRef.current.playbackRate = s
  }, [])

  // ── progress bar interaction ───────────────────────────────────────────────

  const progressRef = useRef(null)

  function progressFromEvent(e) {
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
    return ratio * duration
  }

  function handleProgressClick(e) {
    seek(progressFromEvent(e))
  }

  function handleProgressMouseDown(e) {
    e.preventDefault()
    const onMove = (ev) => seek(progressFromEvent(ev))
    const onUp   = () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    seek(progressFromEvent(e))
  }

  // ── keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    function onKey(e) {
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
      if (e.key === 'ArrowLeft')  skip(-3)
      if (e.key === 'ArrowRight') skip(3)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [togglePlay, skip])

  // ── A-B helpers ────────────────────────────────────────────────────────────

  function setPointA() { setAb(prev => ({ ...prev, a: currentTime })) }
  function setPointB() { setAb(prev => ({ ...prev, b: currentTime })) }
  function clearAB()   { setAb({ a: null, b: null }); setLoopEnabled(false) }

  const canLoop = ab.a !== null && ab.b !== null && ab.b > ab.a

  // ── render helpers ─────────────────────────────────────────────────────────

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0
  const pctA = duration > 0 && ab.a !== null ? (ab.a / duration) * 100 : null
  const pctB = duration > 0 && ab.b !== null ? (ab.b / duration) * 100 : null

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="player-page">

      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl(tape)} preload="auto" />

      {/* Header */}
      <div className="player-header">
        <button className="btn-icon btn" onClick={onBack} title="返回">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <span className="player-title">{tape.title}</span>
        <LangBadge language={tape.language} />
      </div>

      {/* Audio controls panel */}
      <div className="audio-panel">

        {/* Progress bar */}
        <div className="progress-row">
          <span className="time-label">{fmtTime(currentTime)}</span>

          <div
            ref={progressRef}
            className="progress-wrap"
            onClick={handleProgressClick}
            onMouseDown={handleProgressMouseDown}
          >
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />

              {/* A-B region fill */}
              {pctA !== null && pctB !== null && (
                <div
                  className="ab-fill"
                  style={{ left: `${Math.min(pctA, pctB)}%`, width: `${Math.abs(pctB - pctA)}%` }}
                />
              )}

              {/* A marker */}
              {pctA !== null && (
                <div className="ab-marker ab-marker-a" style={{ left: `${pctA}%` }} />
              )}
              {/* B marker */}
              {pctB !== null && (
                <div className="ab-marker ab-marker-b" style={{ left: `${pctB}%` }} />
              )}

              {/* Playhead thumb */}
              <div className="progress-thumb" style={{ left: `${pct}%` }} />
            </div>
          </div>

          <span className="time-label" style={{ textAlign: 'right' }}>{fmtTime(duration)}</span>
        </div>

        {/* Playback controls row */}
        <div className="controls-row">
          <div className="controls-center">
            {/* -10s */}
            <button className="btn-icon btn" onClick={() => skip(-10)} title="后退 10 秒">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3"/>
                <text x="7.5" y="15.5" fill="currentColor" fontSize="6" stroke="none" fontWeight="bold">10</text>
              </svg>
            </button>

            {/* Play / Pause */}
            <button className="btn-play" onClick={togglePlay} title={isPlaying ? '暂停 (Space)' : '播放 (Space)'}>
              {isPlaying
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              }
            </button>

            {/* +10s */}
            <button className="btn-icon btn" onClick={() => skip(10)} title="前进 10 秒">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-3"/>
                <text x="7.5" y="15.5" fill="currentColor" fontSize="6" stroke="none" fontWeight="bold">10</text>
              </svg>
            </button>
          </div>

          {/* Speed selector */}
          <div className="speed-row">
            <span className="speed-label">速度</span>
            {SPEEDS.map(s => (
              <button
                key={s}
                className={`speed-btn ${speed === s ? 'active' : ''}`}
                onClick={() => changeSpeed(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* A-B loop row */}
        <div className="ab-row">
          <span className="ab-label">A-B 循环</span>

          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '3px 10px' }}
            onClick={setPointA}
            title="标记 A 点（当前位置）"
          >
            设 A
          </button>
          <span className={`ab-time ${ab.a !== null ? 'set-a' : ''}`}>
            A: {ab.a !== null ? fmtTime(ab.a) : '—'}
          </span>

          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.75rem', padding: '3px 10px' }}
            onClick={setPointB}
            title="标记 B 点（当前位置）"
          >
            设 B
          </button>
          <span className={`ab-time ${ab.b !== null ? 'set-b' : ''}`}>
            B: {ab.b !== null ? fmtTime(ab.b) : '—'}
          </span>

          {(ab.a !== null || ab.b !== null) && (
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.75rem', padding: '3px 10px', color: 'var(--danger)' }}
              onClick={clearAB}
            >
              清除
            </button>
          )}

          <button
            className={`btn btn-ghost ab-toggle ${loopEnabled ? 'loop-on' : ''}`}
            style={{ padding: '3px 10px' }}
            disabled={!canLoop}
            onClick={() => setLoopEnabled(v => !v)}
            title={canLoop ? (loopEnabled ? '关闭循环' : '开启 A-B 循环') : '请先设置 A 和 B 点'}
          >
            {loopEnabled ? '🔁 循环中' : '🔁 循环'}
          </button>
        </div>
      </div>

      {/* Transcript */}
      <div ref={transcriptRef} className="transcript-area transcript-font">
        {segments.length === 0 ? (
          <div className="empty" style={{ padding: '40px 0' }}>
            <div className="empty-icon">📄</div>
            <p className="empty-text">暂无逐字稿数据。</p>
          </div>
        ) : (
          segments.map((seg, si) => {
            const isActiveSeg = currentWord[0] === si
            return (
              <div
                key={si}
                className={`segment ${isActiveSeg ? 'active-segment' : ''}`}
                onClick={() => seek(seg.start)}
                title="点击跳转到此句"
              >
                {seg.words.map((w, wi) => {
                  const isActive = isActiveSeg && currentWord[1] === wi
                  return (
                    <span
                      key={wi}
                      ref={isActive ? activeRef : null}
                      className={`word ${isActive ? 'active-word' : ''}`}
                      onClick={(e) => { e.stopPropagation(); seek(w.start) }}
                      title={`${fmtTime(w.start)} → ${fmtTime(w.end)}`}
                    >
                      {w.word}
                      {wi < seg.words.length - 1 ? ' ' : ''}
                    </span>
                  )
                })}
              </div>
            )
          })
        )}
        {/* bottom padding so last line scrolls into view comfortably */}
        <div style={{ height: 60 }} />
      </div>

    </div>
  )
}

function LangBadge({ language }) {
  const flags = { fr: '🇫🇷', es: '🇪🇸', en: '🇬🇧', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹' }
  const names = { fr: 'FR', es: 'ES', en: 'EN', de: 'DE', it: 'IT', pt: 'PT' }
  return (
    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
      {flags[language] || ''} {names[language] || language.toUpperCase()}
    </span>
  )
}
