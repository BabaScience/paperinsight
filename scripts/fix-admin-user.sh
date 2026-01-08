#!/bin/bash

# Quick script to fix admin user in MongoDB
# Usage: ./scripts/fix-admin-user.sh
# Reads ADMIN_EMAIL from .env file or uses default

# Load .env file if it exists
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

ADMIN_EMAIL=${ADMIN_EMAIL:-"contact.lunai.studio@gmail.com"}

echo "🔧 Fixing admin user in database..."
echo ""

# Try to get MongoDB URI from environment or use default
MONGO_URI=${MONGODB_URI:-"mongodb://localhost:27017/lunai"}

# Extract database name from URI
DB_NAME=$(echo $MONGO_URI | sed -n 's/.*\/\([^?]*\).*/\1/p')
if [ -z "$DB_NAME" ]; then
  DB_NAME="lunai"
fi

echo "📊 Database: $DB_NAME"
echo "📧 Admin email: $ADMIN_EMAIL"
echo ""

# Check if mongosh is available
if command -v mongosh &> /dev/null; then
  echo "Using mongosh..."
  mongosh "$MONGO_URI" --eval "
    const result = db.users.updateOne(
      { email: '$ADMIN_EMAIL' },
      { \$set: { isAdmin: true } }
    );
    print('Matched:', result.matchedCount);
    print('Modified:', result.modifiedCount);
    
    const user = db.users.findOne({ email: '$ADMIN_EMAIL' });
    if (user) {
      print('\\n✅ User found:');
      print('   Email:', user.email);
      print('   Name:', user.name);
      print('   isAdmin:', user.isAdmin);
    } else {
      print('\\n⚠️  User not found');
    }
  "
elif command -v mongo &> /dev/null; then
  echo "Using mongo (legacy)..."
  mongo "$DB_NAME" --eval "
    db.users.updateOne(
      { email: '$ADMIN_EMAIL' },
      { \$set: { isAdmin: true } }
    );
    var user = db.users.findOne({ email: '$ADMIN_EMAIL' });
    if (user) {
      print('✅ User updated:');
      print('   Email:', user.email);
      print('   Name:', user.name);
      print('   isAdmin:', user.isAdmin);
    } else {
      print('⚠️  User not found');
    }
  "
else
  echo "❌ Neither mongosh nor mongo found. Please install MongoDB shell tools."
  echo ""
  echo "Alternatively, run this command manually:"
  echo "mongosh $MONGO_URI --eval \"db.users.updateOne({email: '$ADMIN_EMAIL'}, {\$set: {isAdmin: true}})\""
  exit 1
fi

echo ""
echo "✅ Done! Please refresh your browser or log out and log back in."

