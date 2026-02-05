
# Material Management Group - Startup Guide

## Environment Setup

1. Copy `.env.example` to `.env` (if not exists)
2. Update credentials in `.env` file:
   - `ADMIN_PASSWORD`: Change default admin password
   - `SECURITY_ANSWER`: Change default security answer
   - `SESSION_SECRET`: Update session secret key
   - Database credentials if needed

## Startup Methods

### Method 1: Direct Node.js
```bash
node server.js
```

### Method 2: PM2 Process Manager
```bash
pm2 start ecosystem.config.js
pm2 logs
```

### Method 3: HTTP Server (Static Files Only)
```bash
http-server ./public -p 5000 -a 0.0.0.0
```

### Method 4: Interactive Startup Script
```bash
chmod +x start.sh
./start.sh
```

## Replit Workflows

- **Project** (Run Button): Starts the main server
- **PM2 Start**: Starts with PM2 process manager
- **HTTP Server**: Serves static files only

## Port Configuration

The application runs on port 5000 by default and is mapped to port 80 for external access.
