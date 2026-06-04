# PayNest load testing with k6

Verifies the live site stays responsive (doesn't drop or hang) under traffic.

## 1. Install k6 (Windows)

```powershell
winget install k6 --source winget
```

Close and reopen your terminal afterwards so `k6` is on PATH. Verify:

```powershell
k6 version
```

## 2. Smoke test (start here)

Confirms the site is up. 1 virtual user, 30 seconds:

```powershell
k6 run loadtest/smoke.js
```

## 3. Load / soak test

Ramps up to 20 concurrent users, holds for 2 minutes, then ramps down —
watching for failures, latency spikes, or hangs.

Public pages only:

```powershell
k6 run loadtest/load.js
```

With a real login (exercises the database — recommended):

```powershell
k6 run -e EMAIL=you@example.com -e PASSWORD=yourpass loadtest/load.js
```

Crank up the peak load:

```powershell
k6 run -e PEAK_VUS=50 -e EMAIL=you@example.com -e PASSWORD=yourpass loadtest/load.js
```

## Reading the result

At the end k6 prints a summary. The lines that matter:

- **`http_req_failed`** — should be near `0.00%`. Anything climbing means requests are dropping.
- **`http_req_duration` p(95)** — 95th-percentile response time. If this balloons as VUs rise, the site is straining.
- **`checks`** — percent of assertions that passed; want `100%`.
- The `✓ / ✗` next to each threshold: green = passed, red = breached.

A clean run = all thresholds green, failure rate ~0%, latency flat as load rises → the site is **not** dropping or hanging.

## ⚠️ Important

- This hits **production on Vercel**. The Hobby plan has limits — keep `PEAK_VUS` modest (≤50) and runs short. Heavy sustained load can trip Vercel/Supabase rate limits and isn't representative of real failure.
- Don't point high VUs at `/api/auth/login` for long: every call runs bcrypt + a DB query. Use a throwaway test account, not a real employee's.
