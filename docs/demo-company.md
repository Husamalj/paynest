# PayNest Demo Company

This is a fake, sales-safe demo tenant for product walkthroughs. It contains no real customer data.

## Seed

Run against the intended database:

```bash
PAYNEST_ALLOW_DEMO_SEED=true npm run demo:seed
```

Optional fixed password:

```bash
PAYNEST_ALLOW_DEMO_SEED=true PAYNEST_DEMO_PASSWORD="replace-with-a-strong-demo-password" npm run demo:seed
```

If `PAYNEST_DEMO_PASSWORD` is omitted, the script generates a strong password and prints it once.

## Demo Accounts

- Owner: `owner@demo.paynest.app`
- HR: `hr@demo.paynest.app`
- Employee: `employee@demo.paynest.app`

## Scope

The script only resets and recreates the tenant with slug `paynest-demo`.
It verifies the seeded tenant after every run and fails if required demo records are missing or if any seeded user/employee email is outside `@demo.paynest.app`.

It seeds:

- company settings and onboarding completion
- owner, HR, and employee login accounts
- employee roster
- attendance records
- payroll records
- bonuses and deductions
- leave balances and leave requests
- official holidays
- tasks
- remote assignments
- announcements
- notifications
- private messages
- custom request type and request
- advance request
- company events
- evaluations
- audit log entries

## Safety Notes

- Never use real people, real salaries, or real customer emails in this seed.
- Rotate the demo password before public demos.
- Do not use this tenant for load tests; create a separate staging tenant for that.
