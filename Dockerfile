# syntax=docker/dockerfile:1.7
# Root image for the hexlet check: one container, one port.
# Builds the backend jar and the Angular dist, then runs nginx (public,
# listens on $PORT) in front of the jar (internal, $BACKEND_PORT) under
# supervisord so PID1 reaps children and shuts nginx down before the JVM.

# --- Stage 1: backend jar -----------------------------------------------------
FROM eclipse-temurin:25-jdk AS backend-build
WORKDIR /app
COPY backend/ .
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew shadowJar --no-daemon

# --- Stage 2: Angular production build ---------------------------------------
FROM node:24-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY frontend/ .
RUN npm run build

# --- Stage 3: runtime ---------------------------------------------------------
FROM eclipse-temurin:25-jre
# Versions pinned per hadolint DL3008; bump deliberately on base-image upgrades
# (candidates observed on eclipse-temurin:25-jre / Ubuntu 26.04).
RUN apt-get update && apt-get install -y --no-install-recommends \
    nginx=1.28.3-2ubuntu1.12 \
    supervisor=4.3.0-1 \
    gettext-base=0.23.2-1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-build /app/build/libs/*-all.jar app.jar
COPY --from=frontend-build /app/dist/frontend/browser /usr/share/nginx/html
COPY docker/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/docker-entrypoint.sh"]
