# Use Node.js 18 as the base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (needed for build)
RUN npm ci

# Copy the entire project
COPY . .

# Copy package.json to UI directory (fix for build)
COPY package.json ./ui/

# Build the application
RUN npm run build

# Clean up development dependencies but keep concurrently
RUN npm prune --omit=dev && npm install concurrently

# Expose port 8000 for API
EXPOSE 8000

# Expose port 5173 for UI (for development)
EXPOSE 5173

# Set default environment variables (can be overridden)
ENV HOST=0.0.0.0
ENV PORT=8000
ENV NODE_ENV=production

# For development: copy .env file (will be overridden by production env vars)
# Production environment variables should be set via Docker run command or Render.com
COPY .env.example .env
RUN cp .env ./ui/.env

# Start the application
CMD ["npm", "start"]