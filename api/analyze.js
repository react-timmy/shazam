// api/analyze.js — Vercel serverless function (NVIDIA NIM)
const { callNvidia, handleNvidiaError, SYSTEM_INSTRUCTION } = require('./_nvidia')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { images, designType } = req.body || {}
  if (!images || images.length === 0) return res.status(400).json({ error: 'No images provided.' })

  const typeHint = designType && designType !== 'None (auto-detect)'
    ? `Design type: ${designType}\n\n` : ''

  const textPrompt = `${typeHint}Analyze the uploaded design screenshot(s) and generate a SHAZAM Implementation Spec. 

Act as a Lead UI Engineer. Prioritize pixel-perfect accuracy over creative interpretation. Do not hallucinate features not present in the reference.

### 1. DESIGN TOKENS (GLOBAL)
- **Colors**: List every HEX code with its specific semantic role (bg, text, border, accent, shadow).
- **Typography**: Define font families, weights (400, 500, 600, 700), sizes (px/rem), line-heights, and letter-spacing for Headings, Body, and Micro-labels.
- **Radius & Shadows**: Exact border-radius values and box-shadow parameters (x, y, blur, spread, color).

### 2. LAYOUT ARCHITECTURE
- **Global Container**: Max-width, alignment, and responsive padding.
- **Grid/Flex Systems**: Define column counts, gaps (px), and alignment strategies (e.g., justify-between, items-center).
- **Stacking Context**: Identify Z-index layers and fixed/sticky positioning.

### 3. COMPONENT DEEP-DIVE (FOR EACH ELEMENT)
- **Visuals**: Backgrounds (solid/gradient/blur), borders (width/style/color), and opacity.
- **Content**: Extract ALL text strings (OCR). Identify icons (suggest Lucide-React equivalents).
- **States**: Describe Hover, Active, and Focus states (color shifts, scale transforms, shadow changes).

### 4. ANIMATION & MOTION
- **Transitions**: Duration (ms), easing functions (linear, ease-in-out, cubic-bezier), and properties affected.
- **Micro-interactions**: Subtle feedback loops (e.g., "Button scales to 0.98 on tap").

### 5. RESPONSIVE STRATEGY
- **Breakpoints**: Specific changes at Mobile (640px), Tablet (768px), and Desktop (1024px+).
- **Reflow Logic**: How elements stack, hide, or resize across screen sizes.

### 6. TECHNICAL ARCHITECTURE
- **React Component Tree**: Suggested file structure (e.g., Navbar.tsx, Hero.tsx, Footer.tsx).
- **Implementation Notes**: CSS techniques (e.g., "Use backdrop-filter for glassmorphism"), accessibility (ARIA labels), and font-loading requirements.

[ENGINEER INSTRUCTION: Use the above spec to build a pixel-perfect React + Tailwind CSS application.]`


  // Build image content array for NVIDIA's vision model
  const contentParts = images.map(img => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType || 'image/png'};base64,${img.base64}` },
  }))
  contentParts.push({ type: 'text', text: textPrompt })

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user',   content: contentParts },
  ]

  try {
    const text = await callNvidia({ messages, maxTokens: 8192, temperature: 0.2 })
    return res.status(200).json({ prompt: text })
  } catch (err) {
    return handleNvidiaError(err, res)
  }
}
