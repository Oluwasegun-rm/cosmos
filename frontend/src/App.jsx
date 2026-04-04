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

function App() {
  const [entries, setEntries] = useState([])
  const [selectedEntryId, setSelectedEntryId] = useState(null)
  const [currentEntry, setCurrentEntry] = useState(null)
  const [editor, setEditor] = useState(EMPTY_EDITOR)
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
    }, 650)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [currentEntry, editor])

  async function handleCreateEntry() {
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

  const isEditorVisible = currentEntry || isLoadingEntry
  const isAnalyzeDisabled =
    !currentEntry || !editor.content.trim() || insightsState.status === 'loading'

  return (
    <div className={`app-shell ${focusMode ? 'app-shell--focus' : ''}`}>
      <aside className="panel sidebar" aria-label="Journal entries">
        <div className="sidebar__header">
          <div>
            <p className="eyebrow">Journal Dashboard</p>
            <h1>Cosmos</h1>
          </div>
          <button
            className="button button--primary"
            onClick={handleCreateEntry}
            disabled={isCreatingEntry}
            type="button"
          >
            {isCreatingEntry ? 'Creating...' : 'New Note'}
          </button>
        </div>

        <div className="sidebar__meta">
          <span>{entries.length} notes</span>
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
              <p>{entry.preview || 'Empty note'}</p>
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
            <p>The center panel becomes your writing space and the right panel keeps the AI context visible.</p>
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
      <p>Cosmos will look for emotional tone, repeated routines, and the themes that keep returning.</p>
    </div>
  )
}

function InsightList({ items, title }) {
  return (
    <section className="insight-card">
      <span className="insight-card__label">{title}</span>
      <div className="tag-list">
        {items.length > 0 ? items.map((item) => <span key={item}>{item}</span>) : <p>No strong signal yet.</p>}
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
