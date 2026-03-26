import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import axios from 'axios'
import crypto from 'crypto'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import mongoose from 'mongoose'
import MongoStore from 'connect-mongo'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '.env') })

const app  = express()
const PORT = process.env.PORT || 3001

// ── MongoDB ───────────────────────────────────────────────────────────────────
const MONGO_URI = process.env.MONGODB_URI
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
  plan:          { type: String, default: 'FREE' },
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
  yearMonth: String, // e.g. "2026-2"
  count:     { type: Number, default: 0 },
})
const Usage = mongoose.models.Usage || mongoose.model('Usage', usageSchema)

// ── Middleware ─────────────────────────────────────────────────────────────────
app.set('trust proxy', 1) // Required for Railway/Render proxy

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json({ limit: '25mb' }))

app.use(session({
  secret: process.env.SESSION_SECRET || 'shazam-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  store: MONGO_URI
    ? MongoStore.create({ mongoUrl: MONGO_URI })
    : undefined,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}))

app.use(passport.initialize())
app.use(passport.session())

// ── Passport Google OAuth ─────────────────────────────────────────────────────
passport.use(new GoogleStrategy(
  {
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:  process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/auth/google/callback',
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
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=auth_failed' }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173')
  }
)

app.get('/auth/me', (req, res) => {
  if (!req.user) return res.json({ user: null })
  const { _id, name, email, avatar, plan, createdAt } = req.user
  res.json({ user: { id: _id, name, email, avatar, plan, createdAt } })
})

app.post('/auth/logout', (req, res) => {
  req.logout(() => res.json({ ok: true }))
})


// ── Email / password signup ───────────────────────────────────────────────────
app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' })

    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' })

    const passwordHash = crypto.createHash('sha256').update(password).digest('hex')
    const user = await User.create({ name, email, passwordHash })

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login after signup failed.' })
      const { _id, name, email: em, avatar, plan, createdAt } = user
      res.json({ user: { id: _id, name, email: em, avatar, plan, createdAt } })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── Email / password login ────────────────────────────────────────────────────
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

    const user = await User.findOne({ email })
    if (!user) return res.status(401).json({ error: 'Incorrect email or password.' })
    if (!user.passwordHash) return res.status(401).json({ error: 'This account uses Google sign-in. Please use "Continue with Google".' })

    const hash = crypto.createHash('sha256').update(password).digest('hex')
    if (hash !== user.passwordHash) return res.status(401).json({ error: 'Incorrect email or password.' })

    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed.' })
      const { _id, name, email: em, avatar, plan, createdAt } = user
      res.json({ user: { id: _id, name, email: em, avatar, plan, createdAt } })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})


// ── Form-based signup / login ─────────────────────────────────────────────────
// Simple SHA-256 hash (no bcrypt dep needed — good enough for MVP)
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')
}

app.post('/auth/signup', async (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' })
  }
  try {
    const existing = await User.findOne({ email })
    if (existing) return res.status(400).json({ error: 'An account with this email already exists.' })

    const hashed = await hashPassword(password)
    const user = await User.create({ name, email, password: hashed })

    // Log them in immediately
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Signup succeeded but login failed.' })
      const { _id, name, email, avatar, plan, createdAt } = user
      res.json({ user: { id: _id, name, email, avatar, plan, createdAt } })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  try {
    const user = await User.findOne({ email })
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }
    const hashed = await hashPassword(password)
    if (hashed !== user.password) {
      return res.status(401).json({ error: 'Incorrect email or password.' })
    }
    req.login(user, (err) => {
      if (err) return res.status(500).json({ error: 'Login failed.' })
      const { _id, name, email, avatar, plan, createdAt } = user
      res.json({ user: { id: _id, name, email, avatar, plan, createdAt } })
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── User routes ───────────────────────────────────────────────────────────────
app.patch('/api/user', requireAuth, async (req, res) => {
  try {
    const { name, plan, avatar } = req.body
    const updates = {}
    if (name)   updates.name   = name
    if (plan)   updates.plan   = plan
    if (avatar) updates.avatar = avatar
    const updated = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).lean()
    res.json({ user: { id: updated._id, name: updated.name, email: updated.email, avatar: updated.avatar, plan: updated.plan, createdAt: updated.createdAt } })
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
    const count = await Project.countDocuments({ userId: req.user._id })
    if (count >= 5) return res.status(400).json({ error: 'You have reached the 5 project limit on the free plan.' })
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
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${now.getMonth()}`
    const record = await Usage.findOne({ userId: req.user._id, yearMonth }).lean()
    res.json({ count: record?.count || 0 })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/usage/track', requireAuth, async (req, res) => {
  try {
    const now = new Date()
    const yearMonth = `${now.getFullYear()}-${now.getMonth()}`
    const record = await Usage.findOneAndUpdate(
      { userId: req.user._id, yearMonth },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    )
    res.json({ count: record.count })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── NVIDIA NIM — shared config ────────────────────────────────────────────────
const NVIDIA_KEY = process.env.NVIDIA_API_KEY
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const NVIDIA_MODEL = 'google/gemma-3n-e4b-it'

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
    - **CATEGORIZATION:** Group elements into semantic React components (e.g., Header.tsx, HeroSection.tsx, PricingCard.tsx) to provide a clear file tree structure for the coding tool.
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
async function callNvidia(messages, maxTokens = 4096, temperature = 0.2) {
  if (!NVIDIA_KEY) throw new Error('NVIDIA_API_KEY is not set.')
  const response = await axios.post(
    NVIDIA_URL,
    { model: NVIDIA_MODEL, messages, max_tokens: maxTokens, temperature, top_p: 1.0, stream: false },
    { headers: { Authorization: `Bearer ${NVIDIA_KEY}`, 'Content-Type': 'application/json' }, timeout: 120000 }
  )
  const text = response.data?.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from NVIDIA API.')
  return text
}

function handleNvidiaError(err, res) {
  const msg = err?.message || 'Unknown error'
  const status = err?.response?.status
  console.error('[NVIDIA]', status || '', msg)
  if (status === 401) return res.status(401).json({ error: 'Invalid NVIDIA_API_KEY.' })
  if (status === 429) return res.status(429).json({ error: 'NVIDIA quota exceeded. Wait a moment and try again.' })
  if (msg.includes('NVIDIA_API_KEY is not set')) return res.status(500).json({ error: 'NVIDIA_API_KEY is not set in environment variables.' })
  return res.status(500).json({ error: `NVIDIA error: ${msg}` })
}

// ── Analyze design ────────────────────────────────────────────────────────────
app.post('/api/analyze', requireAuth, async (req, res) => {
  const { images, designType } = req.body || {}
  if (!images?.length) return res.status(400).json({ error: 'No images provided.' })

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
    const text = await callNvidia(messages, 8192, 0.2)
    res.json({ prompt: text })
  } catch (err) {
    handleNvidiaError(err, res)
  }
})

// ── Fix prompt ────────────────────────────────────────────────────────────────
app.post('/api/fix-prompt', requireAuth, async (req, res) => {
  const { spec, issue } = req.body || {}
  if (!spec || !issue) return res.status(400).json({ error: 'spec and issue are required.' })

  const messages = [{
    role: 'user',
    content: `Here is an implementation spec:\n\n${spec}\n\nThe user reports this issue:\n"${issue}"\n\nWrite a concise targeted fix prompt (2–5 sentences) that an AI coding assistant can paste to fix only this specific issue. Be precise about what to change and to what.`,
  }]

  try {
    const text = await callNvidia(messages, 512, 0.3)
    res.json({ fixPrompt: text })
  } catch (err) {
    handleNvidiaError(err, res)
  }
})

// ── Generate asset ─────────────────────────────────────────────────────────────
app.post('/api/generate-asset', requireAuth, async (req, res) => {
  const { label, type } = req.body || {}
  if (!label) return res.status(400).json({ error: 'label is required.' })

  const isIcon  = type?.toLowerCase() === 'icon'
  const isPhoto = type?.toLowerCase() === 'photo'

  const prompt = isIcon
    ? `Generate a clean minimal SVG icon for: "${label}". Output raw SVG only, no explanation. viewBox="0 0 24 24" width="24" height="24". Stroke-based, stroke-width="1.5" stroke="currentColor" fill="none". strokeLinecap="round" strokeLinejoin="round". Start with <svg end with </svg>.`
    : isPhoto
    ? `Write a detailed AI image generation prompt for: "${label}". Single paragraph 2-4 sentences. Include subject, style, lighting, composition, background, colour, quality modifiers. Output only the prompt text.`
    : `Describe how to create this UI asset: "${label}". Be concise.`

  try {
    const text = await callNvidia([{ role: 'user', content: prompt }], 1024, 0.4)
    res.json({ result: text, type: isIcon ? 'svg' : isPhoto ? 'image-prompt' : 'description' })
  } catch (err) {
    handleNvidiaError(err, res)
  }
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: NVIDIA_MODEL, hasKey: !!NVIDIA_KEY })
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
  console.log(`   Model : ${NVIDIA_MODEL}`)
  console.log(`   Key   : ${NVIDIA_KEY ? '✓ configured' : '✗ MISSING — add NVIDIA_API_KEY to server/.env'}\n`)
})
