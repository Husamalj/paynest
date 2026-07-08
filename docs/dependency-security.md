# Dependency Security

Use this process before releases and whenever dependency alerts appear.

## Commands

```bash
npm run security:audit
npm audit fix
npm run check:ci
```

Do not run `npm audit fix --force` without reviewing the proposed major-version changes. It can downgrade or replace core framework packages.

## Spreadsheet Dependency Decision

PayNest no longer depends on the vulnerable `xlsx` package. Spreadsheet handling now uses `read-excel-file` for `.xlsx` imports and built-in CSV export for reports.

- Upload API accepts only `.xlsx` and `.csv`.
- Upload API rejects more than 5 spreadsheet files per request.
- Upload API rejects spreadsheets larger than 5MB.
- Spreadsheet upload is authenticated and tenant-scoped.
- Reports export CSV instead of `.xlsx`.

Legacy `.xls` and `.xlsm` uploads are intentionally not supported. Convert them to `.xlsx` or `.csv` before uploading.

## Automation

Dependabot is enabled for npm and GitHub Actions updates. Review dependency PRs with `npm run check:ci` and, for security-related updates, `npm run security:audit`.
