# Stage 1: Build stage
FROM node:20-slim AS builder

# Install system packages required for compiling node-canvas
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy dependency configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies (including devDependencies for Nest CLI build)
RUN pnpm install --frozen-lockfile

# Copy tsconfig files and source code
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src/ ./src/

# Compile the NestJS application
RUN pnpm run build

# Stage 2: Production stage
FROM node:20-slim AS runner

# Install runtime libraries required by node-canvas
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy dependency configurations
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy compiled files from build stage
COPY --from=builder /app/dist ./dist

# Expose the default NestJS port
EXPOSE 3000

# Set environment
ENV NODE_ENV=production

# Start the NestJS backend
CMD ["node", "dist/main.js"]
