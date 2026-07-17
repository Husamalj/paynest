# Resend Email Setup

Email delivery is an optional capability and remains a safe no-op until `RESEND_API_KEY` is configured.

## Optional Vercel Production Variables

- `RESEND_API_KEY`
- `FROM_EMAIL`
- `CONTACT_EMAIL`
- `NEXT_PUBLIC_APP_URL`

Already configured except `RESEND_API_KEY`.

## Steps

1. Create or open the Resend account.
2. Verify the sending domain.
3. Create a production API key.
4. Add it to Vercel Production:

```bash
printf "re_xxxxx" | npx vercel env add RESEND_API_KEY production
```

5. Redeploy:

```bash
npx vercel --prod --yes
```

6. Verify:

```bash
curl https://paynest-two.vercel.app/api/health
```

Expected:

```json
{ "checks": { "email": "configured" } }
```

## Email Flows

- password reset
- email verification
- company approval welcome
- new employee credentials
- leave decision
- payslip ready
- contact/demo notifications

