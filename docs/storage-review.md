# Upload And Storage Review

PayNest currently stores several uploaded or generated files as database-backed data URLs or parses files immediately during upload.

## Current Guidance

- Keep short-lived import files temporary.
- Keep employee documents private and tenant-scoped.
- Do not store large binary files directly in PostgreSQL long term.

## Recommended Next Step

Before production file-heavy usage, move durable documents to private object storage such as Supabase Storage or S3-compatible storage.

Required behavior:

- Files are scoped by `companyId`.
- Download APIs verify auth and page access.
- Object keys do not expose customer names or emails.
- Signed URLs expire quickly.
- File size and MIME type are validated before storage.

## Routes To Review

- `app/api/upload/route.ts`
- `app/api/upload/[id]/download/route.ts`
- `app/api/employees/[id]/documents/route.ts`
- `app/api/messages/[id]/attachment/route.ts`
