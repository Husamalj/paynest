# Backup / Restore Drill

The goal is not just "having backups"; the goal is proving they restore.

## Requirements

- `pg_dump` and `pg_restore` installed locally or available in CI.
- A staging restore database.
- A recent production/provider snapshot or `.dump` file.

## Backup

```bash
PAYNEST_ALLOW_PROD_BACKUP=true npm run db:backup
```

If `pg_dump` is not installed, take a provider snapshot from Supabase/Neon.

## Restore To Staging

Never restore into production.

```bash
PAYNEST_ALLOW_RESTORE=true \
RESTORE_DATABASE_URL="postgresql://staging..." \
BACKUP_FILE="backups/paynest-YYYY-MM-DD.dump" \
npm run db:restore
```

## Verify Restored Staging

Point staging to the restored database and run:

```bash
npm run check:isolation
PAYNEST_TEST_DB_READY=true PLAYWRIGHT_BASE_URL="https://staging.example.com" PLAYWRIGHT_SKIP_WEB_SERVER=true npm run test:e2e:flow
PAYNEST_TEST_DB_READY=true PLAYWRIGHT_BASE_URL="https://staging.example.com" PLAYWRIGHT_SKIP_WEB_SERVER=true npm run test:e2e:rbac
```

## Evidence To Record

- backup timestamp
- restore target
- restore duration
- smoke/full-flow result
- tenant-isolation result
- rollback decision

