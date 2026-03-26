import React, { useState, useRef } from 'react'
import './LightningButton.css'

const BOLT_ANGLES = [
  { tx: '-90px', ty: '-60px' },
  { tx: '-70px', ty: '-80px' },
  { tx: '0px',   ty: '-90px' },
  { tx: '70px',  ty: '-80px' },
  { tx: '90px',  ty: '-60px' },
  { tx: '100px', ty: '0px'   },
  { tx: '90px',  ty: '60px'  },
  { tx: '-90px', ty: '60px'  },
  { tx: '-100px',ty: '0px'   },
]

export default function LightningButton({ children, onClick, disabled, loading, className = '' }) {
  const [bolts, setBolts] = useState([])
  const countRef = useRef(0)

  const fire = (e) => {
    if (disabled || loading) return

    // Spawn bolts
    const id = countRef.current++
    const newBolts = BOLT_ANGLES.map((b, i) => ({ id: `${id}-${i}`, ...b }))
    setBolts(prev => [...prev, ...newBolts])
    setTimeout(() => {
      setBolts(prev => prev.filter(b => !newBolts.some(nb => nb.id === b.id)))
    }, 700)

    onClick?.(e)
  }

  return (
    <button
      className={`lbtn ${loading ? 'lbtn--loading' : ''} ${disabled ? 'lbtn--disabled' : ''} ${className}`}
      onClick={fire}
      disabled={disabled || loading}
    >
      {/* Bolt particles */}
      {bolts.map(bolt => (
        <span
          key={bolt.id}
          className="lbtn__bolt"
          style={{ '--tx': bolt.tx, '--ty': bolt.ty }}
        >
          <svg width="14" height="22" viewBox="0 0 14 22" fill="none">
            <path d="M10 0L2 11H8L0 22L12 8H7L14 0Z" fill="#FFE500"/>
            <path d="M10 0L2 11H8L0 22L12 8H7L14 0Z" fill="white" opacity="0.5"/>
          </svg>
        </span>
      ))}

      {/* Inner content */}
      <span className="lbtn__inner">
        {loading ? (
          <>
            <span className="lbtn__spinner" />
            <span>{typeof children === 'string' ? 'Analysing...' : children}</span>
          </>
        ) : (
          <>
            <svg className="lbtn__icon" width="16" height="22" viewBox="0 0 16 22" fill="none">
              <path d="M12 0L3 12H9L1 22L14 9H8L16 0Z" fill="currentColor"/>
            </svg>
            <span>{children}</span>
          </>
        )}
      </span>

      {/* Electric border shimmer */}
      <span className="lbtn__shimmer" />
    </button>
  )
}
