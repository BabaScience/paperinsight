#!/bin/bash

# ===========================================
# LUNAI Deployment Script
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root or with sudo"
    exit 1
fi

# Check required commands
for cmd in docker docker-compose; do
    if ! command -v $cmd &> /dev/null; then
        log_error "$cmd is not installed"
        exit 1
    fi
done

# Check if .env file exists
if [ ! -f .env ]; then
    log_error ".env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Load environment variables
source .env

# Validate required environment variables
required_vars=(
    "DOMAIN"
    "JWT_SECRET"
    "JWT_REFRESH_SECRET"
    "OPENAI_API_KEY"
    "MINIO_ACCESS_KEY"
    "MINIO_SECRET_KEY"
    "ADMIN_EMAIL"
)

# Optional but recommended for Google OAuth
optional_vars=(
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "GOOGLE_REDIRECT_URI"
)

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

log_info "Starting LUNAI deployment..."

# Create required directories
log_info "Creating directories..."
mkdir -p certbot/www certbot/conf nginx/conf.d

# Restore nginx config from git if missing
if [ ! -f "nginx/conf.d/app.conf" ]; then
    log_info "Restoring nginx config..."
    git checkout HEAD -- nginx/conf.d/app.conf 2>/dev/null || true
fi

# Update nginx config with actual domain (only if not already done)
if grep -q "yourdomain.com" nginx/conf.d/app.conf 2>/dev/null; then
    log_info "Configuring nginx with domain: $DOMAIN"
    sed -i "s/yourdomain.com/$DOMAIN/g" nginx/conf.d/app.conf
fi

# Check if SSL certificates exist
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    log_warn "SSL certificates not found. Obtaining new certificates..."
    
    # Stop any running services that might use port 80
    log_info "Stopping any services on port 80..."
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    
    # Make sure port 80 is free
    fuser -k 80/tcp 2>/dev/null || true
    sleep 2
    
    # Get certificates using standalone mode (no nginx needed)
    log_info "Obtaining SSL certificates for $DOMAIN using standalone mode..."
    docker run --rm \
        -p 80:80 \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --standalone \
        --email $ADMIN_EMAIL \
        --agree-tos \
        --no-eff-email \
        --non-interactive \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d api.$DOMAIN
    
    if [ $? -eq 0 ]; then
        log_info "✅ SSL certificates obtained successfully!"
    else
        log_error "Failed to obtain SSL certificates. Please check:"
        log_error "  1. DNS records point to this server"
        log_error "  2. Port 80 is accessible from the internet"
        log_error "  3. Domain names are correct"
        exit 1
    fi
else
    log_info "SSL certificates found for $DOMAIN"
fi

# Build and start all services
log_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build

log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 15

# Check service health
log_info "Checking service health..."
services=(mongodb redis qdrant minio server client nginx)
for service in "${services[@]}"; do
    container_name="lunai-${service}"
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        log_info "✅ $service is running"
    else
        log_warn "⚠️  $service may not be running correctly"
    fi
done

# Show status
log_info "Deployment complete!"
echo ""
echo "================================================"
echo "🚀 LUNAI is now running!"
echo "================================================"
echo ""
echo "Frontend: https://$DOMAIN"
echo "API:      https://api.$DOMAIN"
echo ""
echo "To view logs:     docker-compose -f docker-compose.prod.yml logs -f"
echo "To stop:          docker-compose -f docker-compose.prod.yml down"
echo "To restart:       docker-compose -f docker-compose.prod.yml restart"
echo ""
