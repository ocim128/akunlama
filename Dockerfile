#-------------------------------------------------------
#
# Base alpine images with all the runtime os dependencies
#
# Note that the node-sass is broken with node 12
# https://github.com/nodejs/docker-node/issues/1028
#
#-------------------------------------------------------

# Use newer Node.js version with Alpine for smaller size
FROM node:18-alpine AS base
RUN apk add --no-cache gettext && \
    mkdir -p /application/

#-------------------------------------------------------
#
# code builders (used by dockerbuilders)
#
#-------------------------------------------------------

# Install dependencies for some NPM modules
FROM base AS codebuilder
# RUN apk add --no-cache make gcc g++ python

#-------------------------------------------------------
#
# Docker builders (also resets node_modules)
#
# Note each major dependency is compiled seperately
# so as to isolate the impact of each code change
#
#-------------------------------------------------------

# Build API dependencies
FROM base AS api-deps
WORKDIR /application/api
# Use deterministic install and skip dev dependencies for faster, reliable layer caching
COPY api/package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm cache clean --force

# Build UI
FROM base AS ui-builder
WORKDIR /application/ui
COPY ui/package*.json ./
RUN npm ci --legacy-peer-deps
COPY ui/ ./
RUN cp config/apiconfig.sample.js config/apiconfig.js && \
    npm run build && \
    npm cache clean --force

#-------------------------------------------------------
#
# Full Docker application
#
#-------------------------------------------------------
FROM base AS production
WORKDIR /application

# Copy API with dependencies
COPY --from=api-deps /application/api/node_modules ./api/node_modules
COPY api/ ./api/

# Copy built UI
COPY --from=ui-builder /application/ui/dist ./ui-dist/

# Copy and setup entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose port
EXPOSE 8000

#
# Configurable environment variable
#
ENV MAILGUN_EMAIL_DOMAIN=""
ENV MAILGUN_API_KEY=""
ENV WEBSITE_DOMAIN=""

# Run the application
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD []
