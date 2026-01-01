# PaperInsight

An AI-powered research paper analysis platform using RAG (Retrieval-Augmented Generation) architecture.

## Features

- **PDF Upload & Processing**: Upload research papers with automatic text extraction and chunking
- **RAG-Powered Q&A**: Ask questions about papers and get AI-generated answers with source citations
- **Intelligent Analysis**: Auto-generated summaries, key insights, methodology extraction
- **Real-time Processing**: WebSocket-based progress updates during paper processing
- **Modern UI**: Beautiful dark theme with smooth animations

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + Material-UI
- Zustand (state management)
- TanStack Query (data fetching)
- Framer Motion (animations)
- Socket.io Client

### Backend
- Node.js + Express + TypeScript
- MongoDB (document store)
- Redis (caching & queues)
- BullMQ (job processing)
- Socket.io (real-time)

### AI/ML
- OpenAI GPT-4 & text-embedding-3-large
- Qdrant (vector database)
- LangChain.js

## Prerequisites

- Node.js 20+
- Docker & Docker Compose
- OpenAI API Key

## Quick Start

### 1. Clone and Install

```bash
cd PaperInsight
npm install
```

### 2. Start Infrastructure

```bash
# Start MongoDB, Redis, and Qdrant
npm run docker:up
```

### 3. Configure Environment

Create a `.env` file in the `server` directory:

```env
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/paperinsight

# Redis
REDIS_URL=redis://localhost:6379

# Qdrant
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=papers

# OpenAI - Required!
OPENAI_API_KEY=sk-your-openai-api-key

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=./uploads
```

### 4. Start Development Servers

```bash
# Start both frontend and backend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Qdrant Dashboard: http://localhost:6333/dashboard

## Project Structure

```
PaperInsight/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── features/       # Feature modules
│   │   │   ├── auth/       # Login/Register
│   │   │   ├── dashboard/  # Dashboard
│   │   │   ├── library/    # Paper library
│   │   │   ├── upload/     # Upload interface
│   │   │   └── analysis/   # Analysis & Chat
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # API, socket, theme
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
│   │   │   ├── pdf.service.ts
│   │   │   ├── chunking.service.ts
│   │   │   ├── embedding.service.ts
│   │   │   ├── vector.service.ts
│   │   │   └── rag.service.ts
│   │   ├── socket/         # WebSocket handlers
│   │   ├── workers/        # BullMQ workers
│   │   └── utils/          # Helpers
│   └── package.json
├── docker-compose.yml      # Infrastructure services
└── package.json            # Root workspace
```

## API Endpoints

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
- `GET /api/papers/:id/conversation` - Get chat history

## Processing Pipeline

1. **Upload**: PDF file uploaded and stored
2. **Parse**: Text extraction and metadata detection
3. **Chunk**: Hierarchical chunking (sections → paragraphs → sentences)
4. **Embed**: Generate embeddings using OpenAI
5. **Index**: Store vectors in Qdrant
6. **Ready**: Paper available for querying

## Development

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

## License

MIT





