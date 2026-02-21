# TeamBuilder Frontend

React + Vite + Google OAuth frontend

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your backend URL and Google Client ID
npm run dev
```

Open http://localhost:3000

## Environment Variables

Copy `.env.example` to `.env`:
- `VITE_API_URL` - Backend API URL (http://localhost:5001/api)
- `VITE_GOOGLE_CLIENT_ID` - From Google Cloud Console
- `VITE_PORT` - Port to run on (3000)

## Scripts

- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## Features

- Google OAuth + Email/Password login
- Dashboard with projects and users
- AI-powered team matching (LangGraph)
- Real-time project collaboration
- Profile management

## Deployment

See `../DEPLOYMENT_GUIDE.md`
