# Database Backup And Restore

Use this process for PayNest PostgreSQL backups. Backups may contain payroll, employee, and company data, so treat them as sensitive.

## Rules

- Store production backups in a private encrypted location.
- Never commit backup files to git. The local `backups/` folder is ignored.
- Test restores on staging or a local disposable database before trusting a backup process.
- Do not restore into production unless you have a fresh backup and explicit approval.

## Create A Backup

Install PostgreSQL client tools so `pg_dump` is available, or set `PG_DUMP_PATH`.

```bash
BACKUP_DATABASE_URL="postgresql://..." npm run db:backup
```

On Windows PowerShell:

```powershell
$env:BACKUP_DATABASE_URL="postgresql://..."
npm run db:backup
```

The script writes a custom-format dump into `backups/`.

For production-looking URLs, set:

```bash
PAYNEST_ALLOW_PROD_BACKUP=true
```

## Restore A Backup

Restores are destructive. Use a disposable local/staging database first.

```bash
PAYNEST_ALLOW_RESTORE=true RESTORE_DATABASE_URL="postgresql://..." BACKUP_FILE="backups/paynest-....dump" npm run db:restore
```

On Windows PowerShell:

```powershell
$env:PAYNEST_ALLOW_RESTORE="true"
$env:RESTORE_DATABASE_URL="postgresql://..."
$env:BACKUP_FILE="backups/paynest-....dump"
npm run db:restore
```

Production restore also requires:

```bash
PAYNEST_ALLOW_PRODUCTION_RESTORE=true
```

## Recommended Cadence

- Daily automated production backup.
- Manual backup before schema changes or data migrations.
- Monthly restore drill into staging.
- Keep at least 7 daily backups and 4 weekly backups.

## Supabase Production Backup Check

The current production database connection host points to Supabase. Before onboarding the first paying customer, confirm the provider-level backup is active from the Supabase dashboard:

1. Open Supabase.
2. Select the PayNest production project.
3. Go to **Database > Backups**.
4. Confirm at least one recent backup exists.
5. Confirm the project is on a plan that includes daily backups for production use.
6. Record the latest backup timestamp in the launch checklist.
7. If the project is on a free/non-production plan, upgrade before onboarding customer payroll data.

Supabase provider backups cover the Postgres database. They do not replace the restore drill; still restore into staging monthly before trusting the recovery path.
