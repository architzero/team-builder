# TeamBuilder Backend

Express.js + MongoDB + LangGraph AI backend

## Quick Start

```bash
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- `MONGODB_URI` - MongoDB Atlas connection string
- `JWT_SECRET` - Random 64-char string
- `GOOGLE_CLIENT_ID` - From Google Cloud Console
- `GROQ_API_KEY` - From Groq API

## Scripts

- `npm run dev` - Development with nodemon
- `npm start` - Production
- `npm run seed` - Seed database with sample data

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/google` - Google OAuth
- `GET /api/users` - Browse users
- `GET /api/projects` - Browse projects
- `POST /api/ai/langgraph/chat` - AI agent chat
- `POST /api/match/send` - Send invite

## Deployment

See `../DEPLOYMENT_GUIDE.md`
