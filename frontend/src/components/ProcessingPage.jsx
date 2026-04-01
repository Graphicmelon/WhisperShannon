import { useEffect, useState } from 'react'
import { fetchTape } from '../api.js'

export default function ProcessingPage({ tape, onDone, onError }) {
  const [elapsed, setElapsed] = useState(0)
  const [statusMsg, setStatusMsg] = useState('正在准备…')

  // Tick elapsed seconds
  useEffect(() => {
    const id = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Update status hint based on elapsed time
  useEffect(() => {
    const msgs = [
      [0,  '正在加载 WhisperX 模型…'],
      [15, '正在转录音频…'],
      [40, '正在对齐词语时间戳…'],
      [90, '即将完成，请稍候…'],
    ]
    let msg = msgs[0][1]
    for (const [t, m] of msgs) {
      if (elapsed >= t) msg = m
    }
    setStatusMsg(msg)
  }, [elapsed])

  // Poll status
  useEffect(() => {
    let active = true

    async function poll() {
      while (active) {
        await sleep(2000)
        if (!active) break
        try {
          const updated = await fetchTape(tape.id)
          if (updated.status === 'ready') {
            active = false
            onDone(updated)
            return
          }
          if (updated.status === 'error') {
            active = false
            alert(`分析失败：${updated.error || '未知错误'}`)
            onError()
            return
          }
        } catch {
          // network hiccup — keep polling
        }
      }
    }

    poll()
    return () => { active = false }
  }, [tape.id])

  function fmtElapsed(s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}分 ${sec}秒` : `${sec} 秒`
  }

  return (
    <div className="page">
      <div className="processing-center">
        <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
        <div className="processing-title">正在分析：{tape.title}</div>
        <div className="processing-sub">{statusMsg}</div>
        <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 4 }}>
          已用时 {fmtElapsed(elapsed)}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 20, maxWidth: 340, lineHeight: 1.6 }}>
          WhisperX 需要下载并加载语音模型，首次运行可能需要几分钟。
        </div>
      </div>
    </div>
  )
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
