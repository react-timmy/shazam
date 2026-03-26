// api/health.js — Vercel serverless function
const { MODEL } = require('./_nvidia')

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  return res.status(200).json({
    ok: true,
    model: MODEL,
    hasKey: !!process.env.NVIDIA_API_KEY,
  })
}
