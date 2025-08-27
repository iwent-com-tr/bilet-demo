#!/bin/bash

# bilet-demo HTTPS Server Startup Script
# This script starts the backend and frontend servers with HTTPS in separate terminal windows

echo "🔒 Starting bilet-demo servers with HTTPS..."
echo "📍 Working directory: $(pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to check if directory exists
check_directory() {
    if [ ! -d "$1" ]; then
        echo -e "${RED}❌ Directory $1 not found!${NC}"
        echo "Please run this script from the project root directory."
        exit 1
    fi
}

# Function to check if package.json exists
check_package_json() {
    if [ ! -f "$1/package.json" ]; then
        echo -e "${RED}❌ package.json not found in $1!${NC}"
        exit 1
    fi
}

# Function to check SSL certificates
check_ssl_certs() {
    if [ ! -f "src/backendN/server.crt" ] || [ ! -f "src/backendN/server.key" ]; then
        echo -e "${RED}❌ SSL certificates not found!${NC}"
        echo -e "${YELLOW}💡 Generate SSL certificates first:${NC}"
        echo "   cd src/backendN"
        echo "   mkcert localhost 192.168.1.46 127.0.0.1 ::1"
        echo "   mv localhost+3.pem server.crt"
        echo "   mv localhost+3-key.pem server.key"
        echo "   cp server.crt ../frontend/"
        echo "   cp server.key ../frontend/"
        exit 1
    fi
}

# Validate project structure
echo -e "${BLUE}🔍 Validating project structure...${NC}"
check_directory "src/backendN"
check_directory "src/frontend"
check_package_json "src/backendN"
check_package_json "src/frontend"

# Check SSL certificates
echo -e "${BLUE}🔒 Checking SSL certificates...${NC}"
check_ssl_certs

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

# Function to start backend with HTTPS in new terminal
start_backend_https() {
    echo -e "${YELLOW}🔧 Starting Backend Server (HTTPS)...${NC}"
    
    # Detect terminal and OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "
            tell application \"Terminal\"
                do script \"cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting (HTTPS)...' && npm run dev:https\"
                activate
            end tell
        "
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting (HTTPS)...' && npm run dev:https; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting (HTTPS)...' && npm run dev:https; bash" &
        else
            echo -e "${RED}❌ No supported terminal found for Linux!${NC}"
            return 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        cmd.exe /c start cmd.exe /k "cd /d \"$(pwd)/src/backendN\" && echo 🔧 Backend Server Starting (HTTPS)... && npm run dev:https"
    else
        echo -e "${RED}❌ Unsupported operating system: $OSTYPE${NC}"
        return 1
    fi
}

# Function to start frontend with HTTPS in new terminal
start_frontend_https() {
    echo -e "${YELLOW}⚛️  Starting Frontend Server (HTTPS)...${NC}"
    
    # Wait a moment for backend to start
    sleep 3
    
    # Detect terminal and OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "
            tell application \"Terminal\"
                do script \"cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting (HTTPS)...' && npm run start:https\"
                activate
            end tell
        "
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting (HTTPS)...' && npm run start:https; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting (HTTPS)...' && npm run start:https; bash" &
        else
            echo -e "${RED}❌ No supported terminal found for Linux!${NC}"
            return 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        cmd.exe /c start cmd.exe /k "cd /d \"$(pwd)/src/frontend\" && echo ⚛️  Frontend Server Starting (HTTPS)... && npm run start:https"
    else
        echo -e "${RED}❌ Unsupported operating system: $OSTYPE${NC}"
        return 1
    fi
}

# Main execution
echo -e "${GREEN}✅ Project structure validated${NC}"
echo -e "${GREEN}✅ SSL certificates found${NC}"
echo ""

# Start backend first
start_backend_https
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend HTTPS terminal opened${NC}"
else
    echo -e "${RED}❌ Failed to start backend${NC}"
    exit 1
fi

# Start frontend after backend
start_frontend_https
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend HTTPS terminal opened${NC}"
else
    echo -e "${RED}❌ Failed to start frontend${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Both HTTPS servers are starting!${NC}"
echo -e "${PURPLE}🔒 Frontend: https://192.168.1.46:5173${NC}"
echo -e "${PURPLE}🔒 Backend:  https://192.168.1.46:3000/api/v1${NC}"
echo ""
echo -e "${YELLOW}💡 HTTPS Tips:${NC}"
echo "   • Accept SSL certificates when prompted"
echo "   • Click 'Advanced' → 'Proceed to unsafe site'"
echo "   • Required for iOS development and PWA features"
echo "   • Wait for both servers to fully start"
echo "   • Use Ctrl+C in terminals to stop servers"
echo ""
echo -e "${GREEN}✨ Happy secure coding!${NC}"