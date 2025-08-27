#!/bin/bash

# bilet-demo Server Startup Script
# This script starts the backend and frontend servers in separate terminal windows

echo "🚀 Starting bilet-demo servers..."
echo "📍 Working directory: $(pwd)"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Validate project structure
echo -e "${BLUE}🔍 Validating project structure...${NC}"
check_directory "src/backendN"
check_directory "src/frontend"
check_package_json "src/backendN"
check_package_json "src/frontend"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed!${NC}"
    exit 1
fi

# Function to start backend in new terminal
start_backend() {
    echo -e "${YELLOW}🔧 Starting Backend Server...${NC}"
    
    # Detect terminal and OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "
            tell application \"Terminal\"
                do script \"cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting...' && npm run dev\"
                activate
            end tell
        "
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting...' && npm run dev; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd '$(pwd)/src/backendN' && echo '🔧 Backend Server Starting...' && npm run dev; bash" &
        else
            echo -e "${RED}❌ No supported terminal found for Linux!${NC}"
            return 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        cmd.exe /c start cmd.exe /k "cd /d \"$(pwd)/src/backendN\" && echo 🔧 Backend Server Starting... && npm run dev"
    else
        echo -e "${RED}❌ Unsupported operating system: $OSTYPE${NC}"
        return 1
    fi
}

# Function to start frontend in new terminal
start_frontend() {
    echo -e "${YELLOW}⚛️  Starting Frontend Server...${NC}"
    
    # Wait a moment for backend to start
    sleep 3
    
    # Detect terminal and OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e "
            tell application \"Terminal\"
                do script \"cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting...' && npm start\"
                activate
            end tell
        "
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v gnome-terminal &> /dev/null; then
            gnome-terminal -- bash -c "cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting...' && npm start; exec bash"
        elif command -v xterm &> /dev/null; then
            xterm -e "cd '$(pwd)/src/frontend' && echo '⚛️  Frontend Server Starting...' && npm start; bash" &
        else
            echo -e "${RED}❌ No supported terminal found for Linux!${NC}"
            return 1
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        cmd.exe /c start cmd.exe /k "cd /d \"$(pwd)/src/frontend\" && echo ⚛️  Frontend Server Starting... && npm start"
    else
        echo -e "${RED}❌ Unsupported operating system: $OSTYPE${NC}"
        return 1
    fi
}

# Main execution
echo -e "${GREEN}✅ Project structure validated${NC}"
echo ""

# Start backend first
start_backend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backend terminal opened${NC}"
else
    echo -e "${RED}❌ Failed to start backend${NC}"
    exit 1
fi

# Start frontend after backend
start_frontend
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Frontend terminal opened${NC}"
else
    echo -e "${RED}❌ Failed to start frontend${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Both servers are starting!${NC}"
echo -e "${BLUE}📱 Frontend: http://localhost:3000${NC}"
echo -e "${BLUE}🔧 Backend:  http://localhost:3000/api/v1${NC}"
echo ""
echo -e "${YELLOW}💡 Tips:${NC}"
echo "   • Wait for both servers to fully start"
echo "   • Backend typically takes 5-10 seconds"
echo "   • Frontend opens browser automatically"
echo "   • Use Ctrl+C in terminals to stop servers"
echo ""
echo -e "${GREEN}✨ Happy coding!${NC}"