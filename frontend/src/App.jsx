import { useEffect, useRef, useState } from 'react'
import {
  createEntry,
  fetchEntries,
  fetchEntry,
  fetchInsights,
  generateInsights,
  updateEntry,
} from './api'
import './App.css'

const EMPTY_EDITOR = {
  title: '',
  content: '',
}

const EMPTY_INSIGHTS_STATE = {
  status: 'idle',
  insights: null,
  message: '',
}

const DISPLAY_NAME_KEY = 'cosmos.displayName'
const HERO_COPY = 'Journal your thoughts with intent'

function App() {
  const [entries, setEntries] = useState([])
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [currentEntry, setCurrentEntry] = useState(null)
  const [editor, setEditor] = useState(EMPTY_EDITOR)
  const [displayName, setDisplayName] = useState(
    () => window.localStorage.getItem(DISPLAY_NAME_KEY) || ''
  )
  const [hasEnteredWorkspace, setHasEnteredWorkspace] = useState(false)
  const [typedHeroText, setTypedHeroText] = useState('')
  const [isLoadingEntries, setIsLoadingEntries] = useState(true)
  const [isLoadingEntry, setIsLoadingEntry] = useState(false)
  const [isCreatingEntry, setIsCreatingEntry] = useState(false)
  const [entriesError, setEntriesError] = useState('')
  const [saveState, setSaveState] = useState('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [focusMode, setFocusMode] = useState(false)
  const [insightsState, setInsightsState] = useState(EMPTY_INSIGHTS_STATE)
  const selectedEntryIdRef = useRef(null)
  const hydratedEditorRef = useRef(false)

  useEffect(() => {
    selectedEntryIdRef.current = selectedEntryId
  }, [selectedEntryId])

  useEffect(() => {
    const nextName = displayName.trim()

    if (nextName) {
      window.localStorage.setItem(DISPLAY_NAME_KEY, nextName)
      return
    }

    window.localStorage.removeItem(DISPLAY_NAME_KEY)
  }, [displayName])

  useEffect(() => {
    const fullText = `${HERO_COPY}.`
    let index = 0
    setTypedHeroText('')

    const intervalId = window.setInterval(() => {
      index += 1
      setTypedHeroText(fullText.slice(0, index))

      if (index >= fullText.length) {
        window.clearInterval(intervalId)
      }
    }, 58)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadEntries() {
      setIsLoadingEntries(true)
      setEntriesError('')

      try {
        const payload = await fetchEntries()
        if (!isActive) {
          return
        }

        setEntries(payload.entries)
        setSelectedEntryId((currentId) => currentId ?? payload.entries[0]?.id ?? null)
      } catch (error) {
        if (!isActive) {
          return
        }

        setEntriesError(error.message)
      } finally {
        if (isActive) {
          setIsLoadingEntries(false)
        }
      }
    }

    loadEntries()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (selectedEntryId == null) {
      setCurrentEntry(null)
      setEditor(EMPTY_EDITOR)
      setInsightsState(EMPTY_INSIGHTS_STATE)
      setSaveState('idle')
      setSaveMessage('')
      return
    }

    let isActive = true

    async function loadSelectedEntry() {
      setIsLoadingEntry(true)
      setEntriesError('')
      setInsightsState({
        status: 'loading',
        insights: null,
        message: '',
      })

      try {
        const [entryPayload, insightPayload] = await Promise.all([
          fetchEntry(selectedEntryId),
          fetchInsights(selectedEntryId),
        ])

        if (!isActive) {
          return
        }

        hydratedEditorRef.current = true
        setCurrentEntry(entryPayload.entry)
        setEditor({
          title: entryPayload.entry.title,
          content: entryPayload.entry.content,
        })
        setInsightsState(normalizeInsightsState(insightPayload))
        setSaveState('idle')
        setSaveMessage('')
      } catch (error) {
        if (!isActive) {
          return
        }

        setEntriesError(error.message)
      } finally {
        if (isActive) {
          setIsLoadingEntry(false)
        }
      }
    }

    loadSelectedEntry()

    return () => {
      isActive = false
    }
  }, [selectedEntryId])

  useEffect(() => {
    if (!currentEntry) {
      return
    }

    if (hydratedEditorRef.current) {
      hydratedEditorRef.current = false
      return
    }

    const hasChanges =
      editor.title !== currentEntry.title || editor.content !== currentEntry.content

    if (!hasChanges) {
      return
    }

    const timeoutId = window.setTimeout(async () => {
      setSaveState('saving')
      setSaveMessage('Saving note...')

      try {
        const payload = await updateEntry(currentEntry.id, editor)
        const nextEntry = payload.entry

        setEntries((existingEntries) =>
          existingEntries.map((entry) =>
            entry.id === nextEntry.id ? nextEntry : entry
          )
        )

        if (selectedEntryIdRef.current === nextEntry.id) {
          setCurrentEntry(nextEntry)
        }

        setSaveState('saved')
        setSaveMessage(`Saved ${formatTime(nextEntry.updated_at)}`)
      } catch (error) {
        setSaveState('error')
        setSaveMessage(error.message)
      }
    }, 620)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentEntry, editor])

  async function handleCreateEntry({ enterWorkspace = false } = {}) {
    setIsCreatingEntry(true)
    setEntriesError('')

    try {
      const payload = await createEntry({
        title: '',
        content: '',
      })
      const nextEntry = payload.entry

      setEntries((existingEntries) => [nextEntry, ...existingEntries])
      setSelectedEntryId(nextEntry.id)
      setFocusMode(false)

      if (enterWorkspace) {
        setHasEnteredWorkspace(true)
      }
    } catch (error) {
      setEntriesError(error.message)
    } finally {
      setIsCreatingEntry(false)
    }
  }

  async function handleAnalyzeEntry() {
    if (!currentEntry) {
      return
    }

    setInsightsState({
      status: 'loading',
      insights: null,
      message: '',
    })

    try {
      const payload = await generateInsights(currentEntry.id)
      setInsightsState(normalizeInsightsState(payload))
    } catch (error) {
      setInsightsState({
        status: 'analysis_failed',
        insights: null,
        message: error.message,
      })
    }
  }

  function handleTitleChange(event) {
    const nextEditor = {
      ...editor,
      title: event.target.value,
    }

    setEditor(nextEditor)
    syncEntryPreview(selectedEntryId, nextEditor, setEntries)
  }

  function handleContentChange(event) {
    const nextEditor = {
      ...editor,
      content: event.target.value,
    }

    setEditor(nextEditor)
    syncEntryPreview(selectedEntryId, nextEditor, setEntries)
  }

  function handleEnterWorkspace() {
    setHasEnteredWorkspace(true)
  }

  const isEditorVisible = currentEntry || isLoadingEntry
  const isAnalyzeDisabled =
    !currentEntry || !editor.content.trim() || insightsState.status === 'loading'
  const activeName = displayName.trim() || 'Writer'
  const noteCountLabel = entries.length === 1 ? '1 entry' : `${entries.length} entries`

  if (!hasEnteredWorkspace) {
    return (
      <div className="landing-shell">
        <div className="landing-aura landing-aura--left" />
        <div className="landing-aura landing-aura--right" />

        <section className="landing-hero panel panel--hero">
          <div className="landing-topline">
            <span className="brand-chip">Cosmos AI Journal</span>
            <span className="brand-chip brand-chip--ghost">Private by default</span>
          </div>

          <div className="landing-copy">
            <p className="eyebrow">A notes experience built to be shown off</p>
            <h1 className="hero-title">
              <span>{typedHeroText}</span>
              <span className="hero-cursor" aria-hidden="true" />
            </h1>
            <p className="hero-subtitle">
              Designed with the calm clarity people love in premium notes apps and the
              sharp AI layer you expect from modern reflection tools. Cosmos turns
              private writing into a cinematic, intelligent ritual.
            </p>
          </div>

          <div className="hero-actions">
            <button
              className="button button--hero"
              disabled={isCreatingEntry}
              onClick={() => handleCreateEntry({ enterWorkspace: true })}
              type="button"
            >
              {isCreatingEntry ? 'Opening...' : 'Start Writing'}
            </button>
            <button
              className="button button--secondary"
              onClick={handleEnterWorkspace}
              type="button"
            >
              Enter Workspace
            </button>
          </div>

          <div className="hero-proof">
            <div className="proof-card">
              <span className="proof-card__label">Mood Lens</span>
              <strong>AI reads tone, patterns, and emotional drift.</strong>
            </div>
            <div className="proof-card">
              <span className="proof-card__label">Memory Surface</span>
              <strong>Apple Notes calm meets a sharper insight layer.</strong>
            </div>
            <div className="proof-card">
              <span className="proof-card__label">Showcase Ready</span>
              <strong>Made to feel premium the moment the page opens.</strong>
            </div>
          </div>
        </section>

        <section className="landing-grid">
          <article className="panel landing-card landing-card--workspace">
            <div className="landing-card__header">
              <p className="eyebrow">The Workspace</p>
              <h2>Notetaking that feels composed, intelligent, and expensive.</h2>
            </div>
            <p>
              Three-pane writing. Gentle motion. A sidebar that feels precise. An editor
              that feels focused. And an insight rail ready to read mood, themes,
              routines, and momentum the second you ask for it.
            </p>
            <div className="workspace-mini">
              <div className="workspace-mini__sidebar">
                <span />
                <span />
                <span />
              </div>
              <div className="workspace-mini__editor" />
              <div className="workspace-mini__insights" />
            </div>
          </article>

          <article className="panel landing-card landing-card--stats">
            <p className="eyebrow">Live Snapshot</p>
            <div className="stats-stack">
              <div>
                <span>Profile</span>
                <strong>{activeName}</strong>
              </div>
              <div>
                <span>Journal Vault</span>
                <strong>{noteCountLabel}</strong>
              </div>
              <div>
                <span>Experience</span>
                <strong>Mindful. Cinematic. AI-assisted.</strong>
              </div>
            </div>
          </article>

          <article className="panel landing-card landing-card--quote">
            <p className="eyebrow">Design Intent</p>
            <blockquote>
              “Make the first screen feel like the future of journaling, then let the
              writing space feel effortless.”
            </blockquote>
          </article>
        </section>
      </div>
    )
  }

  return (
    <div className="cosmos-page">
      <header className="workspace-header">
        <div className="workspace-header__title">
          <p className="eyebrow">Cosmos journal intelligence</p>
          <label className="profile-name">
            <span>{activeName},</span>
            <input
              aria-label="Your display name"
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="your name"
              type="text"
              value={displayName}
            />
          </label>
        </div>

        <div className="workspace-header__meta">
          <div className="header-stat">
            <span>Vault</span>
            <strong>{noteCountLabel}</strong>
          </div>
          <div className="header-stat">
            <span>Mode</span>
            <strong>{focusMode ? 'Focus' : 'Studio'}</strong>
          </div>
          <button
            className="button button--secondary"
            onClick={() => setHasEnteredWorkspace(false)}
            type="button"
          >
            View Landing
          </button>
        </div>
      </header>

      <div className={`app-shell ${focusMode ? 'app-shell--focus' : ''}`}>
        <aside className="panel sidebar" aria-label="Journal entries">
          <div className="sidebar__header">
            <div>
              <p className="eyebrow">Journal Dashboard</p>
              <h1>Cosmos</h1>
            </div>
            <button
              className="button button--primary"
              disabled={isCreatingEntry}
              onClick={() => handleCreateEntry()}
              type="button"
            >
              {isCreatingEntry ? 'Creating...' : 'New Note'}
            </button>
          </div>

          <div className="sidebar__meta">
            <span>{noteCountLabel}</span>
            <span>{isLoadingEntries ? 'Syncing...' : 'Ready'}</span>
          </div>

          {entriesError ? <p className="banner banner--error">{entriesError}</p> : null}

          <div className="entry-list">
            {isLoadingEntries ? (
              <div className="empty-state empty-state--compact">
                <p>Loading your journal timeline...</p>
              </div>
            ) : null}

            {!isLoadingEntries && entries.length === 0 ? (
              <div className="empty-state empty-state--compact">
                <h2>Your first note starts here.</h2>
                <p>Create an entry and Cosmos will keep the structure clean.</p>
              </div>
            ) : null}

            {entries.map((entry) => (
              <button
                key={entry.id}
                className={`entry-card ${
                  entry.id === selectedEntryId ? 'entry-card--active' : ''
                }`}
                onClick={() => setSelectedEntryId(entry.id)}
                type="button"
              >
                <div className="entry-card__row">
                  <strong>{entry.title}</strong>
                  <span>{formatDay(entry.updated_at)}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className="panel editor-panel">
          <div className="editor-panel__header">
            <div>
              <p className="eyebrow">Selected Entry</p>
              <div className="editor-panel__status">
                <span
                  className={`status-pill ${
                    saveState ? `status-pill--${saveState}` : ''
                  }`}
                >
                  {getSaveLabel(saveState)}
                </span>
                <span>{saveMessage || 'Autosave activates as you type.'}</span>
              </div>
            </div>
            <button
              className="button button--secondary"
              onClick={() => setFocusMode((current) => !current)}
              type="button"
            >
              {focusMode ? 'Show Sidebar' : 'Focus Mode'}
            </button>
          </div>

          {!isEditorVisible ? (
            <div className="empty-state">
              <h2>Choose a note or create a new one.</h2>
              <p>
                The center panel becomes your writing space and the right panel keeps
                the AI context visible.
              </p>
            </div>
          ) : null}

          {isLoadingEntry ? (
            <div className="empty-state">
              <p>Opening note...</p>
            </div>
          ) : null}

          {currentEntry && !isLoadingEntry ? (
            <div className="editor">
              <div className="editor__meta">
                <span>{formatLongDate(currentEntry.updated_at)}</span>
                <span>Entry #{currentEntry.id}</span>
              </div>

              <input
                aria-label="Entry title"
                className="editor__title"
                onChange={handleTitleChange}
                placeholder="Untitled Entry"
                type="text"
                value={editor.title}
              />

              <textarea
                aria-label="Journal entry content"
                className="editor__content"
                onChange={handleContentChange}
                placeholder="Write about your day, your mood, and the routines you want Cosmos to notice."
                value={editor.content}
              />
            </div>
          ) : null}
        </main>

        <aside className="panel insights-panel" aria-label="AI insights">
          <div className="insights-panel__header">
            <div>
              <p className="eyebrow">AI Insights</p>
              <h2>Patterns in this note</h2>
            </div>
            <button
              className="button button--primary"
              disabled={isAnalyzeDisabled}
              onClick={handleAnalyzeEntry}
              type="button"
            >
              {insightsState.status === 'loading' ? 'Analyzing...' : 'Analyze Note'}
            </button>
          </div>

          {renderInsights(insightsState)}
        </aside>
      </div>
    </div>
  )
}

function renderInsights(insightsState) {
  if (insightsState.status === 'loading') {
    return (
      <div className="empty-state">
        <p>Reading the note and extracting mood, themes, and routines...</p>
      </div>
    )
  }

  if (insightsState.status === 'available' && insightsState.insights) {
    const { insights } = insightsState

    return (
      <div className="insights-grid">
        <section className="insight-card insight-card--summary">
          <span className="insight-card__label">Summary</span>
          <p>{insights.summary}</p>
        </section>

        <section className="insight-card insight-card--metrics">
          <div>
            <span className="insight-card__label">Sentiment</span>
            <strong>{insights.sentiment}</strong>
          </div>
          <div>
            <span className="insight-card__label">Mood</span>
            <strong>{insights.mood}</strong>
          </div>
          <div>
            <span className="insight-card__label">Confidence</span>
            <strong>{Math.round(insights.confidence * 100)}%</strong>
          </div>
        </section>

        <InsightList title="Themes" items={insights.themes} />
        <InsightList title="Routines" items={insights.routines} />
        <InsightList title="Activities" items={insights.activities} />

        <section className="insight-card insight-card--footer">
          <span className="insight-card__label">Model</span>
          <p>{insights.model_name}</p>
        </section>
      </div>
    )
  }

  if (insightsState.status === 'not_configured') {
    return (
      <div className="empty-state">
        <h3>OpenAI key needed</h3>
        <p>{insightsState.message}</p>
      </div>
    )
  }

  if (insightsState.status === 'analysis_failed') {
    return (
      <div className="empty-state">
        <h3>Analysis failed</h3>
        <p>{insightsState.message}</p>
      </div>
    )
  }

  return (
    <div className="empty-state">
      <h3>Run your first insight pass</h3>
      <p>
        Cosmos will look for emotional tone, repeated routines, and the themes that
        keep returning.
      </p>
    </div>
  )
}

function InsightList({ items, title }) {
  return (
    <section className="insight-card">
      <span className="insight-card__label">{title}</span>
      <div className="tag-list">
        {items.length > 0 ? (
          items.map((item) => <span key={item}>{item}</span>)
        ) : (
          <p>No strong signal yet.</p>
        )}
      </div>
    </section>
  )
}

function normalizeInsightsState(payload) {
  if (payload.status === 'available') {
    return {
      status: 'available',
      insights: payload.insights,
      message: '',
    }
  }

  return {
    status: payload.status,
    insights: null,
    message: payload.message || '',
  }
}

function syncEntryPreview(selectedEntryId, editor, setEntries) {
  if (selectedEntryId == null) {
    return
  }

  setEntries((existingEntries) =>
    existingEntries.map((entry) =>
      entry.id === selectedEntryId
        ? {
            ...entry,
            title: deriveTitle(editor.title, editor.content),
            preview: buildPreview(editor.content),
          }
        : entry
    )
  )
}

function deriveTitle(title, content) {
  if (title.trim()) {
    return title.trim()
  }

  const firstLine = content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean)

  return firstLine ? firstLine.slice(0, 80) : 'Untitled Entry'
}

function buildPreview(content) {
  const collapsed = content.trim().replace(/\s+/g, ' ')
  return collapsed.slice(0, 140)
}

function formatDay(timestamp) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

function formatLongDate(timestamp) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function getSaveLabel(saveState) {
  if (saveState === 'saving') {
    return 'Saving'
  }

  if (saveState === 'saved') {
    return 'Saved'
  }

  if (saveState === 'error') {
    return 'Error'
  }

  return 'Draft'
}

export default App
