import React, { useState } from 'react'
import './ApiKeyModal.css'

export default function ApiKeyModal({ onSave, onClose, existingKey }) {
  // existingKey is stored as "accountId::apiToken"
  const [accountId, setAccountId] = useState(existingKey?.split('::')?.[0] || '')
  const [apiToken, setApiToken]   = useState(existingKey?.split('::')?.[1] || '')
  const [showToken, setShowToken] = useState(false)
  const [error, setError]         = useState('')

  const handleSave = () => {
    const aid = accountId.trim()
    const tok = apiToken.trim()
    if (!aid) { setError('Account ID is required.'); return }
    if (!tok) { setError('API Token is required.'); return }
    if (aid.length < 20) { setError('Account ID looks too short — check dash.cloudflare.com.'); return }
    onSave(`${aid}::${tok}`)
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="modal">
        <div className="modal__header">
          <div className="modal__icon">
            {/* Cloudflare-ish flame icon */}
            <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
              <path d="M13.5 14.5C15.5 13 17 10.5 17 8C17 4 13.5 1 9 1C4.5 1 1 4 1 8C1 10.5 2.5 13 4.5 14.5C3.5 15.5 3 16.5 3 17.5C3 18.5 4 19 5 19H13C14 19 15 18.5 15 17.5C15 16.5 14.5 15.5 13.5 14.5Z" stroke="#FF6B2B" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M9 5V11M9 11L7 9M9 11L11 9" stroke="#FF6B2B" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h2 className="modal__title">Cloudflare Workers AI</h2>
            <p className="modal__sub">100% free · 10,000 requests/day · No credit card</p>
          </div>
          {onClose && (
            <button className="modal__close" onClick={onClose}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>

        <div className="modal__body">
          <div className="modal__steps">
            <div className="modal__steps-title">Get your free key (2 minutes)</div>
            <div className="modal__step">
              <span className="modal__step-num">1</span>
              <span>Sign up free at <a href="https://dash.cloudflare.com/sign-up" target="_blank" rel="noreferrer">dash.cloudflare.com</a></span>
            </div>
            <div className="modal__step">
              <span className="modal__step-num">2</span>
              <span>Copy your <strong>Account ID</strong> from the right sidebar of the dashboard</span>
            </div>
            <div className="modal__step">
              <span className="modal__step-num">3</span>
              <span>Go to <a href="https://dash.cloudflare.com/profile/api-tokens" target="_blank" rel="noreferrer">My Profile → API Tokens</a> → <strong>Create Token</strong> → use the <strong>"Cloudflare Workers AI"</strong> template</span>
            </div>
          </div>

          <div className="modal__free-badge">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 1l1.5 3.2 3.5.5-2.5 2.4.6 3.4L6.5 9l-3.1 1.5.6-3.4L1.5 4.7l3.5-.5L6.5 1z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/>
            </svg>
            Uses <strong>@cf/llava-1.5-7b-hf</strong> — vision model, permanently free
          </div>

          <div className="modal__field">
            <label className="modal__label">Account ID</label>
            <input
              className="modal__input"
              type="text"
              value={accountId}
              onChange={e => { setAccountId(e.target.value); setError('') }}
              placeholder="a1b2c3d4e5f6..."
              autoFocus
            />
          </div>

          <div className="modal__field">
            <label className="modal__label">API Token</label>
            <div className="modal__input-wrap">
              <input
                className="modal__input"
                type={showToken ? 'text' : 'password'}
                value={apiToken}
                onChange={e => { setApiToken(e.target.value); setError('') }}
                placeholder="Your Workers AI token..."
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button className="modal__eye" onClick={() => setShowToken(!showToken)}>
                {showToken ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                    <path d="M2 2l10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" stroke="currentColor" strokeWidth="1.2"/>
                    <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  </svg>
                )}
              </button>
            </div>
            {error && <p className="modal__error">{error}</p>}
          </div>

          <div className="modal__info">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{flexShrink:0,marginTop:1}}>
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M7 6v4M7 4.5v.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span>Both values are stored only in your browser. Never sent to our servers.</span>
          </div>
        </div>

        <div className="modal__footer">
          {onClose && <button className="modal__btn modal__btn--ghost" onClick={onClose}>Cancel</button>}
          <button className="modal__btn modal__btn--primary" onClick={handleSave} disabled={!accountId.trim() || !apiToken.trim()}>
            Save Key
          </button>
        </div>
      </div>
    </div>
  )
}
