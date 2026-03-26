// api/fix-prompt.js — Vercel serverless function (NVIDIA NIM)
const { callNvidia, handleNvidiaError } = require('./_nvidia')

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { spec, issue } = req.body || {}
  if (!spec || !issue) return res.status(400).json({ error: 'spec and issue are required.' })

  const messages = [
    {
      role: 'user',
      content: `Here is an implementation spec:\n\n${spec}\n\nThe user reports this issue:\n"${issue}"\n\nWrite a concise, targeted fix prompt (2–5 sentences) that an AI coding assistant can paste directly into their tool to fix only this specific issue. Do not rewrite the whole spec. Be precise about what to change and to what.`,
    },
  ]

  try {
    const text = await callNvidia({ messages, maxTokens: 512, temperature: 0.3 })
    return res.status(200).json({ fixPrompt: text })
  } catch (err) {
    return handleNvidiaError(err, res)
  }
}
