
#!/bin/bash

echo "Material Management Group - Startup Script"
echo "=========================================="
echo ""
echo "Select startup method:"
echo "1. Node.js (Direct)"
echo "2. PM2 (Process Manager)"
echo "3. HTTP Server (Static Files Only)"
echo ""
read -p "Enter option (1-3): " option

case $option in
  1)
    echo "Starting with Node.js..."
    node server.js
    ;;
  2)
    echo "Starting with PM2..."
    pm2 start ecosystem.config.js
    pm2 logs
    ;;
  3)
    echo "Starting HTTP Server..."
    http-server ./public -p 5000 -a 0.0.0.0
    ;;
  *)
    echo "Invalid option. Starting with Node.js by default..."
    node server.js
    ;;
esac
