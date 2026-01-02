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

# Update nginx config with actual domain
log_info "Configuring nginx with domain: $DOMAIN"
sed -i "s/yourdomain.com/$DOMAIN/g" nginx/conf.d/app.conf

# Function to get initial SSL certificates
get_ssl_certs() {
    log_info "Obtaining SSL certificates for $DOMAIN..."
    
    # Start nginx temporarily for ACME challenge
    docker-compose -f docker-compose.prod.yml up -d nginx
    
    # Get certificates
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $ADMIN_EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -d api.$DOMAIN
    
    # Stop nginx
    docker-compose -f docker-compose.prod.yml down
}

# Check if SSL certificates exist
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    log_warn "SSL certificates not found. Obtaining new certificates..."
    
    # Create temporary nginx config for ACME challenge
    cat > nginx/conf.d/temp.conf << 'EOF'
server {
    listen 80;
    server_name _;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 200 'OK';
        add_header Content-Type text/plain;
    }
}
EOF
    
    # Remove the main config temporarily
    mv nginx/conf.d/app.conf nginx/conf.d/app.conf.bak
    
    get_ssl_certs
    
    # Restore main config
    rm nginx/conf.d/temp.conf
    mv nginx/conf.d/app.conf.bak nginx/conf.d/app.conf
fi

# Build and start all services
log_info "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

log_info "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
log_info "Waiting for services to start..."
sleep 10

# Check service health
log_info "Checking service health..."
services=(mongodb redis qdrant minio server client nginx)
for service in "${services[@]}"; do
    if docker-compose -f docker-compose.prod.yml ps | grep -q "${service}.*Up"; then
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

