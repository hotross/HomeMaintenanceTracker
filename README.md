# Home Appliance Maintenance Tracker

![Docker Build](https://github.com/[owner]/[repo]/actions/workflows/docker-build.yml/badge.svg)

A web-based application for tracking home appliance maintenance, consumables, and tasks. Keep your appliances running smoothly by managing maintenance schedules and tracking consumable items.

⚠️ **SECURITY WARNING**: This application is designed for home/internal network use only. DO NOT expose this application to the public internet as it lacks the security features necessary for public deployment.

## Features

- Device Management: Add and track your home appliances
- Consumables Tracking: Monitor consumable items for each device
- Maintenance Tasks: Schedule and track maintenance activities
- Multi-user Support: Secure authentication for multiple household members
- File Uploads: Store device manuals, images, and related documents

## CI/CD Pipeline

This project includes a GitHub Actions workflow that automatically:
- Builds multi-architecture Docker images (AMD64 and ARM64)
- Supports both x86 and Raspberry Pi deployments
- Caches Docker layers for faster builds
- Runs basic tests to ensure the build succeeds

You can see the build status in the Actions tab of the repository.

## Deployment with Docker Compose

### Prerequisites
- Docker Engine 24.0 or higher
- Docker Compose V2
- Git

### Quick Start

1. Clone the repository
```bash
git clone [your-repo-url]
cd home-appliance-maintenance
```

2. Create environment file
```bash
# Create .env file with required variables
cat > .env << EOL
DATABASE_URL=postgresql://postgres:postgres@db:5432/home_maintenance
SESSION_SECRET=your_secure_session_secret
EOL
```

3. Create data directories
```bash
# Create required directories with proper permissions
mkdir -p data/postgres data/uploads
chmod 777 data/uploads  # Ensure write permissions for uploads
```

4. Start the application
```bash
# Build and start containers
docker compose up -d

# Wait for services to be ready (usually takes a few seconds)
docker compose logs -f
```

The application will be available at `http://localhost:5000`

## Security Considerations

⚠️ **IMPORTANT SECURITY NOTES**:

1. This application is designed for HOME USE ONLY
   - DO NOT expose this to the internet
   - DO NOT forward ports to this application
   - Only access it through your local network

2. Known Security Limitations:
   - Basic authentication only (username/password)
   - No rate limiting
   - No CSRF protection
   - No audit logging
   - File uploads not scanned for malware
   - Session management is basic

3. Recommended Security Practices:
   - Run only on your home network
   - Use strong passwords
   - Keep Docker and all dependencies updated
   - Regularly backup your database
   - Monitor system resources
   - Restrict access to the Docker host

## Data Storage

The application uses two types of storage:

1. PostgreSQL Database
   - Stores all application data
   - Automatically backed up with Docker volumes
   - Located at `./data/postgres`

2. File Storage (Uploads)
   - Device images, manuals, and documents
   - Stored in `./data/uploads` directory
   - Backed up with Docker volumes

### Backup

To backup your data:

```bash
# Stop the containers
docker compose down

# Backup the data directory
tar -czf appliance-backup-$(date +%Y%m%d).tar.gz ./data

# Restart the containers
docker compose up -d
```

### Restore

To restore from backup:

```bash
# Stop the containers
docker compose down

# Remove existing data
rm -rf ./data

# Extract backup
tar -xzf appliance-backup-20250314.tar.gz

# Restart the containers
docker compose up -d
```

## Troubleshooting

1. If the application fails to start:
   - Check Docker logs: `docker compose logs -f`
   - Verify database connection: `docker compose logs db`
   - Ensure ports are not in use: `netstat -tulpn | grep 5000`

2. If uploads fail:
   - Check uploads directory permissions: `ls -la ./data/uploads`
   - Verify disk space: `df -h`
   - Check Docker volume mounts: `docker compose ps`

3. If the database is not accessible:
   - Check database logs: `docker compose logs db`
   - Verify database volume permissions: `ls -la ./data/postgres`
   - Ensure PostgreSQL is running: `docker compose ps`

## License

MIT License