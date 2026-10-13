<div align="center">

<img src="public/favicon.svg" width="96" alt="SHAZAM logo" />

# SHAZAM

**Turn design screenshots into implementation-ready UI specs and prompts.**

[![React](https://img.shields.io/badge/React-19-black?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-black?style=flat-square&logo=vite)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-4-black?style=flat-square&logo=express)](https://expressjs.com)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-black?style=flat-square&logo=mongodb)](https://www.mongodb.com)
[![Gemini](https://img.shields.io/badge/Gemini-AI-black?style=flat-square&logo=google)](https://ai.google.dev)
[![License](https://img.shields.io/badge/license-MIT-black?style=flat-square)](LICENSE)

</div>

---

## The Problem

Design teams move fast, but turning a reference image into a clean, production-ready UI implementation still takes a lot of back-and-forth. Common workflows usually look like this:

- a screenshot gets dropped into chat
- someone manually describes the layout, spacing, colors, and states
- the developer reconstructs it from memory
- the build gets revised over and over with tiny visual mismatches

SHAZAM solves that. Upload one or more reference images, choose a design type if needed, and the app analyzes the UI, extracts design tokens, and turns the result into a precise implementation spec that a developer can actually use.

This project takes the hard part out of reverse-engineering UI: structure, tokens, layout math, component breakdown, copy extraction, and implementation guidance are all condensed into one AI-powered workflow.

---

## Screenshots

<div align="center">

| Dashboard | Prompt Editor | Library | Settings |
|:---:|:---:|:---:|:---:|
| <div style="width:180px;height:220px;border-radius:18px;background:linear-gradient(135deg,#1a1a1a,#2c2c2c);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;letter-spacing:0.08em;">Dashboard</div> | <div style="width:180px;height:220px;border-radius:18px;background:linear-gradient(135deg,#111827,#1f2937);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;letter-spacing:0.08em;">Editor</div> | <div style="width:180px;height:220px;border-radius:18px;background:linear-gradient(135deg,#0f172a,#1e293b);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;letter-spacing:0.08em;">Library</div> | <div style="width:180px;height:220px;border-radius:18px;background:linear-gradient(135deg,#171717,#262626);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;letter-spacing:0.08em;">Settings</div> |

</div>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1 — Clone & Install](#1--clone--install)
  - [2 — Configure Environment](#2--configure-environment)
  - [3 — Run the App](#3--run-the-app)
- [Project Structure](#project-structure)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Visual UI Analysis
Upload design references and let the app deconstruct them into a structured implementation spec. SHAZAM identifies colors, spacing, shadows, typography, layout structure, and component grouping.

### AI Implementation Prompts
Turn screenshots into developer-friendly prompts with exact design guidance, responsive behavior notes, and React + Tailwind implementation direction.

### Project Saving & Reuse
Create saved projects, revisit earlier work, iterate on generated specs, and keep a clean library of design analysis results.

### Prompt Fixing
When a generated spec misses details or a design piece is off, you can feed the issue back into the AI and generate a corrected prompt quickly.

### Asset Generation Helper
Generate design asset guidance for SVG icons, photography prompts, and UI asset ideas from labels or prompts without leaving the app.

### Daily Usage Limits
The Express server tracks per-user AI actions per day to prevent abuse and keep usage predictable for each account.

### OAuth + Local Auth
Support for Google sign-in plus email/password accounts, with session-based authentication and MongoDB-backed persistence.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│              React + Vite Frontend          │
│  - Auth flow                                  │
│  - Dashboard + prompt editor                  │
│  - Saved projects + settings                 │
└───────────────────���──┬──────────────────────┘
                       │ HTTPS / Session
                       ▼
┌─────────────────────────────────────────────┐
│            Express API / Server              │
│  - Auth routes                               │
│  - Project CRUD                              │
│  - Usage enforcement                         │
│  - Gemini orchestration                      │
└───────────────┬─────────────────────────────┘
                │
                ├───────────────────────────────┐
                │                               │
                ▼                               ▼
┌──────────────────────┐        ┌────────────────────────────┐
│ MongoDB / Mongoose    │        │ Google Gemini API          │
│ - users               │        │ - analyze UI screenshots  │
│ - projects            │        │ - fix prompt generation    │
│ - usage tracking      │        │ - asset ideation           │
└──────────────────────┘        └────────────────────────────┘
```

**Key design decisions:**

- The frontend stays lightweight and focused on a clean, fast workflow for uploads, analysis, and editing.
- The server is the source of truth for auth, saved projects, usage throttling, and AI calls.
- Gemini is used as the design intelligence layer for analyzing image references and turning them into actionable specs.
- MongoDB handles persisting user accounts, saved work, and daily action counts.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite |
| Routing | React Router DOM |
| Backend | Express.js |
| Auth | Passport.js + Express Session |
| Database | MongoDB + Mongoose |
| AI | Google Gemini API |
| OAuth | Google Sign-In |
| Styling | Custom CSS + component-driven UI |
| Hosting | Vercel / Render friendly |

---

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm
- MongoDB instance for accounts and saved projects
- A [Gemini API key](https://aistudio.google.com/app/apikey)

---

### 1 — Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/shazam.git
cd shazam
npm install
```

---

### 2 — Configure Environment

Create `server/.env` from the project root:

```bash
PORT=3001
FRONTEND_URL=http://localhost:5173
MONGODB_URI=mongodb://127.0.0.1:27017/shazam
GEMINI_API_KEY=your-google-ai-studio-key
SESSION_SECRET=replace-with-a-long-random-secret
```

Optional Google sign-in setup:

```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

---

### 3 — Run the App

Start the API and frontend in separate terminals:

```bash
npm run dev:server
```

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```

The frontend talks to the API on `http://localhost:3001` by default. Set `VITE_API_URL` if the API is hosted elsewhere.

---

## Project Structure

```
shazam/
├── public/                  # Static assets and favicon
├── src/
│   ├── components/         # Reusable UI blocks
│   ├── contexts/           # Auth + project state providers
│   ├── lib/                # Helpers and shared utilities
│   ├── pages/              # Homepage, dashboard, editor, auth, settings
│   ├── App.jsx             # Route structure + protected routes
│   ├── index.css           # Global styling
│   ├── main.jsx            # App bootstrap
│   └── ...
├── server/
│   └── index.js            # Express server, auth, Mongo, Gemini integration
├── api/
│   └── package.json        # API companion package metadata
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── vite.config.js
├── README.md
└── LICENSE
```

---

## Roadmap

- [ ] Better parsing for dense or highly stylized dashboards
- [ ] Multi-image comparison and change tracking
- [ ] More structured export formats for developers and designers
- [ ] Team workspaces and shared project collaboration
- [ ] Prompt template library and reusable design patterns
- [ ] More advanced asset generation flows and UI variation modes

---

## Contributing

This project is open to contributions. If you find a bug, want to improve the analysis pipeline, or have an idea for a new workflow, open an issue first so the approach can be aligned before coding.

For pull requests:

```bash
# Fork the repo, then:
git checkout -b feat/your-feature-name
# Make your changes
git commit -m "feat: describe what you did"
git push origin feat/your-feature-name
# Open a PR against main
```

A few things that help PRs get merged faster:

- Keep changes focused and easy to review
- Follow the existing code style and lint rules
- Test auth, project flows, and AI integration changes on a real local setup

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">

Built by [Timmy](https://github.com/react-timmy)

</div>

