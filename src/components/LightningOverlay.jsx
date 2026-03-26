import React, { useEffect, useState } from 'react'
import './LightningOverlay.css'

export default function LightningOverlay() {
  const [phase, setPhase] = useState('active') // active | fading | done

  useEffect(() => {
    // Keep overlay visible for 2.2s then fade the whole thing
    const fadeTimer = setTimeout(() => setPhase('fading'), 2200)
    const doneTimer = setTimeout(() => setPhase('done'), 2900)
    return () => { clearTimeout(fadeTimer); clearTimeout(doneTimer) }
  }, [])

  if (phase === 'done') return null

  return (
    <div className={`lo ${phase === 'fading' ? 'lo--fading' : ''}`}>
      {/* Deep space background */}
      <div className="lo__bg" />

      {/* Blue atmospheric glow */}
      <div className="lo__blue-glow lo__blue-glow--left" />
      <div className="lo__blue-glow lo__blue-glow--right" />

      {/* Lightning flash wash over entire screen */}
      <div className="lo__flash" />

      {/* Main SVG lightning bolt — center of screen */}
      <div className="lo__bolt-wrap">
        <svg className="lo__bolt" viewBox="0 0 120 400" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer glow layer */}
          <path
            d="M75 0 L30 180 L65 180 L20 400 L95 155 L58 155 L100 0 Z"
            fill="rgba(255,229,0,0.15)"
            filter="url(#blurLarge)"
          />
          {/* Mid glow layer */}
          <path
            d="M75 0 L30 180 L65 180 L20 400 L95 155 L58 155 L100 0 Z"
            fill="rgba(255,229,0,0.4)"
            filter="url(#blurMed)"
          />
          {/* Sharp bolt */}
          <path
            d="M75 0 L30 180 L65 180 L20 400 L95 155 L58 155 L100 0 Z"
            fill="#FFE500"
          />
          {/* Core white highlight */}
          <path
            d="M72 10 L38 165 L62 165 L28 380 L88 160 L62 160 L95 10 Z"
            fill="rgba(255,255,255,0.7)"
          />

          <defs>
            <filter id="blurLarge" x="-100%" y="-20%" width="300%" height="140%">
              <feGaussianBlur stdDeviation="18" />
            </filter>
            <filter id="blurMed" x="-60%" y="-10%" width="220%" height="120%">
              <feGaussianBlur stdDeviation="8" />
            </filter>
          </defs>
        </svg>

        {/* Branch bolts */}
        <svg className="lo__branch lo__branch--left" viewBox="0 0 200 120" fill="none">
          <path d="M160 20 L80 60 L110 60 L30 110" stroke="#FFE500" strokeWidth="3" strokeLinecap="round"/>
          <path d="M160 20 L80 60 L110 60 L30 110" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M160 20 L80 60 L110 60 L30 110" stroke="rgba(255,229,0,0.3)" strokeWidth="8" strokeLinecap="round" filter="url(#blurBranch)"/>
          <defs>
            <filter id="blurBranch">
              <feGaussianBlur stdDeviation="4"/>
            </filter>
          </defs>
        </svg>

        <svg className="lo__branch lo__branch--right" viewBox="0 0 200 120" fill="none">
          <path d="M40 20 L120 60 L90 60 L170 110" stroke="#FFE500" strokeWidth="2.5" strokeLinecap="round"/>
          <path d="M40 20 L120 60 L90 60 L170 110" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round"/>
          <path d="M40 20 L120 60 L90 60 L170 110" stroke="rgba(255,229,0,0.3)" strokeWidth="7" strokeLinecap="round" filter="url(#blurBranch2)"/>
          <defs>
            <filter id="blurBranch2">
              <feGaussianBlur stdDeviation="4"/>
            </filter>
          </defs>
        </svg>
      </div>

      {/* SHAZAM title slams in */}
      <div className="lo__title-wrap">
        <div className="lo__title">SHAZAM</div>
        <div className="lo__tagline">Give your AI a blueprint</div>
      </div>

      {/* Ground impact glow */}
      <div className="lo__impact" />
    </div>
  )
}
