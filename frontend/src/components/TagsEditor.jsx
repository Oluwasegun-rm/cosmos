import { useState } from 'react'

export default function TagsEditor({ tags, onChange }) {
  const [input, setInput] = useState('')

  function addTagFromInput() {
    const t = input.trim()
    if (!t) return
    const next = Array.from(new Set([...(tags || []), t]))
    onChange(next)
    setInput('')
  }

  function removeTag(tag) {
    onChange((tags || []).filter((t) => t !== tag))
  }

  return (
    <div className="tags-editor">
      <div className="tags-list">
        {(tags || []).map((tag) => (
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
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
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
