# SHAZAM

SHAZAM turns reference images into implementation prompts. The app has a React/Vite frontend and an Express API for authentication, project storage, prompt analysis, and asset generation.

## Requirements

- Node.js 20.19+ (or 22.12+)
- npm
- MongoDB, for accounts and saved projects
- A Gemini API key from Google AI Studio, for AI analysis and generation

## Setup

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create `server/.env`:

   ```dotenv
   PORT=3001
   FRONTEND_URL=http://localhost:5173
   MONGODB_URI=mongodb://127.0.0.1:27017/shazam
   GEMINI_API_KEY=your-google-ai-studio-key
   SESSION_SECRET=replace-with-a-long-random-secret
   ```

   Google sign-in is optional. To enable it, also set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback`.

3. Start the API and frontend in separate terminals:

   ```bash
   npm run dev:server
   ```

   ```bash
   npm run dev
   ```

   Open <http://localhost:5173>. The frontend talks to the API at `http://localhost:3001` by default. Set `VITE_API_URL` if the API is hosted elsewhere.

## Production

Build the frontend with `npm run build`, then run `npm start` with `NODE_ENV=production`. The Express server serves the `dist` directory as well as the API. Configure `FRONTEND_URL`, `MONGODB_URI`, `GEMINI_API_KEY`, and a strong `SESSION_SECRET` for the deployment. The `api/` directory contains separate serverless endpoints; its auth handler is only a placeholder, so use the Express server for account and session support.

## Main flows

1. Sign up or sign in. Accounts and projects require a reachable MongoDB database.
2. Upload up to five design images and choose an optional design type.
3. The API sends those images to Gemini and returns an implementation spec.
4. Save, edit, export, or copy the spec. The Fix Prompt and asset generation actions also use the API.

## Daily usage

SHAZAM is free to use. Each signed-in account can make up to 20 AI requests per UTC day across design analysis, Fix Prompt, and asset generation. The server enforces this limit, and the allowance resets at midnight UTC. Creating projects and editing saved prompts do not consume AI actions.

## Scripts

- `npm run dev` — Vite frontend
- `npm run dev:server` — Express API
- `npm run build` — production frontend build
- `npm run lint` — ESLint
- `npm start` — Express API and built frontend in production
