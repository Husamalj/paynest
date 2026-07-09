# Subscription / Payments Plan

PayNest does not yet have live payment processing. This must be completed before self-serve commercial billing.

## Recommended Phases

### Phase 1: Manual Billing Gate

- Add plans in code/database.
- Super admin assigns a plan to each company.
- Enforce `maxEmployees`.
- Track trial start/end dates.
- Show subscription status in Super Admin.

This supports first customers without online card payments.

### Phase 2: Stripe Test Mode

Required secrets:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Build:

- checkout session
- customer portal
- webhook handling
- invoice history
- failed-payment status
- subscription cancellation

### Phase 3: Live Billing

Before live payments:

- verified business account
- tax/VAT decision
- invoice terms
- refund/cancellation policy
- support process for failed cards

## Local Payment Gateway Alternative

If targeting Jordan/MENA first, evaluate a local gateway before Stripe live:

- supported countries and currencies
- recurring billing support
- webhook reliability
- settlement timing
- invoice/tax support

## Go/No-Go

Do not enable live paid signup until:

- staging webhook test passes
- subscription downgrade/upgrade tested
- failed payment tested
- cancellation tested
- invoice email tested
- support runbook written

