# Cloudflared Tunnel Setup for PWA Push Notification Testing

## Quick Start

### Option 1: Use the provided scripts (Recommended)

**Terminal 1 - Backend Tunnel:**
```bash
./start-backend-tunnel.sh
```

**Terminal 2 - Frontend Tunnel:**
```bash
./start-frontend-tunnel.sh
```

### Option 2: Manual setup

**Terminal 1 - Start Backend:**
```bash
cd src/backendN
npm run dev
```

**Terminal 2 - Start Frontend:**
```bash
cd src/frontend  
npm start
```

**Terminal 3 - Backend Tunnel:**
```bash
cloudflared tunnel --url http://localhost:3000
```

**Terminal 4 - Frontend Tunnel:**
```bash
cloudflared tunnel --url http://localhost:5173
```

## Configuration

- **Backend**: Runs on port 3000 (Express server)
- **Frontend**: Runs on port 5173 (React dev server)
- **Tunnels**: Cloudflared will provide HTTPS URLs for both services

## Important Notes

1. **HTTPS Required**: PWA push notifications require HTTPS, which cloudflared provides
2. **Update Frontend Config**: Once you get the backend tunnel URL, update `src/frontend/.env`:
   ```
   REACT_APP_API_URL=https://your-backend-tunnel-url.trycloudflare.com/api/v1
   REACT_APP_SOCKET_URL=https://your-backend-tunnel-url.trycloudflare.com
   ```
3. **Service Worker**: Make sure your service worker is registered and can receive push notifications
4. **VAPID Keys**: Ensure your backend has valid VAPID keys configured in `.env`

## Testing Push Notifications

1. Open the frontend tunnel URL in your browser
2. Navigate to the notifications demo page
3. Grant notification permissions
4. Subscribe to push notifications
5. Test sending notifications from your backend

## Stopping Services

- Press `Ctrl+C` in each terminal to stop the services
- The scripts will automatically clean up background processes