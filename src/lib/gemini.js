/**
 * SHAZAM — Frontend API Client
 *
 * All image analysis is handled server-side via @google/genai SDK.
 * This file simply sends requests to the Express server at /api/*.
 * Users never need an API key — the server holds it.
 *
 * Endpoints:
 *   POST /api/analyze    → { prompt: string, model: string }
 *   POST /api/fix-prompt → { fixPrompt: string }
 *   GET  /api/health     → { ok, model, hasKey }
 */

/**
 * analyzeDesign
 * Converts uploaded images to base64 and sends them to the server.
 * The server calls Gemini 2.5 Flash and returns an implementation spec.
 *
 * @param {File[]} files      - design screenshots (up to 5)
 * @param {string} _ignored   - kept for API compatibility, unused
 * @param {string} designType - optional design type hint
 * @returns {Promise<string>} - the full implementation spec
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export async function analyzeDesign(files, _ignored = null, designType = '') {
  if (!files || files.length === 0) {
    throw new Error('Please upload at least one design image.')
  }

  // Convert every image to base64 on the client before sending
  const images = await Promise.all(
    files.map(async (file) => ({
      base64: await fileToBase64(file),
      mimeType: file.type || 'image/png',
    }))
  )

  let res
  try {
    res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ images, designType }),
    })
  } catch {
    throw new Error(
      'Cannot reach the server. Make sure it is running on port 3001 (run: npm run dev).'
    )
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.error || `Server error ${res.status}`)
  }

  if (!data.prompt) {
    throw new Error('Empty response from server. Please try again.')
  }

  return data.prompt
}

/**
 * generateFixPrompt
 * Sends the original spec + an issue description to the server.
 * Returns a short, targeted fix prompt the user can paste into their AI tool.
 *
 * @param {string} spec   - the original implementation spec
 * @param {string} issue  - plain-text description of what's wrong
 * @returns {Promise<string>}
 */
export async function generateFixPrompt(spec, issue, _ignored = null) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/fix-prompt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ spec, issue }),
    })
  } catch {
    throw new Error('Cannot reach the server. Make sure it is running (run: npm run dev).')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data?.error || `Server error ${res.status}`)
  }

  return data.fixPrompt || 'Could not generate a fix prompt.'
}

// ── Helper ────────────────────────────────────────────────────────────────────

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`))
    reader.readAsDataURL(file)
  })
}

/**
 * generateAsset — generates an SVG icon or image prompt for a detected asset
 * @param {string} label - asset description (e.g. "Minimalist white basketball icon")
 * @param {string} type  - "Icon" | "Photo" | "Illustration"
 * @returns {Promise<{result: string, type: 'svg'|'image-prompt'|'description'}>}
 */
export async function generateAsset(label, type) {
  let res
  try {
    res = await fetch(`${API_BASE}/api/generate-asset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ label, type }),
    })
  } catch {
    throw new Error('Cannot reach the server.')
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `Server error ${res.status}`)
  return data
}
