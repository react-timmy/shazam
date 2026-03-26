// api/auth-handler.js — handles /auth/* on Vercel via serverless
// NOTE: For full Google OAuth on Vercel, use a single Express server deployment
// (Railway, Render, Fly.io) which supports sessions + passport properly.
// This stub redirects to the correct endpoints.

module.exports = function handler(req, res) {
  res.status(200).json({
    message: 'Auth is handled by the Express server. Deploy to Railway/Render for full OAuth support.',
    deploymentNote: 'Vercel serverless does not support persistent sessions for OAuth flows. Use npm start with a server platform.'
  })
}
