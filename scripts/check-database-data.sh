#!/bin/bash

# Quick script to check database data
# Usage: ./scripts/check-database-data.sh

MONGO_URI=${MONGODB_URI:-"mongodb://localhost:27017/lunai"}
DB_NAME=$(echo $MONGO_URI | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  DB_NAME="lunai"
fi

echo "📊 Checking database: $DB_NAME"
echo ""

if command -v mongosh &> /dev/null; then
  mongosh "$MONGO_URI" --eval "
    print('👥 Users:');
    print('   Total:', db.users.countDocuments());
    print('   Sample:', JSON.stringify(db.users.findOne({}, {email: 1, name: 1, isAdmin: 1, createdAt: 1}), null, 2));
    
    print('\\n📄 Papers:');
    print('   Total:', db.papers.countDocuments());
    print('   Sample:', JSON.stringify(db.papers.findOne({}, {title: 1, status: 1, createdAt: 1}), null, 2));
    
    print('\\n💬 Conversations:');
    print('   Total:', db.conversations.countDocuments());
  "
elif command -v mongo &> /dev/null; then
  mongo "$DB_NAME" --eval "
    print('👥 Users:', db.users.count());
    print('📄 Papers:', db.papers.count());
    print('💬 Conversations:', db.conversations.count());
  "
else
  echo "❌ MongoDB shell not found. Install mongosh or mongo."
fi

