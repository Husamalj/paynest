# Support Runbook

Use this when a customer reports an issue. Start with evidence, check health and logs, then make the smallest safe fix.

## First 5 Steps For Any Ticket

1. Ask for the company name, user email, role, page, exact time, and screenshot.
2. Check production health:

```text
https://paynest-two.vercel.app/api/health?strict=1
```

3. Check the latest Vercel deployment status and logs around the reported time.
4. Search for a `requestId` in the customer error response or Vercel logs.
5. Confirm whether the issue affects one user, one company, or all companies.

Never edit production data manually before recording:

- affected company
- affected user
- reason for the change
- exact query/action
- before and after evidence

## Customer Cannot Log In

1. Confirm they are using the right portal:
   - employee users: Employee Portal
   - owner, HR, super admin: Staff Portal
2. Confirm the email is spelled correctly and belongs to the expected company.
3. Check whether the user/company is active, suspended, or pending approval.
4. Ask them to use forgot password, then check Resend logs if the email does not arrive.
5. If login still fails, check Vercel logs for auth errors at the exact timestamp.

Escalate if multiple users from the same company cannot log in.

## Salary Or Payroll Looks Wrong

1. Confirm the payroll month and year shown on screen.
2. Check employee base salary, allowance, joining date, and contract dates.
3. Check attendance, leaves, deductions, bonuses, and evaluation bonus rules for that period.
4. If evaluations exist from multiple supervisors, verify the average score and resulting bonus tier.
5. Compare the displayed number with the payroll calculation rules in `docs/PAYROLL_LOGIC.md`.

Do not override payroll numbers until the source of the difference is clear.

## Email Did Not Arrive

1. Ask the user to check Inbox, Spam/Junk, and Promotions.
2. Confirm the recipient email is correct.
3. Check:

```text
https://paynest-two.vercel.app/api/health?strict=1
```

Expected:

```json
{ "checks": { "email": "configured" } }
```

4. Check Resend activity logs for delivery, bounce, block, or domain verification errors.
5. If Resend shows no event, check Vercel logs for the email API/action that should have sent it.

If the sending domain is not verified in Resend, fix domain verification before retrying.

## Hidden Pages Are Not Working

1. Log in as Super Admin and open the company row.
2. Click `Pages`, choose hidden pages, then save.
3. Log out and log in again as owner or HR from the same company.
4. Confirm the hidden pages are gone from navigation.
5. If still visible, check whether the company ID matches the user company ID.

This is a tenant-specific setting. Do not copy hidden page settings between companies unless requested.

## User Sees Another Company's Data

Treat this as high severity.

1. Capture the user email, company, page, and screenshot immediately.
2. Ask the user to stop using that page until confirmed safe.
3. Check the API route logs and confirm tenant filters use the user's company ID.
4. Run:

```bash
npm run check:isolation
```

5. If leakage is confirmed, disable the affected workflow or roll back the latest deployment.

Do not export or send customer data while investigating.

## Excel Upload Failed

1. Ask for the template/file that failed, but never share it publicly.
2. Check whether required columns are present and named consistently.
3. Check for missing employee names, duplicate employee numbers, invalid salaries, or invalid dates.
4. Try the same upload on staging with fake data if possible.
5. If the format is valid but import fails, check Vercel logs and save the request timestamp.

For real customer files, delete local copies after debugging.

## Site Is Slow Or Down

1. Check:

```text
https://paynest-two.vercel.app/api/health?strict=1
```

2. Check Vercel deployment status and function errors.
3. Check database provider status, connection pool usage, and slow queries.
4. Check whether the issue started after the latest deployment.
5. If the latest deployment caused it, roll back in Vercel.

If production database is unavailable, avoid repeated retries that could increase load.

## When To Escalate

Escalate immediately when:

- multiple companies are affected
- tenant isolation may be broken
- payroll numbers are wrong for many employees
- production health is failing
- database writes are failing
- email delivery is down for all users
- a customer reports seeing data they should not see

## Customer Reply Template

```text
Thanks for reporting this. We are checking the account, logs, and system health now.
Please send the page name, approximate time, screenshot, and the email address used to sign in.
We will update you as soon as we identify whether this is account-specific or system-wide.
```
