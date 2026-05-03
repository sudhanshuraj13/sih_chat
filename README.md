# SIH Assistant — Smart India Hackathon RAG Chatbot

A production-ready AI chatbot designed to help users query and understand problem statements, themes, and organizations from the Smart India Hackathon (SIH). Built using a Retrieval-Augmented Generation (RAG) architecture, it leverages semantic search and Large Language Models to provide highly accurate, grounded answers.

![SIH Assistant](https://img.shields.io/badge/Next.js-16%20(Turbopack)-black?style=for-the-badge&logo=next.js)
![AI SDK](https://img.shields.io/badge/Vercel%20AI%20SDK-v6-black?style=for-the-badge&logo=vercel)
![Groq](https://img.shields.io/badge/Groq-Llama--3.3--70b-f55036?style=for-the-badge)
![Vectra](https://img.shields.io/badge/Vectra-Vector%20Store-0ea5e9?style=for-the-badge)

## ✨ Features

- **Hybrid Search Architecture**: Combines exact ID matching (e.g., "SIH25050") with semantic vector search for high-precision retrieval.
- **Premium UI/UX**: Custom glassmorphism design with a dark blue (`#002449`) color palette, fluid micro-animations, and dynamic status indicators.
- **Real-time Streaming**: Instantaneous token-by-token text generation powered by the Vercel AI SDK v6.
- **Local Vector Database**: Uses [Vectra](https://github.com/Stevenic/vectra) to store embeddings locally on disk (`.vectra/`), avoiding expensive cloud vector DB costs.
- **On-Device Embeddings**: Generates embeddings locally using `@xenova/transformers` (`all-MiniLM-L6-v2`) — no API calls required for vectorization.
- **Groq LLM Backend**: Uses `llama-3.3-70b-versatile` via Groq for blazing-fast inference and reasoning.

## 🛠 Tech Stack

- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Lucide Icons
- **Backend**: Next.js Route Handlers
- **AI Integration**: Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/groq`)
- **RAG / Embeddings**: Vectra, Hugging Face Transformers (`@xenova/transformers`)

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- A [Groq API Key](https://console.groq.com/keys)

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory and add your Groq API key:

```env
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Data Ingestion (Building the Vector Store)

Before running the chatbot, you must populate the vector database. The application expects raw JSON data files in the `data/` directory (e.g., `data/ps_data.json`).

Run the ingestion script to create embeddings and save them to the `.vectra` folder:

```bash
npm run ingest
```
*(Note: This process may take a few minutes depending on the size of your dataset, as it generates embeddings locally).*

### 5. Running the Development Server

Start the Next.js development server with Turbopack:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to start chatting with the SIH Assistant!

## 📂 Project Structure

- `src/app/page.tsx`: The main chat interface with the glassmorphism UI.
- `src/app/api/chat/route.ts`: The RAG backend route handling hybrid search and LLM streaming.
- `src/lib/vectorStore.ts`: Utility for managing the Vectra local vector index and generating embeddings.
- `scripts/ingest.ts`: Script to parse JSON data and build the vector store.
- `data/`: Directory for raw JSON data files (`ps_data.json`).
- `.vectra/`: The generated local vector database (git-ignored).

## 💡 How Hybrid Search Works

Embedding models are excellent for semantic meaning but struggle with exact alphanumeric IDs (like "SIH25050"). This project solves this using a Hybrid Search approach in the `/api/chat` route:
1. **Regex Extraction**: Identifies SIH numbers in the user's prompt.
2. **Exact Match**: Bypasses the vector DB to pull exact problem statements directly from the JSON files.
3. **Semantic Search**: Supplements the context using Vectra vector search for conceptual queries (e.g., "Healthcare projects using AI").
4. **Context Injection**: Feeds both results into the Groq LLM to generate a grounded response.
