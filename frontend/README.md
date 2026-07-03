# AI Marketing Platform Frontend

A clean, Lovable-free Vite + React frontend for the AI Marketing Platform.

## Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Set `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Backend routes expected

- `/auth/login`, `/auth/register`, `/auth/me`
- `/dashboard/summary`
- `/chats`, `/chats/:chatId/full-results`
- `/chats/:chatId/growth-workspace/run-full-analysis`
- `/chats/:chatId/seo-intelligence/run`
- `/chats/:chatId/automation/demo`
- `/chats/:chatId/automation/generate-demo`

This frontend includes route fallbacks for older endpoint names where possible.
