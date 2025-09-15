# Single-process Dockerfile for memory efficiency
# Based on old version architecture that achieved 6% memory usage

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

# Build the API
RUN cd api && npm run build

# Build the UI only
RUN cd ui && npx vite build

# Copy built UI files to API public directory
RUN mkdir -p api/public && cp -r ui/dist/* api/public/

# Install only production dependencies for API
RUN cd api && npm ci --only=production

# Clean up unnecessary files
RUN rm -rf ui/node_modules ui/dist node_modules

# Expose port 8000
EXPOSE 8000

# Set environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV NODE_ENV=production

# Set Vite environment variables for build time
ARG VITE_MAILGUN_EMAIL_DOMAIN=$MAILGUN_EMAIL_DOMAIN
ARG VITE_WEBSITE_DOMAIN=$WEBSITE_DOMAIN

ENV VITE_MAILGUN_EMAIL_DOMAIN=$VITE_MAILGUN_EMAIL_DOMAIN
ENV VITE_WEBSITE_DOMAIN=$VITE_WEBSITE_DOMAIN

# Work in API directory
WORKDIR /app/api

# Start only the API server (which serves UI files statically)
CMD ["node", "dist/app.js"]