# TeamBuilder - AI-Powered Hackathon Team Formation Platform

A full-stack web application that helps hackathon participants find teammates using AI-powered matching and LangGraph agents.

## 🚀 Features

- **Smart Team Matching**: AI-powered teammate recommendations based on skills
- **LangGraph AI Agent**: Conversational AI for team building assistance
- **Project Management**: Create and manage hackathon projects
- **Real-time Messaging**: Send and receive team invitations
- **Profile System**: Showcase skills, experience, and availability
- **Google OAuth**: Secure authentication with Google Sign-In
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- React 18 with Vite
- React Router for navigation
- Axios for API calls
- Google OAuth integration
- Modern CSS with dark/light themes

### Backend
- Node.js + Express
- MongoDB with Mongoose
- JWT authentication
- LangGraph for AI agents
- Groq API for LLM
- Rate limiting & security (Helmet)

### AI/ML
- LangGraph StateGraph pipeline
- Multi-provider AI support (Groq, OpenAI, Claude, Gemini)
- Tool-calling architecture
- Skill-based matching algorithms

## 📋 Prerequisites

- Node.js 18+ 
- MongoDB Atlas account
- Google OAuth credentials
- Groq API key (or other AI provider)

## 🔧 Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd team-builder
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with backend URL and Google Client ID
npm run dev
```

### 4. Environment Variables

**Backend (.env):**
```env
PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_64_chars
JWT_REFRESH_SECRET=your_refresh_secret_64_chars
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GROQ_API_KEY=your_groq_api_key
AI_PROVIDER=groq
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:5001/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_PORT=3000
```

## 🌐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 Client ID
3. Add authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://your-domain.vercel.app` (production)
4. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `https://your-domain.vercel.app`
5. Copy Client ID and Secret to .env files

## 🚀 Deployment

### Deploy to Vercel

**Backend:**
```bash
cd backend
vercel
# Add environment variables in Vercel dashboard
```

**Frontend:**
```bash
cd frontend
vercel
# Add environment variables in Vercel dashboard
```

### Environment Variables for Production

Set these in Vercel dashboard:

**Backend:**
- All variables from .env
- Update `FRONTEND_URL` to your frontend Vercel URL
- Update `ALLOWED_ORIGINS` to your frontend Vercel URL

**Frontend:**
- `VITE_API_URL` = your backend Vercel URL + /api
- `VITE_GOOGLE_CLIENT_ID` = your Google Client ID

### MongoDB Atlas Setup

1. Create cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Add IP whitelist: `0.0.0.0/0` (for Vercel)
3. Create database user
4. Copy connection string to `MONGODB_URI`

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/google` - Login with Google OAuth
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Browse users (with filters)
- `GET /api/users/me` - Get own profile
- `PUT /api/users/me` - Update profile
- `GET /api/users/:id` - Get user by ID
- `DELETE /api/users/me` - Delete account

### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `GET /api/projects/user/mine` - Get my projects
- `POST /api/projects/:id/join` - Request to join
- `POST /api/projects/:id/accept/:userId` - Accept member
- `POST /api/projects/:id/reject/:userId` - Reject member
- `POST /api/projects/:id/leave` - Leave project

### Matching
- `POST /api/match/find` - Find matching users
- `GET /api/match/my-messages` - Get messages
- `POST /api/match/send` - Send invite
- `POST /api/match/:id/accept` - Accept invite
- `POST /api/match/:id/reject` - Reject invite

### AI Agent
- `POST /api/ai/chat` - Simple AI chat
- `POST /api/ai/draft` - Draft invite message
- `POST /api/ai/langgraph/chat` - LangGraph AI chat
- `POST /api/ai/langgraph/tools/match-candidates-by-skill` - Match tool
- `POST /api/ai/langgraph/tools/draft-intro-message` - Draft tool

## 🧪 Testing

### Local Testing
1. Start backend: `cd backend && npm run dev`
2. Start frontend: `cd frontend && npm run dev`
3. Open http://localhost:3000
4. Test features:
   - Register/Login
   - Complete profile
   - Create project
   - Browse users
   - Use AI agent
   - Send messages

### Production Testing
1. Deploy both frontend and backend
2. Update Google OAuth with production URLs
3. Test all features in production
4. Check Vercel logs for errors

## 🐛 Troubleshooting

### Google OAuth Blocked
- Ensure `http://localhost:3000` is in authorized origins
- Wait 5-10 minutes after updating Google Console
- Clear browser cache

### MongoDB Connection Failed
- Check connection string format
- Verify IP whitelist includes `0.0.0.0/0`
- Check database user credentials

### CORS Errors
- Verify `ALLOWED_ORIGINS` matches frontend URL exactly
- Check `FRONTEND_URL` is set correctly
- Ensure no trailing slashes

### AI Agent Not Working
- Verify `GROQ_API_KEY` is set
- Check `AI_PROVIDER=groq`
- Check API key is valid

## 📁 Project Structure

```
team-builder/
├── backend/
│   ├── middleware/       # Auth, validation, rate limiting
│   ├── models/          # MongoDB schemas
│   ├── routes/          # API endpoints
│   ├── server.js        # Express app
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/         # Axios client
│   │   ├── components/  # React components
│   │   ├── pages/       # Page components
│   │   ├── App.jsx      # Main app
│   │   └── index.css    # Styles
│   └── package.json
└── README.md
```

## 🔒 Security Features

- JWT with refresh tokens
- Password hashing (bcrypt)
- Rate limiting on API routes
- Helmet.js security headers
- CORS protection
- Input validation
- MongoDB injection prevention
- XSS protection

## 🎨 Design Features

- GitHub-inspired color scheme
- Dark/Light theme support
- Responsive design
- Professional UI
- Accessible (WCAG AA)
- Clean typography
- Smooth animations

## 📝 License

MIT License - see LICENSE file

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📧 Support

For issues and questions:
- Open GitHub issue
- Check documentation
- Review troubleshooting guide

## 🎯 Roadmap

- [ ] Real-time notifications
- [ ] WebSocket messaging
- [ ] Advanced AI features
- [ ] Team analytics
- [ ] Mobile app
- [ ] Email notifications

## ✅ Status

**Current Version:** 2.0.0  
**Status:** Production Ready  
**Last Updated:** 2024

---

Built with ❤️ for hackathon teams worldwide
