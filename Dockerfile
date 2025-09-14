#-------------------------------------------------------
#
# Base alpine images with all the runtime os dependencies
#
#-------------------------------------------------------

# Does basic node, and runtime dependencies
FROM node:18-alpine AS baseimage
RUN apk add --no-cache gettext
RUN mkdir -p /application/

#-------------------------------------------------------
#
# Dependency installation stage
#
#-------------------------------------------------------

FROM baseimage AS deps
# copy package files
COPY package.json /application/package.json
COPY package-lock.json /application/package-lock.json
WORKDIR /application
# install dependencies
RUN npm ci

#-------------------------------------------------------
#
# Build stage
#
#-------------------------------------------------------

FROM deps AS builder
# copy source code
COPY api /application/api/
COPY ui /application/ui/
COPY docker-entrypoint.sh /application/docker-entrypoint.sh
# copy config files
RUN cp /application/ui/config/apiconfig.sample.js /application/ui/config/apiconfig.js
# build the project
RUN npm run build

#-------------------------------------------------------
#
# Production stage
#
#-------------------------------------------------------

FROM baseimage AS production
# copy package files
COPY package.json /application/package.json
COPY package-lock.json /application/package-lock.json
WORKDIR /application
# install only production dependencies
RUN npm ci --only=production
# copy built files and dependencies
COPY --from=builder /application/api /application/api/
COPY --from=builder /application/ui/dist /application/ui-dist/
COPY --from=builder /application/docker-entrypoint.sh /application/docker-entrypoint.sh
# copy node modules from deps stage for dev dependencies needed for runtime
COPY --from=deps /application/node_modules /application/node_modules/
RUN chmod +x /application/docker-entrypoint.sh

# Expose the server port
EXPOSE 8000

# Configurable environment variable
ENV MAILGUN_EMAIL_DOMAIN=""
ENV MAILGUN_API_KEY=""
ENV WEBSITE_DOMAIN=""

# Setup the entrypoint
ENTRYPOINT [ "/application/docker-entrypoint.sh" ]
CMD []