import { useEffect, useState } from 'react'
import { createEntry, deleteEntry, fetchEntries, fetchEntry, updateEntry } from './api'
import './App.css'

const EMPTY = { title: '', content: '' }

function App() {
  const [view, setView] = useState('landing')
  const [entries, setEntries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [current, setCurrent] = useState(null)
  const [editor, setEditor] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    if (selectedId == null) {
      setCurrent(null)
      setEditor(EMPTY)
      return
    }
    loadEntry(selectedId)
  }, [selectedId])

  useEffect(() => {
    if (!current) return
    if (editor.title === current.title && editor.content === current.content) return

    const id = setTimeout(async () => {
      setSaving(true)
      try {
        const { entry } = await updateEntry(current.id, editor)
        setCurrent(entry)
        setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
        setLastSaved(new Date())
      } finally {
        setSaving(false)
      }
    }, 500)

    return () => clearTimeout(id)
  }, [editor])

  async function loadEntries() {
    setLoading(true)
    try {
      const { entries: list } = await fetchEntries()
      setEntries(list)
      if (list.length > 0 && selectedId == null) {
        setSelectedId(list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  async function loadEntry(id) {
    const { entry } = await fetchEntry(id)
    setCurrent(entry)
    setEditor({ title: entry.title, content: entry.content })
  }

  async function handleCreate() {
    const { entry } = await createEntry({ title: '', content: '' })
    setEntries(prev => [entry, ...prev])
    setSelectedId(entry.id)
  }

  async function handleDelete(id) {
    await deleteEntry(id)
    const remaining = entries.filter(e => e.id !== id)
    setEntries(remaining)
    if (selectedId === id) {
      setSelectedId(remaining.length > 0 ? remaining[0].id : null)
    }
  }

  function handleTitleChange(e) {
    const next = { ...editor, title: e.target.value }
    setEditor(next)
    syncPreview(selectedId, next, setEntries)
  }

  function handleContentChange(e) {
    const next = { ...editor, content: e.target.value }
    setEditor(next)
    syncPreview(selectedId, next, setEntries)
  }

  if (view === 'landing') {
    return (
      <div className="landing">
        <p className="landing-brand">Cosmos</p>
        <h1 className="landing-title">Journal your thoughts<br />with intent</h1>
        <p className="landing-subtitle">
          A calm, distraction-free space to write, reflect, and revisit your thoughts.
        </p>
        <button className="btn btn-primary" onClick={() => setView('app')}>
          Start Writing
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-brand">Cosmos</span>
          <button className="btn btn-primary" onClick={handleCreate}>
            New Note
          </button>
        </div>
        <div className="sidebar-list">
          {loading && entries.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', padding: '12px 14px' }}>
              Loading...
            </p>
          ) : entries.length === 0 ? (
            <p style={{ color: 'var(--ink-soft)', fontSize: '0.9rem', padding: '12px 14px' }}>
              No notes yet. Create one to get started.
            </p>
          ) : (
            entries.map(entry => (
              <button
                key={entry.id}
                className={`entry-item${entry.id === selectedId ? ' active' : ''}`}
                onClick={() => setSelectedId(entry.id)}
              >
                <span className="entry-item-title">{entry.title || 'Untitled Entry'}</span>
                {entry.preview && (
                  <span className="entry-item-preview">{entry.preview}</span>
                )}
                <span className="entry-item-date">{formatDate(entry.updated_at)}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="editor-area">
        <div className="editor-header">
          <span className="editor-meta">
            {current ? formatLongDate(current.updated_at) : ''}
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {current && (
              <button
                className="btn btn-danger"
                onClick={() => handleDelete(current.id)}
              >
                Delete
              </button>
            )}
            <button className="btn btn-ghost" onClick={() => setView('landing')}>
              Back
            </button>
          </div>
        </div>

        <div className="editor-body">
          {!current && !loading ? (
            <div className="empty-state">
              <h2>Select a note or create a new one</h2>
              <p>Your writing space is clean and ready.</p>
              <button className="btn btn-primary" onClick={handleCreate}>
                New Note
              </button>
            </div>
          ) : current ? (
            <div>
              <input
                className="editor-title"
                placeholder="Untitled Entry"
                value={editor.title}
                onChange={handleTitleChange}
                aria-label="Note title"
              />
              <div className="editor-content">
                <textarea
                  placeholder="Start writing..."
                  value={editor.content}
                  onChange={handleContentChange}
                  aria-label="Note content"
                />
              </div>
            </div>
          ) : null}
        </div>

        {saving && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            fontSize: '0.8rem',
            color: 'var(--ink-soft)',
            background: 'var(--surface)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}>
            Saving...
          </div>
        )}
        {!saving && lastSaved && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            right: 20,
            fontSize: '0.8rem',
            color: 'var(--ink-soft)',
            background: 'var(--surface)',
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
          }}>
            Saved {formatTime(lastSaved)}
          </div>
        )}
      </main>
    </div>
  )
}

function formatDate(ts) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(ts))
}

function formatLongDate(ts) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  }).format(new Date(ts))
}

function formatTime(d) {
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(d)
}

function syncPreview(id, ed, setEntries) {
  if (id == null) return
  setEntries(prev => prev.map(e =>
    e.id === id
      ? { ...e, title: ed.title || 'Untitled Entry', preview: buildPreview(ed.content) }
      : e
  ))
}

function buildPreview(content) {
  return content.trim().replace(/\s+/g, ' ').slice(0, 140)
}

export default App
