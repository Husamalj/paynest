# Prisma Migrations

`000001_baseline` is a baseline migration generated from the current production schema.

Important:

- Do not run this baseline against the existing production database as a fresh migration.
- Existing production was already brought to this shape through earlier manual SQL and Prisma schema sync work.
- For production, mark the baseline as applied only after verifying the database matches `prisma/schema.prisma`.
- New schema changes after this point should be added as normal Prisma migrations.

Recommended existing-production baseline procedure:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```

If the diff is empty, record the baseline as applied:

```bash
npx prisma migrate resolve --applied 000001_baseline
```

For new staging databases:

```bash
npx prisma migrate deploy
```

