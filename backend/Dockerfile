# syntax=docker/dockerfile:1.7
# BuildKit `# syntax=` directive: makes `--mount=type=cache` available without
# leaking BuildKit-only syntax into plain `docker build` callers. Hadolint is
# fine with it; non-BuildKit engines fall back to ignoring the unknown flag.
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app
COPY . .
# /root/.gradle holds the wrapper distribution (dists/) and the per-user cache.
# Mounting it as a writable cache so that:
#   - Warm runs (CI cache restored from type=gha) skip the wrapper download
#     that previously timed out at services.gradle.org after 10s.
#   - Cold runs still write to the mount, so a successful cold build now seeds
#     the GHA cache for the next run.
# The wrapper itself is still `networkTimeout=60000`/`retries=3` so a cold
# cache has a fair window to fetch from services.gradle.org.
RUN --mount=type=cache,target=/root/.gradle \
    chmod +x gradlew && ./gradlew shadowJar --no-daemon

FROM eclipse-temurin:25-jre
WORKDIR /app
COPY --from=build /app/build/libs/*-all.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
