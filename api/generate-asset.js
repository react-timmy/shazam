// api/generate-asset.js — Vercel serverless function (NVIDIA NIM)
const { callNvidia, handleNvidiaError } = require('./_nvidia')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { label, type } = req.body || {}
  if (!label) return res.status(400).json({ error: 'label is required.' })

  const isIcon  = type?.toLowerCase() === 'icon'
  const isPhoto = type?.toLowerCase() === 'photo'

const prompt = isIcon
    ? `Generate a high-end, professional SVG icon for: "${label}".
Design Language: Modern, minimalist, and balanced (similar to Lucide or Heroicons). 
Rules: Output raw SVG only, no markdown, no explanation. viewBox="0 0 24 24" width="24" height="24". 
Stroke-based: stroke-width="1.5" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round".
Use only <path>, <circle>, <rect>, or <line> elements. 
Focus on geometric elegance and professional iconography metaphors. Ensure the icon is perfectly centered, uses consistent line weights, and avoids literal text or crude shapes.
Start with <svg and end with </svg>.`
    : isPhoto
    ? `Write a detailed AI image generation prompt for: "${label}". Single paragraph 2-4 sentences. Include subject, style, lighting, composition, background, colour palette, quality modifiers. Output only the prompt text, no labels or quotes.`
    : `Describe how to create this UI asset: "${label}". Be concise and practical.`
  const messages = [{ role: 'user', content: prompt }]

  try {
    const text = await callNvidia({ messages, maxTokens: 1024, temperature: 0.4 })
    return res.status(200).json({
      result: text,
      type: isIcon ? 'svg' : isPhoto ? 'image-prompt' : 'description',
    })
  } catch (err) {
    return handleNvidiaError(err, res)
  }
}
