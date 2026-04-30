import { useEffect, useState } from 'react'
import { createEntry, deleteEntry, fetchEntries, fetchEntry, generateInsights, getInsights, login as apiLogin, logout as apiLogout, signup as apiSignup, updateEntry, getCurrentUser } from './api'
import AuthModal from './components/AuthModal'
import TagsEditor from './components/TagsEditor'
import './App.css'

const EMPTY = { title: '', content: '' }

function getStoredTheme() {
  return localStorage.getItem('cosmos-theme') || 'light'
}

function setStoredTheme(theme) {
  localStorage.setItem('cosmos-theme', theme)
}

function useTypingAnimation(text, speed = 80, startDelay = 500) {
  const [displayedText, setDisplayedText] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    let timeout
    let interval
    
    const startTyping = () => {
      setDisplayedText('')
      setIsTyping(true)
      let index = 0
      
      interval = setInterval(() => {
        if (index < text.length) {
          setDisplayedText(text.slice(0, index + 1))
          index++
        } else {
          setIsTyping(false)
          clearInterval(interval)
        }
      }, speed)
    }
    
    timeout = setTimeout(startTyping, startDelay)
    
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [text, speed, startDelay])

  return { displayedText, isTyping }
}

function ThemeProvider({ children, theme }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return children
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
  const [theme, setTheme] = useState(getStoredTheme)
  const [currentSection, setCurrentSection] = useState('journal')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [entryListOpen, setEntryListOpen] = useState(true)
  const [entries, setEntries] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [current, setCurrent] = useState(null)
  const [editor, setEditor] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showInsights, setShowInsights] = useState(false)
  const [insightsData, setInsightsData] = useState(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [stats, setStats] = useState({ total: 0, journal: 0, reflections: 0, universe: 0, archive: 0 })
  const [editorFontSize, setEditorFontSize] = useState(() => Number(localStorage.getItem('cosmos-editor-font') || 1.1))
  const [editorLineHeight, setEditorLineHeight] = useState(() => Number(localStorage.getItem('cosmos-editor-line') || 1.8))
  const [editorFontFamily, setEditorFontFamily] = useState(() => localStorage.getItem('cosmos-editor-font-family') || 'sans')
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    loadEntries()
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-font-size', `${editorFontSize}rem`)
    document.documentElement.style.setProperty('--editor-line-height', `${editorLineHeight}`)
    const familyMap = {
      sans: 'Inter, -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
      serif: 'Georgia, Cambria, "Times New Roman", Times, serif',
      mono: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    }
    document.documentElement.style.setProperty('--editor-font-family', familyMap[editorFontFamily] || familyMap.sans)
    localStorage.setItem('cosmos-editor-font', String(editorFontSize))
    localStorage.setItem('cosmos-editor-line', String(editorLineHeight))
    localStorage.setItem('cosmos-editor-font-family', editorFontFamily)
  }, [editorFontSize, editorLineHeight, editorFontFamily])

  async function checkAuth() {
    try {
      const { user: u } = await getCurrentUser()
      setUser(u)
    } catch (err) {
      setUser(null)
    }
  }

  useEffect(() => {
    setSelectedId(null)
    setCurrent(null)
    setEditor(EMPTY)
    loadEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (
      editor.title === current.title &&
      editor.content === current.content &&
      (JSON.stringify(editor.tags || []) === JSON.stringify(current.tags || []))
    ) return

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        if (view === 'app') handleCreate()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault()
        document.querySelector('.search-input')?.focus()
      }
      if (e.key === 'Escape') {
        setShowSettings(false)
        setShowSupport(false)
        setShowDeleteConfirm(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view])

  async function loadEntries() {
    setLoading(true)
    try {
      const { entries: list } = await fetchEntries(currentSection, tagFilter || null)
      const { entries: all } = await fetchEntries()
      setEntries(list)
      
      const newStats = {
        total: all.length,
        journal: all.filter(e => e.category === 'journal').length,
        reflections: all.filter(e => e.category === 'reflections').length,
        universe: all.filter(e => e.category === 'universe').length,
        archive: all.filter(e => e.category === 'archive').length,
      }
      setStats(newStats)
      
      if (list.length > 0 && selectedId == null) {
        setSelectedId(list[0].id)
      } else if (list.length === 0) {
        setSelectedId(null)
      }
    } catch (err) {
      console.error('Failed to load entries:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadEntry(id) {
    try {
      const { entry } = await fetchEntry(id)
      setCurrent(entry)
      setEditor({ title: entry.title, content: entry.content, category: entry.category, tags: entry.tags || [] })
    } catch (err) {
      console.error('Failed to load entry:', err)
      setSelectedId(null)
    }
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

  async function handleGetInsights() {
    if (!current) return
    setInsightsLoading(true)
    try {
      const data = await generateInsights(current.id)
      setInsightsData(data.insights)
    } catch (err) {
      console.error('Failed to get insights:', err)
    } finally {
      setInsightsLoading(false)
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

  async function handleCategoryChange(category) {
    if (!current) return
    try {
      setSaving(true)
      const { entry } = await updateEntry(current.id, { title: editor.title, content: editor.content, category })
      setCurrent(entry)
      setEditor(prev => ({ ...prev, category }))
      setEntries(prev => prev.map(e => e.id === entry.id ? entry : e))
      setLastSaved(new Date())
    } catch (err) {
      console.error('Failed to update category:', err)
    } finally {
      setSaving(false)
    }
  }

  function getFilteredEntries() {
    if (!searchQuery.trim()) return entries
    const query = searchQuery.toLowerCase()
    return entries.filter(e => 
      e.title.toLowerCase().includes(query) || 
      (e.preview && e.preview.toLowerCase().includes(query))
    )
  }

  async function handleExportEntry() {
    if (!current) return
    const content = `# ${current.title || 'Untitled Entry'}\n\n${editor.content}`
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${current.title || 'untitled'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleArchiveEntry() {
    if (!current) return
    const newCategory = current.category === 'archive' ? 'journal' : 'archive'
    await handleCategoryChange(newCategory)
  }

  if (view === 'landing') {
    return (
      <ThemeProvider theme={theme}>
      <div className="landing">
        <header className="landing-header">
          <span className="landing-logo">Cosmos</span>
          <div className="landing-auth">
            {user ? (
              <>
                <span className="user-greeting">Hi, {user.display_name}</span>
                <button className="btn btn-link-sm" onClick={async () => { await apiLogout(); setUser(null) }}>Log out</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost-sm" onClick={() => setShowLogin(true)}>Log in</button>
                <button className="btn btn-primary-sm" onClick={() => setShowSignup(true)}>Sign up</button>
              </>
            )}
          </div>
        </header>
        
        <div className="landing-content">
          <h1 className="landing-title">Journal your thoughts with intent</h1>
          <p className="landing-subtitle">A calm space to write, reflect, and revisit your thoughts.</p>
          <button className="btn btn-primary-lg" onClick={() => setView('app')}>
            Start Writing
          </button>
        </div>

        {showLogin && <AuthModal type="login" onClose={() => setShowLogin(false)} onSwitch={() => { setShowLogin(false); setShowSignup(true) }} onAuthSuccess={checkAuth} />}
        {showSignup && <AuthModal type="signup" onClose={() => setShowSignup(false)} onSwitch={() => { setShowSignup(false); setShowLogin(true) }} onAuthSuccess={checkAuth} />}
      </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider theme={theme}>
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div className="sidebar-header">
          {!sidebarOpen && (
            <>
              <span className="sidebar-brand-collapsed">C</span>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Open sidebar">
                <span className="material-symbols-outlined">menu</span>
              </button>
            </>
          )}
          {sidebarOpen && (
            <>
              <h1 className="sidebar-brand">Cosmos</h1>
              <p className="sidebar-tagline">The Digital Sanctuary</p>
              <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} title="Close sidebar">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
            </>
          )}
        </div>
        
        {sidebarOpen ? (
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
        ) : (
          <nav className="sidebar-nav collapsed">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                className={`nav-item-icon ${currentSection === item.id ? 'active' : ''}`}
                onClick={() => setCurrentSection(item.id)}
                title={item.label}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
              </button>
            ))}
          </nav>
        )}

        <button className="sidebar-new-btn" onClick={handleCreate}>
          <span className="material-symbols-outlined">add</span>
          {sidebarOpen && <span>New Entry</span>}
        </button>

        <div className="sidebar-footer">
          <button className="footer-link" onClick={() => setShowSettings(true)} title="Settings">
            <span className="material-symbols-outlined">settings</span>
            {sidebarOpen && <span>Settings</span>}
          </button>
          <button className="footer-link" onClick={() => setShowSupport(true)} title="Support">
            <span className="material-symbols-outlined">help_outline</span>
            {sidebarOpen && <span>Support</span>}
          </button>
        </div>
      </aside>

      <section className="entry-list-panel">
        <div className="entry-list-header">
          <span className="entry-list-label">{SECTIONS[currentSection] || 'All Entries'}</span>
        </div>
        <div className="search-container">
          <span className="material-symbols-outlined search-icon">search</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <input
            type="text"
            className="search-input"
            style={{ marginLeft: 8 }}
            placeholder="Filter by tag..."
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadEntries() }}
          />
          {searchQuery && (
            <button className="search-clear" onClick={() => setSearchQuery('')}>
              <span className="material-symbols-outlined">close</span>
            </button>
          )}
        </div>
        <div className="entry-list">
          {loading ? (
            <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', padding: '12px 14px' }}>
              Loading...
            </p>
          ) : getFilteredEntries().length === 0 ? (
            searchQuery ? (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', padding: '12px 14px' }}>
                No entries match your search.
              </p>
            ) : (
              <p style={{ color: 'var(--on-surface-variant)', fontSize: '0.9rem', padding: '12px 14px' }}>
                No notes yet. Create one to get started.
              </p>
            )
          ) : (
            getFilteredEntries().map(entry => (
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
            <span className="editor-meta-saving">
              {saving ? 'Saving...' : lastSaved ? `Saved ${formatTime(lastSaved)}` : ''}
            </span>
          </div>
          <div className="editor-actions">
            {current && (
              <>
                <button title="Export as Markdown" onClick={handleExportEntry}>
                  <span className="material-symbols-outlined">download</span>
                </button>
                <button title="Get AI Insights" onClick={async () => { if (current) { await handleGetInsights(); setShowInsights(true) }}}>
                  <span className="material-symbols-outlined">auto_awesome</span>
                </button>
                <button 
                  title={current.category === 'archive' ? 'Unarchive' : 'Archive'} 
                  onClick={handleArchiveEntry}
                >
                  <span className="material-symbols-outlined">{current.category === 'archive' ? 'unarchive' : 'archive'}</span>
                </button>
              </>
            )}
            {current && (
              <button title="Delete" onClick={() => setShowDeleteConfirm(true)}>
                <span className="material-symbols-outlined">delete</span>
              </button>
            )}
            {user ? (
              <div className="user-actions">
                <button className="user-menu-btn" onClick={() => setShowSettings(true)}>
                  <span className="user-avatar">{user.display_name.charAt(0).toUpperCase()}</span>
                  <span className="user-name">{user.display_name}</span>
                  <span className="material-symbols-outlined">expand_more</span>
                </button>
                <button
                  title="Log out"
                  className="btn btn-ghost btn-sm logout-btn"
                  onClick={async () => { await apiLogout(); setUser(null) }}
                >
                  Log out
                </button>
              </div>
            ) : (
              <div className="auth-buttons">
                <button className="btn btn-ghost btn-sm" onClick={() => setShowLogin(true)}>Log in</button>
                <button className="btn btn-primary btn-sm" onClick={() => setShowSignup(true)}>Sign up</button>
              </div>
            )}
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
              <TagsEditor tags={editor.tags || []} onChange={(next) => setEditor(prev => ({ ...prev, tags: next }))} />
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
                <div className="theme-toggle">
                  <button 
                    className={`theme-btn ${theme === 'light' ? 'active' : ''}`}
                    onClick={() => { setTheme('light'); setStoredTheme('light') }}
                  >
                    <span className="material-symbols-outlined">light_mode</span>
                    Light
                  </button>
                  <button 
                    className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}
                    onClick={() => { setTheme('dark'); setStoredTheme('dark') }}
                  >
                    <span className="material-symbols-outlined">dark_mode</span>
                    Dark
                  </button>
                </div>
              </div>
              <div className="settings-section">
                <h3>Editor Appearance</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 110 }}>Font size</span>
                    <input
                      type="range"
                      min="1.0"
                      max="1.6"
                      step="0.05"
                      value={editorFontSize}
                      onChange={(e) => setEditorFontSize(Number(e.target.value))}
                    />
                    <span>{editorFontSize.toFixed(2)}rem</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ minWidth: 110 }}>Line height</span>
                    <input
                      type="range"
                      min="1.4"
                      max="2.2"
                      step="0.05"
                      value={editorLineHeight}
                      onChange={(e) => setEditorLineHeight(Number(e.target.value))}
                    />
                    <span>{editorLineHeight.toFixed(2)}</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button
                    className={`theme-btn ${editorFontFamily === 'sans' ? 'active' : ''}`}
                    onClick={() => setEditorFontFamily('sans')}
                  >
                    Sans
                  </button>
                  <button
                    className={`theme-btn ${editorFontFamily === 'serif' ? 'active' : ''}`}
                    onClick={() => setEditorFontFamily('serif')}
                  >
                    Serif
                  </button>
                  <button
                    className={`theme-btn ${editorFontFamily === 'mono' ? 'active' : ''}`}
                    onClick={() => setEditorFontFamily('mono')}
                  >
                    Mono
                  </button>
                </div>
              </div>
              {user && (
                <div className="settings-section">
                  <h3>Account</h3>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{user.display_name}</p>
                      <p style={{ margin: 0, color: 'var(--on-surface-variant)', fontSize: '0.9rem' }}>{user.email}</p>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={async () => { await apiLogout(); setUser(null); setShowSettings(false) }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
              <div className="settings-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.journal}</span>
                    <span className="stat-label">Journal</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.reflections}</span>
                    <span className="stat-label">Reflections</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.universe}</span>
                    <span className="stat-label">Universe</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">{stats.archive}</span>
                    <span className="stat-label">Archive</span>
                  </div>
                </div>
              </div>
              <div className="settings-section">
                <h3>Data</h3>
                <p>Your journal entries are stored securely on your device.</p>
                <p className="text-muted">All data is stored locally. Use the export feature to backup your entries.</p>
              </div>
              <div className="settings-section">
                <h3>Keyboard Shortcuts</h3>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <span className="shortcut-key">⌘ N</span>
                    <span>New Entry</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">⌘ F</span>
                    <span>Search</span>
                  </div>
                  <div className="shortcut-item">
                    <span className="shortcut-key">Esc</span>
                    <span>Close Modal</span>
                  </div>
                </div>
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

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Entry</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this entry? This action cannot be undone.</p>
              <div className="modal-actions">
                <button className="btn" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                <button className="delete-confirm-btn" onClick={() => { handleDelete(current.id); setShowDeleteConfirm(false) }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInsights && (
        <div className="modal-overlay" onClick={() => setShowInsights(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>AI Insights</h2>
              <button className="modal-close" onClick={() => setShowInsights(false)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="modal-body">
              {insightsLoading ? (
                <p className="insights-loading">Analyzing your entry...</p>
              ) : insightsData ? (
                <div className="insights-content">
                  <div className="insights-section">
                    <h4>Summary</h4>
                    <p>{insightsData.summary}</p>
                  </div>
                  <div className="insights-section">
                    <h4>Mood</h4>
                    <p>{insightsData.mood}</p>
                  </div>
                  <div className="insights-section">
                    <h4>Sentiment</h4>
                    <p>{insightsData.sentiment}</p>
                  </div>
                  {insightsData.themes && insightsData.themes.length > 0 && (
                    <div className="insights-section">
                      <h4>Themes</h4>
                      <div className="insights-tags">
                        {insightsData.themes.map((theme, i) => (
                          <span key={i} className="insight-tag">{theme}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="insights-empty">No insights available. Click the AI button to generate insights.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {showLogin && <AuthModal type="login" onClose={() => setShowLogin(false)} onSwitch={() => { setShowLogin(false); setShowSignup(true) }} onAuthSuccess={checkAuth} />}
        {showSignup && <AuthModal type="signup" onClose={() => setShowSignup(false)} onSwitch={() => { setShowSignup(false); setShowLogin(true) }} onAuthSuccess={checkAuth} />}
      </div>
    </ThemeProvider>
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

function TagsEditor({ tags, onChange }) {
  const [input, setInput] = useState('')

  function addTagFromInput() {
    const t = input.trim()
    if (!t) return
    const next = Array.from(new Set([...(tags || []), t]))
    onChange(next)
    setInput('')
  }

  function removeTag(tag) {
    onChange((tags || []).filter(t => t !== tag))
  }

  return (
    <div className="tags-editor">
      <div className="tags-list">
        {(tags || []).map(tag => (
          <span key={tag} className="tag-chip">
            {tag}
            <button onClick={() => removeTag(tag)} aria-label={`Remove ${tag}`}>
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              addTagFromInput()
            }
            if (e.key === 'Backspace' && !input && (tags || []).length > 0) {
              removeTag(tags[tags.length - 1])
            }
          }}
          placeholder="Add tag"
        />
      </div>
    </div>
  )
}

export default App
