import { useState, useEffect } from 'react'
import { fetchTapes, deleteTape, fetchTape } from '../api.js'

const LANG_LABEL = { fr: '🇫🇷 法语', es: '🇪🇸 西班牙语', en: '🇬🇧 英语', de: '🇩🇪 德语', it: '🇮🇹 意大利语', pt: '🇵🇹 葡萄牙语' }

function fmtDate(iso) {
  const d = new Date(iso)
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function HomePage({ onNew, onOpen }) {
  const [tapes, setTapes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadTapes()
  }, [])

  async function loadTapes() {
    try {
      setLoading(true)
      const list = await fetchTapes()
      setTapes(list.reverse()) // newest first
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen(tape) {
    if (tape.status !== 'ready') return
    try {
      const full = await fetchTape(tape.id)
      onOpen(full)
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(e, tape) {
    e.stopPropagation()
    if (!confirm(`删除「${tape.title}」？此操作不可撤销。`)) return
    try {
      await deleteTape(tape.id)
      setTapes(prev => prev.filter(t => t.id !== tape.id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="logo">Whisper<span>Shannon</span></h1>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-primary" onClick={onNew}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
            新建磁带
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : tapes.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📼</div>
          <p className="empty-text">还没有磁带。导入一段音频开始学习。</p>
          <button className="btn btn-primary" onClick={onNew}>新建第一个磁带</button>
        </div>
      ) : (
        <div className="tape-list">
          {tapes.map(tape => (
            <div
              key={tape.id}
              className="tape-item"
              onClick={() => handleOpen(tape)}
              style={{ cursor: tape.status === 'ready' ? 'pointer' : 'default' }}
            >
              <div className="tape-item-icon">
                {tape.status === 'processing' ? '⏳' : tape.status === 'error' ? '❌' : '📼'}
              </div>
              <div className="tape-item-body">
                <div className="tape-item-title">{tape.title}</div>
                <div className="tape-item-meta">
                  <span className={`badge badge-${tape.status}`}>
                    {tape.status === 'ready' ? '就绪' : tape.status === 'processing' ? '分析中' : '出错'}
                  </span>
                  <span>{LANG_LABEL[tape.language] || tape.language}</span>
                  <span>{fmtDate(tape.created_at)}</span>
                </div>
                {tape.status === 'error' && tape.error && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--danger)', marginTop: 4 }}>{tape.error}</div>
                )}
              </div>
              <div className="tape-item-actions">
                <button
                  className="btn-icon btn btn-danger"
                  title="删除"
                  onClick={(e) => handleDelete(e, tape)}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
