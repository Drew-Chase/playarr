FROM rust:1.90-alpine AS builder
ARG TMDB_API_KEY
WORKDIR /build
COPY . .
RUN apk update

# Install Dependencies
RUN apk add --no-cache nodejs npm musl-dev
RUN npm i vite pnpm -g

# Install project dependencies (force clean install without prompts)
RUN pnpm i --no-frozen-lockfile --force
# Build the project
# This will build both the frontend and the backend
RUN pnpm run "build:frontend"
RUN TMDB_API_KEY=${TMDB_API_KEY} cargo build --release
RUN strip target/release/playarr

FROM alpine:latest
ENV PLAYARR_PORT=3698
RUN mkdir -p /app
COPY --from=builder /build/target/release/playarr /app/playarr
RUN chmod +x /app/playarr
WORKDIR /app
EXPOSE 3698
CMD /app/playarr