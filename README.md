# Call Calendar

[![hexlet-check](https://github.com/crraay/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/crraay/ai-for-developers-project-386/actions)

Building a booking calendar service together with AI

How it should work: https://files.hexlet.app/a/2ipc5m



## Tech Stack

Angular (frontend) · Java 25 + Micronaut (backend) · PostgreSQL · Docker Compose

See [ADR-0001](docs/adr/0001-tech-stack.md) for why this stack was chosen.



## Installation

Prerequisites: [mise](https://mise.jdx.dev) (`winget install jdx.mise` on
Windows) and Docker. Tool versions (Java 25, Node 24) are pinned in
`mise.toml`.

```bash
git clone https://github.com/crraay/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise install
```



## Usage

Run the whole stack:

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8080 (`GET /api/ping` → `pong`)
- PostgreSQL: localhost:5434 (`postgres`/`postgres`, db `callcalendar`; 5432 is used by a local PostgreSQL install on this machine)

Local development without Docker:

```bash
# backend (requires a PostgreSQL, e.g. `docker compose up -d db`;
# override the connection with DATASOURCES_DEFAULT_URL if needed)
cd backend && mise exec -- ./gradlew run

# frontend
cd frontend && mise exec -- npm start
```



## Testing

Tests are run automatically by Hexlet on every commit via the [`hexlet-check`](.github/workflows/hexlet-check.yml) GitHub Actions workflow.

Run them locally:

```bash
cd backend && mise exec -- ./gradlew test   # JUnit 5 + Testcontainers PostgreSQL
cd frontend && mise exec -- npm test -- --watch=false   # Vitest
```

