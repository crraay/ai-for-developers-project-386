# syntax=docker/dockerfile:1.7
# BuildKit `# syntax=` directive: enables `--mount=type=cache` so npm's package
# store survives cold/warm CI runs (same pattern as backend/Dockerfile).
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# `npm ci` reads from and writes to `/root/.npm`; mounting it as a cache
# avoids re-downloading the same lockfile-resolved tree on every CI run.
RUN --mount=type=cache,target=/root/.npm npm ci
# Vite mode picks the API URL: development -> .env.development
# (http://localhost:8080), production -> .env.production (see ADR-0009).
ARG MODE=production
COPY . .
RUN npm run build -- --mode=${MODE}

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
