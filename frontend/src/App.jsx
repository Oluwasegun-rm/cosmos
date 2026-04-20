import { useEffect, useState, useRef } from 'react'
import { createEntry, deleteEntry, fetchEntries, fetchEntry, updateEntry } from './api'
import './App.css'

const EMPTY = { title: '', content: '' }

function useTypingAnimation(text, speed = 80, startDelay = 500) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const hasStarted = useRef(false)

  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    const timeout = setTimeout(() => {
      setIsTyping(true)
      let index = 0
      
      const interval = setInterval(() => {
        if (index <= text.length) {
          setDisplayedText(text.slice(0, index))
          index++
        } else {
          setIsTyping(false)
          clearInterval(interval)
        }
      }, speed)

      return () => clearInterval(interval)
    }, startDelay)

    return () => clearTimeout(timeout)
  }, [text, speed, startDelay])

  return { displayedText, isTyping }
}

const NAV_ITEMS = [
  { id: 'journal', label: 'Journal', icon: 'auto_stories' },
  { id: 'reflections', label: 'Reflections', icon: 'self_improvement' },
  { id: 'universe', label: 'Universe', icon: 'public' },
  { id: 'archive', label: 'Archive', icon: 'inventory_2' },
]

const SECTIONS = {
  journal: 'Journal',
  reflections: 'Reflections',
  universe: 'Universe',
  archive: 'Archive',
}

function App() {
  const [view, setView] = useState('landing')
  const [currentSection, setCurrentSection] = useState('journal')
  const [entries, setEntries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [current, setCurrent] = useState(null)
  const [editor, setEditor] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSupport, setShowSupport] = useState(false)

  const titleLine1 = useTypingAnimation('Journal your thoughts', 85, 800)
  const titleLine2 = useTypingAnimation('with intent', 85, titleLine1.isTyping ? 0 : 200)

  useEffect(() => {
    loadEntries()
  }, [])

  useEffect(() => {
    setSelectedId(null)
    setCurrent(null)
    setEditor(EMPTY)
    loadEntries()
  }, [currentSection])

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
      const { entries: list } = await fetchEntries(currentSection)
      setEntries(list)
      if (list.length > 0 && selectedId == null) {
        setSelectedId(list[0].id)
      } else if (list.length === 0) {
        setSelectedId(null)
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
    const { entry } = await createEntry({ title: '', content: '', category: currentSection })
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
        <h1 className="landing-title">
          {titleLine1.displayedText}
          <br />
          {titleLine2.displayedText}
          <span className={`typing-cursor ${titleLine2.isTyping || (!titleLine1.isTyping && !titleLine2.isTyping) ? 'visible' : ''}`}>|</span>
        </h1>
        <p className="landing-subtitle" style={{ opacity: titleLine2.isTyping ? 1 : 0, transition: 'opacity 0.8s ease-in-out' }}>
          A calm, distraction-free space to write, reflect, and revisit your thoughts.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => setView('app')}
          style={{ opacity: titleLine2.isTyping ? 1 : 0, transform: titleLine2.isTyping ? 'translateY(0)' : 'translateY(10px)', transition: 'opacity 0.6s ease-in-out, transform 0.6s ease-in-out' }}
        >
          Start Writing
        </button>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <h1 className="sidebar-brand">Cosmos</h1>
          <p className="sidebar-tagline">The Digital Sanctuary</p>
        </div>
        
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentSection === item.id ? 'active' : ''}`}
              onClick={() => setCurrentSection(item.id)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="sidebar-new-btn" onClick={handleCreate}>
          <span className="material-symbols-outlined">add</span>
          New Entry
        </button>

        <div className="sidebar-footer">
          <button className="footer-link" onClick={() => setShowSettings(true)}>
            <span className="material-symbols-outlined">settings</span>
            <span>Settings</span>
          </button>
          <button className="footer-link" onClick={() => setShowSupport(true)}>
            <span className="material-symbols-outlined">help_outline</span>
            <span>Support</span>
          </button>
        </div>
      </aside>

      <section className="entry-list-panel">
        <div className="entry-list-header">
          <span className="entry-list-label">{SECTIONS[currentSection] || 'All Entries'}</span>
        </div>
        <div className="entry-list">
          {loading && entries.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', padding: '12px 14px' }}>
              Loading...
            </p>
          ) : entries.length === 0 ? (
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', padding: '12px 14px' }}>
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
      </section>

      <main className="editor-area">
        <header className="editor-header">
          <div className="editor-meta">
            <span className="editor-meta-status">Sanctuary Mode</span>
            <span className="editor-meta-dot"></span>
            <span className="editor-meta-saving">
              {saving ? 'Saving...' : lastSaved ? `Saved ${formatTime(lastSaved)}` : ''}
            </span>
          </div>
          <div className="editor-actions">
            <button title="Share">
              <span className="material-symbols-outlined">share</span>
            </button>
            <button title="More">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
            {current && (
              <button title="Delete" onClick={() => handleDelete(current.id)}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            <div className="editor-user-avatar">
              <img alt="User profile" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDJpMrasblxLNYbPGm1HN4Z717CM9LYavdVURDhQMnVqEbptyqQZPBFmg0H55qfDHS4Q5zYbHbvOtQq39ZxESO_pqECimcV-WLqZTYRcYk0IDULKnffnT8m3K9jf9NBu2OYusCCpqKkOONw_2A63ZizZYT1d-8_O5bgxDoH0gbdDDGAO2sfc7udLIBmi1nnCrbB7TivqsWSOROlSZgkEoET5StWSPhDupTdul5h3L7iyoBlGtIldFy3q_x_nMJabHANii3FTiIF24Ek" />
            </div>
          </div>
        </header>

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
            <div className="editor-canvas">
              <p className="editor-date">{formatLongDate(current.updated_at)}</p>
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
      </main>

      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Settings</h2>
              <button className="modal-close" onClick={() => setShowSettings(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="settings-section">
                <h3>Appearance</h3>
                <p>Theme customization coming soon.</p>
              </div>
              <div className="settings-section">
                <h3>Data</h3>
                <p>Your journal entries are stored locally.</p>
              </div>
              <div className="settings-section">
                <h3>About</h3>
                <p>Cosmos v1.0.0</p>
                <p className="text-muted">A calm space for your thoughts.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSupport && (
        <div className="modal-overlay" onClick={() => setShowSupport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Support</h2>
              <button className="modal-close" onClick={() => setShowSupport(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="support-section">
                <h3>Getting Started</h3>
                <p>Use the sidebar to navigate between sections. Click "New Entry" to start writing.</p>
              </div>
              <div className="support-section">
                <h3>Tips</h3>
                <ul>
                  <li>Your entries auto-save as you type</li>
                  <li>Use the category buttons to organize entries</li>
                  <li>Delete entries using the trash icon in the editor</li>
                </ul>
              </div>
              <div className="support-section">
                <h3>Contact</h3>
                <p>For feedback or issues, reach out to the development team.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDate(ts) {
  const now = new Date()
  const then = new Date(ts)
  const diffDays = Math.floor((now - then) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Just Now'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} Days Ago`
  
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
    .format(then)
}

function formatLongDate(ts) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
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