const BASE = '/api'

export async function fetchTapes() {
  const res = await fetch(`${BASE}/tapes`)
  if (!res.ok) throw new Error('Failed to fetch tapes')
  return res.json()
}

export async function fetchTape(id) {
  const res = await fetch(`${BASE}/tapes/${id}`)
  if (!res.ok) throw new Error('Failed to fetch tape')
  return res.json()
}

export async function createTape({ title, language, audioFile }) {
  const form = new FormData()
  form.append('title', title)
  form.append('language', language)
  form.append('audio', audioFile)

  const res = await fetch(`${BASE}/tapes`, { method: 'POST', body: form })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to create tape')
  }
  return res.json()
}

export async function deleteTape(id) {
  const res = await fetch(`${BASE}/tapes/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete tape')
  return res.json()
}

export function audioUrl(tape) {
  return `${BASE}/audio/${tape.id}`
}
