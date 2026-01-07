#!/bin/bash

# Migration script for Qdrant collections
# This script helps migrate from the old 'papers' collection to provider-specific collections

set -e

echo "🔄 Qdrant Collection Migration Script"
echo "======================================="
echo ""
echo "This script will check if you have the old 'papers' collection"
echo "and help you understand the migration to provider-specific collections."
echo ""

# Check if Qdrant is running
if ! curl -s http://localhost:6333/collections > /dev/null 2>&1; then
  echo "❌ Qdrant is not running on localhost:6333"
  echo "   Please start it with: docker-compose up -d qdrant"
  exit 1
fi

echo "✅ Qdrant is running"
echo ""

# Check for existing collections
echo "📋 Current collections:"
curl -s http://localhost:6333/collections | jq -r '.result.collections[].name' | while read -r collection; do
  count=$(curl -s "http://localhost:6333/collections/$collection" | jq -r '.result.points_count')
  echo "   - $collection ($count points)"
done

echo ""
echo "ℹ️  Migration Information:"
echo "   The new system uses provider-specific collections:"
echo "   - papers_openai (3072 dimensions) - for OpenAI embeddings"
echo "   - papers_ollama (768 dimensions) - for Ollama embeddings"
echo ""
echo "   If you have an old 'papers' collection, you have two options:"
echo ""
echo "   1. Keep it and let new papers use the new collections (recommended)"
echo "      - Existing papers remain accessible"
echo "      - New papers use provider-specific collections"
echo "      - No data loss"
echo ""
echo "   2. Delete it and re-process all papers"
echo "      - Cleans up old data"
echo "      - Requires re-uploading or re-processing papers"
echo "      - Papers will use the new collection system"
echo ""

# Check if old collection exists
if curl -s http://localhost:6333/collections/papers > /dev/null 2>&1; then
  OLD_COUNT=$(curl -s http://localhost:6333/collections/papers | jq -r '.result.points_count')
  echo "⚠️  Old 'papers' collection found with $OLD_COUNT points"
  echo ""
  echo "Would you like to delete the old collection? (y/N)"
  read -r response
  if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo "🗑️  Deleting old 'papers' collection..."
    curl -X DELETE http://localhost:6333/collections/papers
    echo "✅ Old collection deleted"
    echo "   You'll need to re-upload your papers or they won't have embeddings"
  else
    echo "✅ Keeping old collection (recommended)"
    echo "   It will remain accessible for backwards compatibility"
  fi
else
  echo "✅ No old 'papers' collection found - you're good to go!"
fi

echo ""
echo "✅ Migration complete!"
echo ""


