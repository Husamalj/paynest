# PayNest Payroll Calculation Logic

> Two payroll modes are supported. The active mode is set per-company in
> `CompanySettings.systemMode` (`"hourly"` or `"daily"`).

Implementation lives in [`lib/payrollCalc.ts`](../lib/payrollCalc.ts).

---

## Hours Mode (نظام الساعات)

The whole month is treated as **one block of hours**. The key comparison is
`Worked Hours` vs `Required Hours`.

### Step 1 — Required Hours

```
Required Hours = Month Days × Required Daily Hours
```

Example: `26 × 8 = 208`

### Step 2 — Hourly Rate

```
Hourly Rate = Base Salary ÷ Required Hours
```

Example: `800 ÷ 208 = 3.84/hour`

### Step 3 — Paid Leave Effect

Paid leave **reduces** the required hours:

```
Required Hours = Base Required − (Paid Leave Days × Daily Hours)
```

Unpaid leave does **not** reduce the requirement.

### Step 4 — Total Worked Hours

Sum `attendance.hours_worked` for the whole month. Leave days are skipped.

### Step 5 — Hours Difference

```
Difference = Worked Hours − Required Hours
```

### Step 6 — Deduction / Overtime

- If diff is **negative** → deduction:
  ```
  Deduction = Difference × Hourly Rate × Deduction Rate
  ```
- If diff is **positive** → overtime:
  ```
  Overtime = Difference × Hourly Rate × Extra Rate
  ```

### Step 7 — Social Security

If enabled for the employee:

```
Social Security = Base Salary × 7.5%
```

### Step 8 — Bonuses & Manual Deductions

From the `bonuses_deductions` table:
- `bonus` → added
- `deduction` → subtracted

### Step 9 — Final Net Salary

```
Net Salary = Base Salary
           + Hours Adjustment
           − Social Security
           + Bonuses
           − Deductions
```

---

## Daily Mode (نظام اليومي)

The system evaluates **each workday separately** rather than the month
as a single block. For every day it checks:

- Present
- Absent
- Late
- Leave (paid / unpaid)
- Worked Hours
- Overtime

### Paid Leave
Day is paid in full — **no deduction**.

### Unpaid Leave
Day is deducted (`reqHours × hourlyRate`).

### Absence (no leave + no clock)
Day is deducted (`reqHours × hourlyRate`).

### Late Tolerance

`late_tolerance` (minutes) is the grace window. Below the threshold:
no deduction. Above it: deduction applies based on settings.

### Overtime

If worked > required for the day:

```
Extra Hours × Hourly Rate × Extra Rate
```

### Final Daily Salary

```
Net Salary = Base Salary
           − Daily Deductions
           + Overtime
           + Bonuses
           − Manual Deductions
           − Social Security
```

---

## Settings reference (`company_settings`)

| Field | Meaning | Default |
|---|---|---|
| `system_mode` | `"hourly"` or `"daily"` | `daily` |
| `req_hours` | Required daily hours | 8 |
| `month_days` | Workdays per month | 26 |
| `late_tolerance` | Late tolerance in minutes | 0 |
| `deduction_rate` | Multiplier for shortfall deduction | 1.0 |
| `extra_rate` | Multiplier for overtime | 1.0 |
| `workdays` | Comma-separated days (`Sun,Mon,Tue,Wed,Thu`) | weekdays |

---

## Notes & guarantees

- Cross-company isolation: every query is scoped by `companyId`.
- Owner accounts are excluded from employee counts and quota enforcement.
- The actual implementation handles edge cases (zero base salary, no
  attendance, etc.) without throwing — it just yields zeroed adjustments.
