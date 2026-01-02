#!/bin/bash

# Ollama Model Initialization Script
# This script pulls the required models for the PaperInsight application

set -e  # Exit on error

echo "🦙 Initializing Ollama models for PaperInsight..."

# Wait for Ollama service to be ready
echo "⏳ Waiting for Ollama service to be ready..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
  if docker exec paperinsight-ollama ollama --version > /dev/null 2>&1; then
    echo "✅ Ollama service is ready!"
    break
  fi
  attempt=$((attempt + 1))
  echo "   Attempt $attempt/$max_attempts - waiting..."
  sleep 2
done

if [ $attempt -eq $max_attempts ]; then
  echo "❌ Ollama service did not start in time"
  exit 1
fi

# Pull LLM model (Llama 3.1 8B)
echo "📥 Pulling Llama 3.1 8B model (this may take a while)..."
if docker exec paperinsight-ollama ollama pull llama3.1:8b; then
  echo "✅ Llama 3.1 8B model pulled successfully!"
else
  echo "⚠️  Failed to pull Llama 3.1 8B model"
  exit 1
fi

# Pull embedding model (nomic-embed-text)
echo "📥 Pulling nomic-embed-text model..."
if docker exec paperinsight-ollama ollama pull nomic-embed-text; then
  echo "✅ nomic-embed-text model pulled successfully!"
else
  echo "⚠️  Failed to pull nomic-embed-text model"
  exit 1
fi

# List available models
echo "📋 Available Ollama models:"
docker exec paperinsight-ollama ollama list

echo ""
echo "🎉 Ollama initialization complete!"
echo "   You can now use Ollama models in PaperInsight"
echo ""
echo "   Models installed:"
echo "   - llama3.1:8b (LLM for chat and analysis)"
echo "   - nomic-embed-text (Embeddings)"
echo ""

