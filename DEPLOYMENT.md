# LUNAI Deployment Guide

Deploy LUNAI on a DigitalOcean Droplet with Docker, Nginx, and SSL.

## Prerequisites

- DigitalOcean account
- Domain name pointed to your droplet
- SSH access to the droplet

## Recommended Droplet Specs

| Environment | CPU | RAM | Storage |
|-------------|-----|-----|---------|
| Minimum | 2 vCPU | 4 GB | 50 GB SSD |
| Recommended | 4 vCPU | 8 GB | 100 GB SSD |

## Quick Start

### 1. Create a Droplet

Create an Ubuntu 22.04 or 24.04 droplet on DigitalOcean.

### 2. Initial Server Setup

SSH into your droplet and run the setup script:

```bash
# Download and run setup script
curl -sSL https://raw.githubusercontent.com/yourusername/lunai/main/scripts/setup-droplet.sh | sudo bash
```

Or manually:

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com | sudo sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Configure firewall
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### 3. Clone the Repository

```bash
cd /opt
sudo git clone https://github.com/yourusername/lunai.git
cd lunai
```

### 4. Configure Environment

```bash
# Copy example environment file
sudo cp .env.production.example .env

# Edit with your values
sudo nano .env
```

**Required environment variables:**

| Variable | Description |
|----------|-------------|
| `DOMAIN` | Your domain (e.g., `lunai.com`) |
| `JWT_SECRET` | Random secret for JWT tokens |
| `JWT_REFRESH_SECRET` | Random secret for refresh tokens |
| `OPENAI_API_KEY` | Your OpenAI API key |
| `MINIO_SECRET_KEY` | Strong password for MinIO |
| `ADMIN_EMAIL` | Email for SSL certificates & notifications |

Generate secure secrets:
```bash
openssl rand -base64 64
```

### 5. Configure DNS

Add these DNS records pointing to your droplet's IP:

| Type | Name | Value |
|------|------|-------|
| A | @ | Your Droplet IP |
| A | www | Your Droplet IP |
| A | api | Your Droplet IP |

Wait for DNS propagation (can take up to 24 hours).

### 6. Update Nginx Configuration

Edit the Nginx config with your domain:

```bash
# Replace yourdomain.com with your actual domain
sudo sed -i 's/yourdomain.com/your-actual-domain.com/g' nginx/conf.d/app.conf
```

### 7. Deploy

```bash
sudo chmod +x scripts/deploy.sh
sudo ./scripts/deploy.sh
```

The script will:
1. Build Docker images
2. Obtain SSL certificates via Let's Encrypt
3. Start all services

### 8. Verify Deployment

```bash
# Check all services are running
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Test the API
curl https://api.yourdomain.com/health
```

## Management Commands

```bash
# View logs
docker-compose -f docker-compose.prod.yml logs -f [service]

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Access MongoDB shell
docker exec -it lunai-mongodb mongosh lunai

# Backup MongoDB
docker exec lunai-mongodb mongodump --out=/backup
docker cp lunai-mongodb:/backup ./backup
```

## SSL Certificate Renewal

Certificates are automatically renewed by the Certbot container. To manually renew:

```bash
docker-compose -f docker-compose.prod.yml run --rm certbot renew
docker-compose -f docker-compose.prod.yml restart nginx
```

## Monitoring

### Check Service Health

```bash
# All services
docker-compose -f docker-compose.prod.yml ps

# Individual service logs
docker logs lunai-server -f
docker logs lunai-nginx -f
```

### Resource Usage

```bash
docker stats
```

## Troubleshooting

### Services not starting

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check disk space
df -h

# Check memory
free -m
```

### SSL certificate issues

```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml run --rm certbot certificates

# Force renewal
docker-compose -f docker-compose.prod.yml run --rm certbot renew --force-renewal
```

### Database connection issues

```bash
# Check MongoDB logs
docker logs lunai-mongodb

# Check if MongoDB is healthy
docker exec lunai-mongodb mongosh --eval "db.adminCommand('ping')"
```

## Scaling

For higher traffic, consider:

1. **Upgrade Droplet**: Resize to a larger droplet
2. **Managed Database**: Use DigitalOcean Managed MongoDB
3. **Load Balancer**: Add DigitalOcean Load Balancer
4. **Multiple Droplets**: Deploy across multiple droplets

## Security Checklist

- [ ] Strong passwords in `.env`
- [ ] Firewall enabled (UFW)
- [ ] Fail2ban configured
- [ ] SSH key authentication only
- [ ] Regular system updates
- [ ] Regular backups
- [ ] Monitor logs for suspicious activity

## CI/CD with GitHub Actions

The project includes a GitHub Actions workflow that automatically deploys to production when code is pushed to the `main` branch.

### Configure GitHub Secrets

Add these secrets in your GitHub repository (**Settings > Secrets and variables > Actions > New repository secret**):

| Secret | Description |
|--------|-------------|
| `DROPLET_HOST` | Your droplet's IP address (e.g., `167.71.123.45`) |
| `DROPLET_USER` | SSH user (usually `root`) |
| `SSH_PRIVATE_KEY` | Private SSH key for authentication |

### Generate SSH Key for GitHub Actions

1. **Generate a new SSH key** (on your local machine):

```bash
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions -N ""
```

2. **Add the public key to your droplet**:

```bash
# Copy the public key
cat ~/.ssh/github_actions.pub

# SSH into your droplet and add to authorized_keys
ssh root@YOUR_DROPLET_IP
echo "YOUR_PUBLIC_KEY" >> ~/.ssh/authorized_keys
```

3. **Add the private key to GitHub Secrets**:

```bash
# Copy the private key content
cat ~/.ssh/github_actions
```

Go to your GitHub repository > Settings > Secrets and variables > Actions > New repository secret:
- Name: `SSH_PRIVATE_KEY`
- Value: Paste the entire private key (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)

### How It Works

- Push to `main` branch triggers automatic deployment
- GitHub Actions SSHs into your droplet
- Pulls the latest code and rebuilds Docker containers
- You can also trigger manually from the Actions tab using "Run workflow"

### View Deployment Status

Check deployment logs at: `https://github.com/YOUR_USERNAME/YOUR_REPO/actions`

