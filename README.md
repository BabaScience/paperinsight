# 🌙 LUNAI

> **Lune** (Moon in French) + **AI** = Illuminating research in the dark

An AI-powered research paper analysis platform using RAG (Retrieval-Augmented Generation) architecture.

## ✨ Features

- **PDF Upload & Processing**: Upload research papers with automatic text extraction and chunking
- **RAG-Powered Q&A**: Ask questions about papers and get AI-generated answers with source citations
- **Intelligent Analysis**: Auto-generated summaries, key insights, methodology extraction
- **Visual Diagrams**: AI-generated Mermaid diagrams to visualize paper concepts
- **Research Ideas**: Get AI-suggested research directions based on paper content
- **Multi-LLM Support**: Choose between OpenAI GPT-4o or DeepSeek
- **Token Management**: Per-user token limits with extension requests
- **Real-time Processing**: WebSocket-based progress updates during paper processing
- **Modern UI**: Beautiful dark/light theme with smooth animations
- **i18n Support**: English and French translations

## 🛠 Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + Material-UI
- Zustand (state management)
- TanStack Query (data fetching)
- Framer Motion (animations)
- Socket.io Client
- Mermaid.js (diagrams)

### Backend
- Node.js + Express + TypeScript
- MongoDB (document store)
- Redis (caching & queues)
- BullMQ (job processing)
- Socket.io (real-time)
- Resend (email notifications)

### AI/ML
- OpenAI GPT-4o & text-embedding-3-large
- DeepSeek Chat (alternative)
- Qdrant (vector database)
- LangChain.js

### Storage
- MinIO (object storage for PDFs)

## 📋 Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenAI API Key (and/or DeepSeek API Key)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/lunai.git
cd lunai
npm install
```

### 2. Start Infrastructure

```bash
# Start MongoDB, Redis, Qdrant, and MinIO
npm run docker:up
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```env
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/lunai

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=papers

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=lunai
MINIO_SECRET_KEY=lunai123
MINIO_BUCKET=lunai

# OpenAI - Required!
OPENAI_API_KEY=sk-your-openai-api-key

# DeepSeek (optional)
DEEPSEEK_API_KEY=your-deepseek-api-key

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Token Limits
USER_TOKEN_ALLOWANCE=50000
DEFAULT_TOKEN_LIMIT=2000

# File Upload
MAX_FILE_SIZE=52428800
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Qdrant Dashboard: http://localhost:6333/dashboard
- MinIO Console: http://localhost:9001

## 📁 Project Structure

```
LUNAI/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── features/       # Feature modules
│   │   │   ├── auth/       # Login/Register
│   │   │   ├── dashboard/  # Dashboard
│   │   │   ├── library/    # Paper library
│   │   │   ├── upload/     # Upload interface
│   │   │   ├── analysis/   # Analysis & Chat
│   │   │   └── profile/    # User profile
│   │   ├── lib/            # API, socket, theme
│   │   ├── locales/        # i18n translations
│   │   ├── stores/         # Zustand stores
│   │   └── styles/         # Global styles
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── config/         # Database, env configs
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation
│   │   ├── models/         # Mongoose schemas
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   │   ├── llm/        # LLM providers
│   │   │   ├── pdf.service.ts
│   │   │   ├── chunking.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── vector.service.ts
│   │   │   ├── rag.service.ts
│   │   │   ├── token.service.ts
│   │   │   └── email.service.ts
│   │   ├── socket/         # WebSocket handlers
│   │   ├── workers/        # BullMQ workers
│   │   └── utils/          # Helpers
│   └── package.json
├── nginx/                  # Production nginx config
├── scripts/                # Deployment scripts
├── docker-compose.yml      # Development infrastructure
├── docker-compose.prod.yml # Production stack
├── DEPLOYMENT.md           # Deployment guide
└── package.json            # Root workspace
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh tokens
- `GET /api/auth/me` - Get current user

### Papers
- `POST /api/papers/upload` - Upload PDF
- `GET /api/papers` - List papers (paginated)
- `GET /api/papers/:id` - Get paper details
- `DELETE /api/papers/:id` - Delete paper
- `POST /api/papers/:id/query` - RAG query (streaming)
- `GET /api/papers/:id/analysis` - Get AI analysis
- `GET /api/papers/:id/visuals` - Get AI-generated diagrams
- `GET /api/papers/:id/ideas` - Get research ideas

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `GET /api/profile/tokens` - Get token usage
- `POST /api/profile/tokens/request` - Request token extension

## ⚙️ Processing Pipeline

1. **Upload**: PDF file uploaded to MinIO
2. **Parse**: Text extraction and metadata detection
3. **Chunk**: Hierarchical chunking (sections → paragraphs → sentences)
4. **Embed**: Generate embeddings using OpenAI
5. **Index**: Store vectors in Qdrant
6. **Ready**: Paper available for querying

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to DigitalOcean.

```bash
# Quick deploy
./scripts/deploy.sh
```

## 💻 Development

```bash
# Frontend only
npm run dev:client

# Backend only
npm run dev:server

# Both
npm run dev

# Stop infrastructure
npm run docker:down
```

## 📝 License

MIT
