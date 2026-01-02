# Ollama Model Switching Setup Guide

This guide explains how to set up and use the Ollama local LLM provider as an alternative to OpenAI in PaperInsight.

## Overview

PaperInsight now supports two LLM providers:
- **OpenAI GPT-4o**: Cloud-based, most capable, requires API credits
- **Ollama (Llama 3.1 8B)**: Local, free, good performance, runs on your machine

## Architecture

The system uses separate vector collections for each provider due to different embedding dimensions:
- OpenAI embeddings: 3072 dimensions
- Ollama embeddings: 768 dimensions

Collections are automatically managed as `papers_openai` and `papers_ollama`.

## Setup Instructions

### 1. Start Ollama Service

The Ollama service is already configured in `docker-compose.yml`. Start it with:

```bash
docker-compose up -d ollama
```

### 2. Pull Required Models

Run the initialization script to download the required models:

```bash
./scripts/init-ollama.sh
```

This will pull:
- `llama3.1:8b` - Main LLM for chat and analysis
- `nomic-embed-text` - Embedding model for vector search

**Note**: The first download may take 10-20 minutes depending on your internet speed (models are ~4-5GB total).

### 3. Configure Environment Variables

The following environment variables are already configured with defaults in `server/src/config/env.ts`:

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
DEFAULT_LLM_PROVIDER=openai  # Change to 'ollama' to make it default
```

### 4. Enable GPU Support (Optional)

For better performance, enable GPU support in `docker-compose.yml`:

```yaml
ollama:
  # ... other config
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

**Requirements**: 
- NVIDIA GPU
- nvidia-docker installed
- CUDA drivers

## User Configuration

### Setting Provider in Profile

Users can select their preferred LLM provider in their profile:

1. Navigate to **Profile** page
2. Scroll to **AI Model Provider** section
3. Choose between:
   - **OpenAI GPT-4o**: Best quality, requires API credits
   - **Ollama (Llama 3.1)**: Free, runs locally

The selected provider will be used for:
- Chat responses
- Paper analysis generation
- Visual diagram generation
- Implementation ideas generation
- All embeddings and vector searches

### Default Behavior

If no provider is selected in the user profile:
- System uses `DEFAULT_LLM_PROVIDER` from environment (default: `openai`)
- Users can switch at any time without losing data

## Technical Details

### LLM Service Architecture

```
User Request
    ↓
RAG Service (determines provider from user profile)
    ↓
LLM Service (routes to appropriate provider)
    ↓
OpenAI Provider OR Ollama Provider
    ↓
Response
```

### Embedding Service

Embeddings are generated using the same provider as the LLM:
- Ensures consistency in vector search
- Separate caching for each provider
- Automatic dimension handling

### Vector Collections

Papers are indexed in provider-specific collections:
- `papers_openai`: For OpenAI embeddings (3072D)
- `papers_ollama`: For Ollama embeddings (768D)

When a user switches providers:
- Existing papers remain accessible
- New embeddings are generated on-demand
- No data loss occurs

## Performance Considerations

### OpenAI
- **Latency**: ~1-3 seconds per request
- **Quality**: Highest
- **Cost**: Pay per token
- **Best for**: Production, highest quality needs

### Ollama
- **Latency**: ~5-15 seconds per request (first request slower)
- **Quality**: Good, suitable for most use cases
- **Cost**: Free (hardware cost only)
- **Best for**: Development, cost-sensitive deployments, privacy

### Optimization Tips

1. **Warm up Ollama**: First request is slower as model loads into memory
2. **Keep Ollama running**: Don't restart container frequently
3. **Use GPU**: Significantly faster with NVIDIA GPU
4. **Adjust batch sizes**: Smaller batches for Ollama (no batch embedding support)

## Troubleshooting

### Ollama service not responding

```bash
# Check if Ollama is running
docker ps | grep ollama

# Check Ollama logs
docker logs paperinsight-ollama

# Restart Ollama
docker-compose restart ollama
```

### Models not found

```bash
# List installed models
docker exec paperinsight-ollama ollama list

# Re-pull models
./scripts/init-ollama.sh
```

### Slow performance

1. Check if GPU is being used:
   ```bash
   docker exec paperinsight-ollama nvidia-smi
   ```

2. Monitor resource usage:
   ```bash
   docker stats paperinsight-ollama
   ```

3. Consider allocating more RAM to Docker

### Connection refused

- Ensure Ollama is running: `docker-compose ps`
- Check `OLLAMA_BASE_URL` in environment
- Verify port 11434 is not blocked

## Migration Notes

### Existing Papers

When switching providers:
- Papers remain in the database
- New embeddings are generated on first use with new provider
- Original embeddings are preserved
- No re-upload needed

### Switching Back

Users can switch between providers at any time:
- Profile setting takes effect immediately
- No data migration required
- Both providers can coexist

## API Compatibility

Both providers implement the same interface:
- `chat(params)`: Generate completion
- `chatStream(params, callbacks)`: Stream completion

This ensures seamless switching without code changes.

## Security Notes

### OpenAI
- API key stored in environment
- Data sent to OpenAI servers
- Subject to OpenAI's data policies

### Ollama
- Runs entirely locally
- No data leaves your infrastructure
- Full control over data privacy
- Suitable for sensitive research papers

## Future Enhancements

Potential improvements:
- Support for additional Ollama models (Mistral, Mixtral, etc.)
- Model selection per request type (different models for chat vs. analysis)
- Hybrid mode (OpenAI for complex tasks, Ollama for simple ones)
- Fine-tuned models for research paper analysis
- Automatic provider selection based on task complexity

## Resources

- [Ollama Documentation](https://ollama.ai/docs)
- [Llama 3.1 Model Card](https://ollama.ai/library/llama3.1)
- [nomic-embed-text Model](https://ollama.ai/library/nomic-embed-text)
- [Docker GPU Support](https://docs.docker.com/config/containers/resource_constraints/#gpu)

