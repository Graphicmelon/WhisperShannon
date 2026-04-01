import { useState, useRef } from 'react'
import { createTape } from '../api.js'

const LANGUAGES = [
  { value: 'fr', label: '法语 (Français)' },
  { value: 'es', label: '西班牙语 (Español)' },
  { value: 'en', label: '英语 (English)' },
  { value: 'de', label: '德语 (Deutsch)' },
  { value: 'it', label: '意大利语 (Italiano)' },
  { value: 'pt', label: '葡萄牙语 (Português)' },
]

const ACCEPTED_AUDIO = 'audio/mpeg,audio/wav,audio/ogg,audio/flac,audio/mp4,audio/x-m4a,.mp3,.wav,.ogg,.flac,.m4a,.aac'

export default function NewTapePage({ onBack, onCreated }) {
  const [title, setTitle] = useState('')
  const [language, setLanguage] = useState('fr')
  const [audioFile, setAudioFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('audio/')) {
      setAudioFile(file)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (file) {
      setAudioFile(file)
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!audioFile) { setError('请选择音频文件'); return }

    setError(null)
    setSubmitting(true)
    try {
      const tape = await createTape({ title: title || audioFile.name, language, audioFile })
      onCreated(tape)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 560 }}>
      <div className="page-header">
        <button className="btn btn-ghost" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          返回
        </button>
        <h2 className="page-title">新建磁带</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Audio file */}
        <div className="field">
          <label>音频文件</label>
          <div
            className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED_AUDIO}
              onChange={handleFileChange}
            />
            {audioFile ? (
              <div className="drop-zone-file">
                <span>🎵 </span>
                <strong>{audioFile.name}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                  ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)
                </span>
              </div>
            ) : (
              <div className="drop-zone-label">
                <strong>点击选择</strong>或拖拽音频文件到这里
                <br />
                <span style={{ fontSize: '0.78rem', marginTop: 4, display: 'block' }}>
                  支持 MP3、WAV、FLAC、M4A、AAC 等格式
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="field">
          <label>标题</label>
          <input
            type="text"
            placeholder="例如：Leçon 3 — La famille"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>

        {/* Language */}
        <div className="field">
          <label>语言</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button type="button" className="btn btn-ghost" onClick={onBack}>取消</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? (
              <><div className="spinner" style={{ width: 14, height: 14 }} /> 上传中…</>
            ) : '开始分析'}
          </button>
        </div>
      </form>
    </div>
  )
}
