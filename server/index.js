import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import axios from 'axios'
import crypto from 'crypto'
import { promisify } from 'util'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import mongoose from 'mongoose'
import MongoStore from 'connect-mongo'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const app  = express()
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'
const SESSION_SECRET = process.env.SESSION_SECRET
const FRONTEND_URL = process.env.FRONTEND_URL || (NODE_ENV === 'production' ? null : 'http://localhost:5173')
const renderBaseUrl = process.env.RENDER_EXTERNAL_URL?.replace(/\/$/, '')
const defaultGoogleCallbackUrl = NODE_ENV === 'production'
  ? (renderBaseUrl ? `${renderBaseUrl}/auth/google/callback` : null)
  : 'http://localhost:3001/auth/google/callback'
const configuredGoogleCallbackUrl = process.env.GOOGLE_CALLBACK_URL
const configuredCallbackIsLocal = (() => {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(configuredGoogleCallbackUrl).hostname)
  } catch {
    return false
  }
})()
const GOOGLE_CALLBACK_URL = NODE_ENV === 'production' && configuredCallbackIsLocal
  ? defaultGoogleCallbackUrl
  : configuredGoogleCallbackUrl || defaultGoogleCallbackUrl

if (NODE_ENV === 'production' && configuredCallbackIsLocal) {
  console.warn('[OAuth] Ignoring localhost GOOGLE_CALLBACK_URL in production; using the Render service URL.')
}

if (NODE_ENV === 'production' && !SESSION_SECRET) {
  throw new Error('SESSION_SECRET must be set in production.')
}
if (NODE_ENV === 'production' && !FRONTEND_URL) {
  throw new Error('FRONTEND_URL must be set in production.')
}

// ── MongoDB ───────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI
if (NODE_ENV === 'production' && !MONGO_URI) {
  throw new Error('MONGODB_URI must be set in production.')
}
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log('✓ MongoDB connected'))
    .catch(err => console.error('✗ MongoDB error:', err.message))
} else {
  console.warn('⚠ MONGODB_URI not set — auth will not persist')
}

// ── Schemas ───────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  googleId:      { type: String, unique: true, sparse: true },
  email:         { type: String, unique: true, required: true },
  name:          String,
  avatar:        String,
  passwordHash:  String, // for email/password accounts
  createdAt:     { type: Date, default: Date.now },
})
const User = mongoose.models.User || mongoose.model('User', userSchema)

const projectSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:       { type: String, default: 'Untitled Project' },
  prompt:     String,
  designType: String,
  imageCount: Number,
  thumbnail:  String,
  liveUrl:    String,
  assets:     { type: Array, default: [] },
  status:     { type: String, default: 'ANALYZED' },
  createdAt:  { type: Date, default: Date.now },
  updatedAt:  { type: Date, default: Date.now },
})
const Project = mongoose.models.Project || mongoose.model('Project', projectSchema)

const usageSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayKey:    String, // UTC date, e.g. "2026-10-13"
  count:     { type: Number, default: 0 },
})
usageSchema.index({ userId: 1, dayKey: 1 }, {
  unique: true,
  partialFilterExpression: { dayKey: { $type: 'string' } },
})
const Usage = mongoose.models.Usage || mongoose.model('Usage', usageSchema)
const DAILY_USAGE_LIMIT = 20

function currentUsageDay() {
  const now = new Date()
  return {
    now,
    dayKey: now.toISOString().slice(0, 10),
    resetsAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)),
  }
}

async function consumeDailyUsage(userId) {
  const { dayKey } = currentUsageDay()
  let record
  try {
    record = await Usage.findOneAndUpdate(
      { userId, dayKey },
      { $inc: { count: 1 }, $setOnInsert: { userId, dayKey } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  } catch (err) {
    // Two first requests can race to create today's row; retry against the unique row.
    if (err.code !== 11000) throw err
    record = await Usage.findOneAndUpdate(
      { userId, dayKey },
      { $inc: { count: 1 } },
      { new: true },
    )
  }

  if (record.count > DAILY_USAGE_LIMIT) {
    await Usage.updateOne({ _id: record._id }, { $inc: { count: -1 } })
    const { resetsAt } = currentUsageDay()
    const error = new Error('Daily limit reached.')
    error.dailyUsageLimit = true
    error.usage = { count: DAILY_USAGE_LIMIT, limit: DAILY_USAGE_LIMIT, remaining: 0, resetsAt }
    throw error
  }
  return record.count
}

async function releaseDailyUsage(userId) {
  try {
    const { dayKey } = currentUsageDay()
    await Usage.updateOne({ userId, dayKey, count: { $gt: 0 } }, { $inc: { count: -1 } })
  } catch (err) {
    console.error('[usage] Could not release failed request:', err.message)
  }
}

async function enforceDailyUsage(userId, res) {
  try {
    await consumeDailyUsage(userId)
    return true
  } catch (err) {
    if (err.dailyUsageLimit) {
      res.status(429).json({ error: 'You’ve reached today’s limit of 20 AI actions. Your allowance resets at midnight UTC.', usage: err.usage })
      return false
    }
    console.error('[usage]', err.message)
    res.status(500).json({ error: 'Could not verify today’s usage. Please try again.' })
    return false
  }
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1) // Required for Railway/Render proxy

app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}))
app.use(express.json({ limit: '25mb' }))

app.use(session({
  secret: SESSION_SECRET || 'shazam-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: MONGO_URI
    ? MongoStore.create({ mongoUrl: MONGO_URI })
    : undefined,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    sameSite: NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

app.use(passport.initialize())
app.use(passport.session())

// ── Passport Google OAuth ─────────────────────────────────────────────────────
const googleAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && GOOGLE_CALLBACK_URL)
if (googleAuthConfigured) {
  passport.use(new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  GOOGLE_CALLBACK_URL,
      proxy:        true,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id })
        if (!user) {
          user = await User.create({
            googleId: profile.id,
            email:    profile.emails?.[0]?.value,
            name:     profile.displayName,
            avatar:   profile.photos?.[0]?.value,
          })
        }
        return done(null, user)
      } catch (err) {
        return done(err, null)
      }
    }
  ))
}

passport.serializeUser((user, done) => done(null, user._id.toString()))
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean()
    done(null, user)
  } catch (err) {
    done(err, null)
  }
})

// ── Auth middleware ────────────────────────────────────────────────────────────
const requireAuth = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// ── Auth routes ───────────────────────────────────────────────────────────────
app.get('/auth/google', (req, res, next) => {
  if (!googleAuthConfigured) return res.status(503).json({ error: 'Google sign-in is not configured.' })
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next)
})

app.get('/auth/google/callback', (req, res, next) => {
  if (!googleAuthConfigured) return res.status(503).json({ error: 'Google sign-in is not configured.' })
  passport.authenticate('google', { failureRedirect: new URL('/login?error=auth_failed', FRONTEND_URL).toString() })(req, res, next)
}, (req, res) => {
  res.redirect(new URL('/dashboard', FRONTEND_URL).toString())
})

app.get('/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null })
  const { _id, name, email, avatar, createdAt } = req.user
  res.json({ user: { id: _id, name, email, avatar, createdAt } })
})

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }))
})


// ── Email / password signup and login ─────────────────────────────────────────
const scrypt = promisify(crypto.scrypt)

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64)
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

async function verifyPassword(password, storedHash) {
  // Upgrade legacy unsalted SHA-256 hashes after a successful login.
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const legacyHash = crypto.createHash('sha256').update(password).digest()
    const expectedHash = Buffer.from(storedHash, 'hex')
    return expectedHash.length === legacyHash.length && crypto.timingSafeEqual(expectedHash, legacyHash)
  }

  const [algorithm, salt, key] = storedHash.split('$')
  if (algorithm !== 'scrypt' || !salt || !/^[a-f0-9]{128}$/i.test(key || '')) return false
  const expectedKey = Buffer.from(key, 'hex')
  const derivedKey = await scrypt(password, salt, expectedKey.length)
  return crypto.timingSafeEqual(expectedKey, derivedKey)
}

function sendLoginResponse(req, res, user, failureMessage) {
  req.login(user, (err) => {
    if (err) return res.status(500).json({ error: failureMessage })
    const { _id, name, email, avatar, createdAt } = user
    res.json({ user: { id: _id, name, email, avatar, createdAt } })
  })
}

app.post('/auth/signup', async (req, res) => {
  const { name, password } = req.body || {}
  const email = req.body?.email?.trim().toLowerCase()
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required.' })
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' })
    const user = await User.create({ name, email, passwordHash: await hashPassword(password) })
    sendLoginResponse(req, res, user, 'Login after signup failed.')
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'An account with this email already exists.' })
    res.status(500).json({ error: 'Could not create your account. Please try again.' })
  }
})

app.post('/auth/login', async (req, res) => {
  const email = req.body?.email?.trim().toLowerCase()
  const { password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

  try {
    const user = await User.findOne({ email })
    if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }
    if (/^[a-f0-9]{64}$/i.test(user.passwordHash)) {
      user.passwordHash = await hashPassword(password)
      await user.save()
    }
    sendLoginResponse(req, res, user, 'Login failed.')
  } catch {
    res.status(500).json({ error: 'Could not sign in. Please try again.' })
  }
})

// ── User routes ───────────────────────────────────────────────────────────────
app.patch('/api/user', requireAuth, async (req, res) => {
  try {
    const { name, avatar } = req.body
    const updates = {}
    if (name)   updates.name   = name
    if (avatar) updates.avatar = avatar
    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).lean()
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, avatar: updated.avatar, createdAt: updated.createdAt } })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/user', requireAuth, async (req, res) => {
  try {
    await Project.deleteMany({ userId: req.user._id })
    await Usage.deleteMany({ userId: req.user._id })
    await User.findByIdAndDelete(req.user._id)
    req.logout(() => res.json({ ok: true }))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Project routes ────────────────────────────────────────────────────────────
app.get('/api/projects', requireAuth, async (req, res) => {
  try {
    const projects = await Project.find({ userId: req.user._id }).sort({ updatedAt: -1 }).lean()
    res.json({ projects })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/projects', requireAuth, async (req, res) => {
  try {
    const project = await Project.create({ ...req.body, userId: req.user._id })
    res.json({ project })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).lean()
    if (!project) return res.status(404).json({ error: 'Project not found' })
    res.json({ project })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/projects/:id', requireAuth, async (req, res) => {
  try {
    await Project.findOneAndDelete({ _id: req.params.id, userId: req.user._id })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Usage routes ──────────────────────────────────────────────────────────────
app.get('/api/usage', requireAuth, async (req, res) => {
  try {
    const { dayKey, resetsAt } = currentUsageDay()
    const record = await Usage.findOne({ userId: req.user._id, dayKey }).lean()
    const count = record?.count || 0
    res.json({ count, limit: DAILY_USAGE_LIMIT, remaining: Math.max(0, DAILY_USAGE_LIMIT - count), resetsAt })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Gemini API — shared config ─────────────────────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash'
const geminiUrl = model => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`

const SYSTEM_INSTRUCTION = `You are SHAZAM — the world's most advanced UI/UX Reverse-Engineering Intelligence. Your purpose is to deconstruct design screenshots into high-fidelity technical blueprints for AI coding agents (Cursor, Claude Code, v0, Lovable, etc.).

Your output must be a "Master Implementation Spec" that leaves zero room for AI hallucination.

### CORE OPERATING PROTOCOLS:
1. **NO PREAMBLE:** Start immediately with the technical spec. No "Sure, here is...", no markdown fences, no meta-commentary.
2. **PIXEL-PERFECT PRECISION:** If a gap looks like 16px, specify 16px. If a color is #F3F4F6, identify it. Use exact HEX codes.
3. **TAILWIND ARBITRARY VALUES:** Force the use of Tailwind arbitrary value classes (e.g., w-[342px], h-[120px], p-[24px], bg-[#F3F4F6]) instead of standard utility classes to ensure pixel-perfect matching with the screenshot.
4. **TECHNICAL VOCABULARY:** Use developer terms (Flexbox, CSS Grid, Z-index, Aspect-ratio, Line-height, Bezier curves, Design Tokens).
5. **NO ABSTRACTION:** Do not say "a blue button". Say "Button: bg-[#007AFF], text-white, px-[16px], py-[8px], rounded-[8px], font-semibold, shadow-[0_4px_14px_0_rgba(0,118,255,0.39)], hover:bg-[#0051A8] transition-all duration-200".

--- FORMATTING & READABILITY RULES ---
1. NO MARKDOWN SYMBOLS: Strictly avoid using "**" for bold or "*" for bullets.
2. PSEUDO-BOLD HEADERS: Use Unicode bold characters for section titles 
   (e.g., 𝐃𝐄𝐒𝐈𝐆𝐍 𝐓𝐎𝐊𝐄𝐍𝐒 instead of **DESIGN TOKENS**).
3. DASHED LISTS: Use a single hyphen (-) for all bullet points.
4. SPACING: Use double line breaks between major sections to ensure maximum scannability.
5. ALL CAPS: Use uppercase for sub-headers to create visual hierarchy without symbols.

### DECONSTRUCTION HIERARCHY:
- **GLOBAL DESIGN TOKENS:** Extract the exact color palette (HEX), typography scale (Font families, weights, sizes in rem/px), and border-radius system (e.g., 8px, 12px, 9999px).
- **LAYOUT ARCHITECTURE & SPACING MATH:** 
    - Define container widths, grid columns, and flex alignments.
    - **SPACING MATH:** Verify and enforce consistent internal padding and external margins across the design (e.g., "All cards must use exactly 24px internal padding").
    - **Z-INDEX & STACKING CONTEXT:** Explicitly identify "floating," "fixed," or "sticky" elements and assign them appropriate Z-index values to maintain the correct visual hierarchy.
- **COMPONENT CATEGORIZATION & DEEP-DIVE:** 
    - **CATEGORIZATION:** Group elements into semantic React components (e.g., Header.tsx, HeroSection.tsx, FeatureCard.tsx) to provide a clear file tree structure for the coding tool.
    - **VISUALS & SHADOW DECONSTRUCTION:** For every element, define borders (width/color) and opacity. 
    - **SHADOW DECONSTRUCTION:** Instead of "soft shadow," break it down exactly: box-shadow: [x-offset] [y-offset] [blur] [spread] [color].
    - **COPY-PASTE OCR:** Extract EVERY single piece of text from the image verbatim so the developer can copy-paste headings and body text directly.
    - **ICON CROSS-REFERENCING:** Map visual icons to the closest matching names in popular libraries like Lucide-React or Phosphor Icons.
- **INTERACTION & MOTION:** Describe hover states, active transitions, and expected animations (e.g., "Scale down to 0.95 on click, 150ms spring").
- **RESPONSIVE INFERENCE:** Suggest how the layout should collapse for mobile (e.g., "3-column grid becomes 1-column stack at 768px").
- **ACCESSIBILITY (A11Y):** Note contrast ratios and suggest ARIA roles for interactive elements.

### OUTPUT FORMAT:
[ENGINEER INSTRUCTION: Recreate this UI with pixel-perfect accuracy using Tailwind CSS and React.]
---
(Followed by structured sections: GLOBAL TOKENS, LAYOUT, COMPONENTS, INTERACTIONS)`;
function toGeminiParts(content) {
  const parts = Array.isArray(content) ? content : [{ type: 'text', text: content || '' }]
  return parts.map(part => {
    if (part.type === 'text') return { text: part.text || '' }
    if (part.type === 'image_url') {
      const url = part.image_url?.url || ''
      const match = /^data:(image\/[\w.+-]+);base64,([\s\S]+)$/.exec(url)
      if (!match) throw new Error('Gemini image inputs must be base64 data URLs.')
      return { inlineData: { mimeType: match[1], data: match[2] } }
    }
    throw new Error(`Unsupported Gemini content part: ${part.type || 'unknown'}`)
  })
}

async function callGemini(messages, maxTokens = 4096, temperature = 0.2) {
  if (!GEMINI_KEY) throw new Error('GEMINI_API_KEY is not set.')
  const systemText = messages.filter(message => message.role === 'system').map(message => message.content).join('\n\n')
  const contents = messages
    .filter(message => message.role !== 'system')
    .map(message => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: toGeminiParts(message.content) }))
  const body = {
      contents,
      ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
      generationConfig: { maxOutputTokens: maxTokens, temperature },
  }
  const models = [...new Set([GEMINI_MODEL, GEMINI_FALLBACK_MODEL])]

  for (const [modelIndex, model] of models.entries()) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await axios.post(
          geminiUrl(model),
          body,
          { headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_KEY }, timeout: 120000 }
        )
        const text = response.data?.candidates?.[0]?.content?.parts
          ?.map(part => part.text || '')
          .join('')
          .trim()
        if (!text) throw new Error('Empty response from Gemini API.')
        return text
      } catch (err) {
        if (!isGeminiTransientOverload(err)) throw err
        if (attempt === 0) {
          await new Promise(resolve => setTimeout(resolve, 600))
          continue
        }
        if (modelIndex === 0 && models.length > 1) {
          console.warn(`[Gemini] ${model} is busy; trying fallback model ${GEMINI_FALLBACK_MODEL}`)
          break
        }
        throw err
      }
    }
  }
  throw new Error('Gemini models are temporarily overloaded. Please try again shortly.')
}

function isGeminiTransientOverload(err) {
  const status = err?.response?.status
  const message = (err?.response?.data?.error?.message || err?.message || '').toLowerCase()
  if (status === 503 || /high demand|temporarily overloaded|service unavailable/.test(message)) return true
  return status === 429 && /per.?minute|rate.?limit|too many requests/.test(message)
}

function handleGeminiError(err, res) {
  const status = err?.response?.status
  const msg = err?.response?.data?.error?.message || err?.message || 'Unknown error'
  console.error('[Gemini]', status || '', msg)
  if (status === 401 || status === 403) return res.status(status).json({ error: 'Gemini rejected the API key. Check GEMINI_API_KEY in server/.env.' })
  if (status === 429) return res.status(429).json({ error: 'Gemini API quota reached. Please try again later.' })
  if (status === 503) return res.status(503).json({ error: 'Gemini is temporarily overloaded. Please try again shortly.' })
  if (status === 404 || status === 410) return res.status(503).json({ error: `Gemini model “${GEMINI_MODEL}” is unavailable. Set GEMINI_MODEL to a supported model.` })
  if (msg.includes('GEMINI_API_KEY is not set')) return res.status(500).json({ error: 'GEMINI_API_KEY is not set in server/.env.' })
  return res.status(500).json({ error: `Gemini error: ${msg}` })
}

// ── Analyze design ────────────────────────────────────────────────────────────
app.post('/api/analyze', requireAuth, async (req, res) => {
  const { images, designType } = req.body || {}
  if (!images?.length) return res.status(400).json({ error: 'No images provided.' })
  if (!(await enforceDailyUsage(req.user._id, res))) return

  const typeHint = designType && designType !== 'None (auto-detect)' ? `Design type: ${designType}\n\n` : ''
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

  const contentParts = [
    ...images.map(img => ({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType || 'image/png'};base64,${img.base64}` },
    })),
    { type: 'text', text: textPrompt },
  ]

  const messages = [
    { role: 'system', content: SYSTEM_INSTRUCTION },
    { role: 'user',   content: contentParts },
  ]

  try {
    const text = await callGemini(messages, 8192, 0.2)
    res.json({ prompt: text })
  } catch (err) {
    await releaseDailyUsage(req.user._id)
    handleGeminiError(err, res)
  }
})

// ── Fix prompt ────────────────────────────────────────────────────────────────
app.post('/api/fix-prompt', requireAuth, async (req, res) => {
  const { spec, issue, image } = req.body || {}
  if (!spec || !issue) return res.status(400).json({ error: 'spec and issue are required.' })
  if (!(await enforceDailyUsage(req.user._id, res))) return

  const content = []
  if (image?.base64) {
    content.push({ type: 'image_url', image_url: { url: `data:${image.mimeType || 'image/png'};base64,${image.base64}` } })
  }
  content.push({
    type: 'text',
    text: `Here is an implementation spec:\n\n${spec}\n\nThe user reports this issue:\n"${issue}"\n\n${image?.base64 ? 'Use the attached screenshot as additional context. ' : ''}Write a concise targeted fix prompt (2–5 sentences) that an AI coding assistant can paste to fix only this specific issue. Be precise about what to change and to what.`,
  })
  const messages = [{
    role: 'user',
    content,
  }]

  try {
    const text = await callGemini(messages, 512, 0.3)
    res.json({ fixPrompt: text })
  } catch (err) {
    await releaseDailyUsage(req.user._id)
    handleGeminiError(err, res)
  }
})

// ── Generate asset ─────────────────────────────────────────────────────────────
app.post('/api/generate-asset', requireAuth, async (req, res) => {
  const { label, type } = req.body || {}
  if (!label) return res.status(400).json({ error: 'label is required.' })
  if (!(await enforceDailyUsage(req.user._id, res))) return

  const isIcon  = type?.toLowerCase() === 'icon'
  const isPhoto = type?.toLowerCase() === 'photo'

  const prompt = isIcon
    ? `Generate a clean minimal SVG icon for: "${label}". Output raw SVG only, no explanation. viewBox="0 0 24 24" width="24" height="24". Stroke-based, stroke-width="1.5" stroke="currentColor" fill="none". strokeLinecap="round" strokeLinejoin="round". Start with <svg end with </svg>.`
    : isPhoto
    ? `Write a detailed AI image generation prompt for: "${label}". Single paragraph 2-4 sentences. Include subject, style, lighting, composition, background, colour, quality modifiers. Output only the prompt text.`
    : `Describe how to create this UI asset: "${label}". Be concise.`

  try {
    const text = await callGemini([{ role: 'user', content: prompt }], 1024, 0.4)
    res.json({ result: text, type: isIcon ? 'svg' : isPhoto ? 'image-prompt' : 'description' })
  } catch (err) {
    await releaseDailyUsage(req.user._id)
    handleGeminiError(err, res)
  }
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: GEMINI_MODEL, fallbackModel: GEMINI_FALLBACK_MODEL, hasKey: !!GEMINI_KEY })
})

// ── Serve built frontend in production ────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, '../dist')))
  app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\n⚡ SHAZAM server  →  http://localhost:${PORT}`)
  console.log(`   Model : ${GEMINI_MODEL} (fallback: ${GEMINI_FALLBACK_MODEL})`)
  console.log(`   Key   : ${GEMINI_KEY ? '✓ configured' : '✗ MISSING — add GEMINI_API_KEY to server/.env'}\n`)
})
