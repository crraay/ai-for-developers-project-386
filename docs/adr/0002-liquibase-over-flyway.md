# Migrations: Liquibase over Flyway

The backend manages its PostgreSQL schema with Liquibase
(`src/main/resources/db/changelog/`, XML master changelog, changesets included
from it). Flyway is the more common Micronaut default and would have worked
equally well; Liquibase was chosen for learning purposes — exposure to its
changelog model is part of this project's goal. Switching tools later means
rewriting migration history, so this decision is recorded rather than left
implicit.

## Consequences

- Schema changes are XML changesets, not plain `V1__*.sql` files.
- `docs/domain.md` entities have no schema yet: the walking-skeleton tickets
  will introduce the first real changesets.
