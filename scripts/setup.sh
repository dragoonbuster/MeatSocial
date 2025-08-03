#!/bin/bash

set -e

echo "🚀 Setting up MeatSocial development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo "✅ Docker version: $(docker --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build shared package
echo "🔨 Building shared package..."
npm run build --workspace=shared

# Set up environment files
echo "⚙️  Setting up environment files..."

if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env 2>/dev/null || cat > backend/.env << EOF
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://meatsocial:dev_password_change_in_production@localhost:5432/meatsocial_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_production
VERIFICATION_NODE_SECRET=dev_node_secret_change_in_production
EOF
    echo "📝 Created backend/.env file"
fi

if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env 2>/dev/null || cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=MeatSocial
VITE_NODE_ENV=development
EOF
    echo "📝 Created frontend/.env file"
fi

# Start Docker services
echo "🐳 Starting Docker services..."
docker-compose -f docker/docker-compose.dev.yml up -d postgres redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run database migrations if backend is set up
if [ -f backend/knexfile.js ]; then
    echo "🗃️  Running database migrations..."
    npm run db:migrate --workspace=backend
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To start development:"
echo "  npm run dev              # Start both frontend and backend"
echo "  npm run dev:backend      # Start backend only"
echo "  npm run dev:frontend     # Start frontend only"
echo ""
echo "To stop Docker services:"
echo "  docker-compose -f docker/docker-compose.dev.yml down"
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"