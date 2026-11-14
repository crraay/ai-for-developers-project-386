# Tech stack: Angular + Micronaut + PostgreSQL + Docker Compose

> **Status: Accepted, superseded in part by ADR-0009.** The *frontend* half of this
> decision (Angular) was replaced by React + Vite in ADR-0009; the backend,
> database, Compose and learning-stack reasoning below still hold.

Call Calendar is built as a monorepo with an Angular SPA (`/frontend`), a
Java 25 + Micronaut REST API (`/backend`, Gradle), and PostgreSQL, wired
together by a root `docker-compose.yml`. This is deliberately heavier than the
product needs — a single Node process with SQLite would suffice — because the
project's purpose is learning AI-assisted development across a realistic
multi-service stack, and Compose makes the extra infrastructure cost near zero.

## Considered Options

- **TypeScript + Fastify + SQLite, server-rendered**: the minimal stack that
  would satisfy every v1 requirement. Rejected because the learning goal is a
  separated frontend/backend architecture, not the smallest possible app.

## Consequences

- Every change runs through two build systems (Gradle, Vite) and
  `docker compose up` is the canonical way to run the app.
- PostgreSQL (not SQLite) is the database from day one; there is no
  "embedded DB for dev" path.
