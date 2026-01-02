#!/bin/bash

# ===========================================
# DigitalOcean Droplet Initial Setup Script
# ===========================================
# Run this script on a fresh Ubuntu 22.04/24.04 droplet

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root"
    exit 1
fi

log_info "Starting DigitalOcean Droplet setup for LUNAI..."

# Update system
log_info "Updating system packages..."
apt-get update && apt-get upgrade -y

# Install required packages
log_info "Installing required packages..."
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban

# Install Docker
log_info "Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
rm get-docker.sh

# Install Docker Compose
log_info "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Enable Docker service
systemctl enable docker
systemctl start docker

# Configure firewall
log_info "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure fail2ban
log_info "Configuring fail2ban..."
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
EOF

systemctl enable fail2ban
systemctl restart fail2ban

# Create swap file (recommended for 1-2GB droplets)
log_info "Creating swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# Create app directory
log_info "Creating application directory..."
mkdir -p /opt/lunai
cd /opt/lunai

# Set up automatic security updates
log_info "Configuring automatic security updates..."
apt-get install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

log_info "✅ Droplet setup complete!"
echo ""
echo "================================================"
echo "Next steps:"
echo "================================================"
echo ""
echo "1. Clone your repository:"
echo "   cd /opt/lunai"
echo "   git clone https://github.com/yourusername/lunai.git ."
echo ""
echo "2. Copy and configure environment:"
echo "   cp .env.example .env"
echo "   nano .env"
echo ""
echo "3. Point your domain DNS to this droplet's IP"
echo ""
echo "4. Run the deployment script:"
echo "   chmod +x scripts/deploy.sh"
echo "   ./scripts/deploy.sh"
echo ""

