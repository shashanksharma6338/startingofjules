
# Material Management Group - Complete Startup Guide

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Startup Methods](#startup-methods)
- [Troubleshooting](#troubleshooting)
- [Port Configuration](#port-configuration)

## 🚀 Quick Start

The fastest way to start the application:
```bash
node server.js
```

The application will be available at:
- Local: http://localhost:5000
- External: http://0.0.0.0:5000

## 📦 Prerequisites

Before starting the application, ensure you have:

1. **Node.js** (v14 or higher)
   ```bash
   node --version
   ```

2. **npm** (comes with Node.js)
   ```bash
   npm --version
   ```

3. **All dependencies installed**
   ```bash
   npm install
   ```

## ⚙️ Environment Setup

1. **Environment Variables**
   
   Copy `.env.example` to `.env` (if not exists):
   ```bash
   cp .env.example .env
   ```

2. **Configure `.env` file**
   
   Update the following variables:
   ```env
   # Admin Credentials
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=YourSecurePassword123!
   SECURITY_ANSWER=YourSecurityAnswer
   
   # Viewer Credentials
   VIEWER_PASSWORD=ViewerPassword123!
   
   # Gaming Credentials
   GAMING_PASSWORD=GamingPassword123!
   
   # Transfer User
   TRANSFER_PASSWORD=transfer123
   TRANSFER_SECURITY_ANSWER=defaultanswer
   
   # PDF User
   PDF_PASSWORD=pdf123
   PDF_SECURITY_ANSWER=defaultanswer
   
   # Network User
   NETWORK_PASSWORD=network123
   NETWORK_SECURITY_ANSWER=defaultanswer
   
   # Session Configuration
   SESSION_SECRET=your-super-secret-session-key-change-this
   
   # Database Configuration
   DB_HOST=sql.freedb.tech
   DB_USER=freedb_sharma
   DB_PASSWORD=mvvbvpD?mgEfqQ2
   DB_NAME=freedb_shashank
   
   # Server Configuration
   PORT=5000
   ```

## 🔧 Startup Methods

### Method 1: Direct Node.js (Recommended for Development)

**Windows:**
```bash
node server.js
```

**Linux/Mac:**
```bash
node server.js
```

**Advantages:**
- Simple and straightforward
- Direct console output
- Easy to debug

### Method 2: PM2 Process Manager (Recommended for Production)

**Install PM2 globally (one-time):**
```bash
npm install -g pm2
```

**Start with PM2:**
```bash
pm2 start ecosystem.config.js
```

**View logs:**
```bash
pm2 logs
```

**Stop the application:**
```bash
pm2 stop all
```

**Restart the application:**
```bash
pm2 restart all
```

**Advantages:**
- Auto-restart on crash
- Load balancing
- Log management
- Production-ready

### Method 3: NPM Scripts

**Start the application:**
```bash
npm start
```

**Advantages:**
- Standardized approach
- Easy to remember

### Method 4: HTTP Server (Static Files Only)

For serving static files without backend:
```bash
http-server ./public -p 5000 -a 0.0.0.0
```

**Note:** This method doesn't run the Node.js backend, only serves static HTML/CSS/JS files.

### Method 5: Interactive Shell Script (Linux/Mac)

Make the script executable:
```bash
chmod +x start.sh
```

Run the script:
```bash
./start.sh
```

The script will prompt you to choose a startup method.

### Method 6: Windows Batch Files

**Option 1: Standard Startup**
```bash
start_node.bat
```

**Option 2: PM2 Startup**
```bash
start_pm2.bat
```

**Option 3: HTTP Server Only**
```bash
start_http.bat
```

**Option 4: Development Mode with Auto-Restart**
```bash
start_dev.bat
```

## 🐛 Troubleshooting

### Port Already in Use

If port 5000 is already in use:

1. **Find the process:**
   ```bash
   # Windows
   netstat -ano | findstr :5000
   
   # Linux/Mac
   lsof -i :5000
   ```

2. **Kill the process:**
   ```bash
   # Windows (replace PID with actual process ID)
   taskkill /PID <PID> /F
   
   # Linux/Mac
   kill -9 <PID>
   ```

3. **Or change the port:**
   Update PORT in `.env` file or use:
   ```bash
   PORT=3000 node server.js
   ```

### Database Connection Issues

1. **Check database credentials** in `.env`
2. **Verify network connectivity** to sql.freedb.tech
3. **Check firewall settings**

### Module Not Found Errors

Reinstall dependencies:
```bash
rm -rf node_modules package-lock.json
npm install
```

### PM2 Not Starting

1. **Check PM2 status:**
   ```bash
   pm2 status
   ```

2. **View error logs:**
   ```bash
   pm2 logs --err
   ```

3. **Delete and restart:**
   ```bash
   pm2 delete all
   pm2 start ecosystem.config.js
   ```

## 🔌 Port Configuration

### Default Ports
- **Development:** 5000
- **Production (External):** 80 (mapped from 5000)
- **WebSocket:** Same as HTTP port

### Custom Port Configuration

1. **Using Environment Variable:**
   ```bash
   PORT=3000 node server.js
   ```

2. **Using .env file:**
   ```env
   PORT=3000
   ```

3. **In Replit:**
   The `.replit` file maps port 5000 to external port 80

## 📊 Monitoring

### Check Application Status

**PM2:**
```bash
pm2 status
pm2 monit
```

**Logs:**
```bash
# PM2
pm2 logs

# Direct Node.js
# Logs appear in console
```

**Database Connection:**
Check the console output for:
```
Server running on http://0.0.0.0:5000
```

## 🔄 Updating the Application

1. **Pull latest changes:**
   ```bash
   git pull origin main
   ```

2. **Install new dependencies:**
   ```bash
   npm install
   ```

3. **Restart the application:**
   ```bash
   # PM2
   pm2 restart all
   
   # Direct Node.js
   # Stop with Ctrl+C and restart
   node server.js
   ```

## 🌐 Accessing the Application

Once started, access the application at:

- **Homepage:** http://localhost:5000/homepage.html
- **Login:** http://localhost:5000/index.html
- **Admin Dashboard:** http://localhost:5000/index.html (after login)

## 🔒 Security Notes

1. **Always change default passwords** in production
2. **Use environment variables** for sensitive data
3. **Enable HTTPS** in production
4. **Keep dependencies updated:** `npm audit fix`

## 📞 Support

For issues or questions:
1. Check the logs for error messages
2. Refer to troubleshooting section
3. Contact the development team

---

**Last Updated:** January 2025
**Version:** 1.0.0
