# AI Marketing Platform

A complete AI-powered marketing automation platform with Growth Workspace, SEO Intelligence, and Automation Center.

## Features

- **Growth Workspace**: Executive Summary, Opportunity Radar, Market Position, Audience Intelligence, Competitor Intelligence, Positioning Engine, Campaign Command Center, Growth Action Plan
- **SEO Intelligence**: Executive Dashboard, Technical SEO, Keyword Intelligence, Competitor SEO, Content Gap, Geo Intelligence, Blog Ideas, Action Plan
- **Automation Center**: Campaign Planning, Content Generation, Posters, Videos, Social Scheduling, Email Automation, Blog Automation, SEO Automation, Competitor Monitoring, AI Agents, Approval Center

## Tech Stack

### Backend
- Node.js + Express
- Prisma ORM
- PostgreSQL
- Redis (for queues)
- BullMQ (job queues)

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Recharts

## Deployment

### Backend (Render)
- Root Directory: backend
- Build Command: `npm install && npx prisma generate`
- Start Command: `npm run dev` or `npm start`
- Environment Variables:
  - DATABASE_URL
  - JWT_SECRET
  - PORT
  - CLIENT_URL
  - GROQ_API_KEY
  - GEMINI_API_KEY
  - TAVILY_API_KEY
  - EXA_API_KEY
  - FIRECRAWL_API_KEY
  - JINA_API_KEY
  - CEREBRAS_API_KEY
  - DEEPSEEK_API_KEY

### Frontend (Vercel)
- Root Directory: frontend
- Build Command: `npm run build`
- Output Directory: dist
- Environment Variable:
  - VITE_API_URL=https://your-backend-render-url/api
