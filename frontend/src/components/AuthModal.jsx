import { useState } from 'react'
import { login as apiLogin, signup as apiSignup } from '../api'

export default function AuthModal({ type, onClose, onSwitch, onAuthSuccess }) {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (type === 'signup') {
        await apiSignup(email, password, displayName)
        onAuthSuccess()
      } else {
        await apiLogin(email, password)
        onAuthSuccess()
      }
      onClose()
    } catch (err) {
      setError(err.message || (type === 'signup' ? 'Signup failed' : 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-backdrop" onClick={onClose}>
      <div className="auth-card" onClick={(e) => e.stopPropagation()}>
        <button className="auth-close" onClick={onClose}>
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="auth-title">{type === 'signup' ? 'Create account' : 'Welcome back'}</h2>
        <p className="auth-subtitle">{type === 'signup' ? 'Start your journaling journey' : 'Sign in to continue'}</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {type === 'signup' && (
            <div className="auth-field">
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="auth-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="auth-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Please wait...' : type === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="auth-toggle">
          {type === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button type="button" onClick={onSwitch}>{type === 'signup' ? 'Sign in' : 'Sign up'}</button>
        </p>
      </div>
    </div>
  )
}
