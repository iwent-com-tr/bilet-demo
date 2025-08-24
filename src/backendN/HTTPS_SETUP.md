# HTTPS Setup Guide for Backend

This guide explains how to set up HTTPS for the backend server to support iOS development and push notifications.

## Prerequisites

1. Install `mkcert` (if not already installed):
   ```bash
   # macOS
   brew install mkcert
   
   # Or download from GitHub releases
   # https://github.com/FiloSottile/mkcert/releases
   ```

2. Install the local CA:
   ```bash
   mkcert -install
   ```

## Generate SSL Certificates

Navigate to the backend directory and generate certificates:

```bash
cd src/backendN

# Generate certificates for localhost and local network IP
mkcert localhost 192.168.1.40 127.0.0.1 ::1

# This creates:
# - localhost+3.pem (certificate file)
# - localhost+3-key.pem (private key file)

# Rename files to match configuration
mv localhost+3.pem server.crt
mv localhost+3-key.pem server.key
```

## Usage

### HTTP Mode (Default)
```bash
npm run dev
```

### HTTPS Mode
```bash
npm run dev:https
```

## Configuration Files

- **HTTP**: Uses `.env` file
- **HTTPS**: Uses `.env.https` file with:
  - `HTTPS=true`
  - `SSL_CRT_FILE=server.crt`
  - `SSL_KEY_FILE=server.key`
  - HTTPS URLs for client origins

## iOS Testing

1. Start backend with HTTPS: `npm run dev:https`
2. Start frontend with HTTPS: `npm run start:https`
3. On iOS device, navigate to `https://192.168.1.40:5173`
4. Accept the certificate warning
5. Test push notifications and PWA features

## Important Notes

- SSL certificates are gitignored for security
- Each developer needs to generate their own certificates
- Update IP addresses in `.env.https` to match your local network
- HTTPS is required for iOS push notifications and service workers