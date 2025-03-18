# Build stage
FROM --platform=$BUILDPLATFORM node:20-slim AS builder
# Set working directory
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm ci
# Copy project files
COPY . .
# Build the application
RUN npm run build

# Production stage
FROM --platform=$TARGETPLATFORM node:20-slim
WORKDIR /app
# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production
# Copy built files from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/server ./server
# Create and set permissions for uploads directory
RUN mkdir -p data/uploads && \
    chown -R node:node data/uploads
# Set production environment
ENV NODE_ENV=production
ENV PORT=5000
# Switch to non-root user
USER node
# Expose port 5000
EXPOSE 5000
# Start the application
CMD ["npm", "start"]