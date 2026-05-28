# Track 3: Documents & Exports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add payslip PDF download (employee portal + HR payroll page) and upgrade reports export from CSV to Excel (.xlsx).

**Architecture:** Payslip PDF uses `@react-pdf/renderer` client-side — no server needed, pure React component. Excel export uses the `xlsx` (SheetJS) package with a shared utility function. Both are triggered by buttons in existing pages — no new routes.

**Tech Stack:** Next.js 14, TypeScript, `@react-pdf/renderer`, `xlsx` (SheetJS)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `@react-pdf/renderer` and `xlsx` |
| `components/PayslipPDF.tsx` | Create | React PDF component for a single payslip |
| `app/employee-portal/page.tsx` | Modify | Add "Download PDF" button on payslip section |
| `app/(app)/payroll/page.tsx` | Modify | Add per-row "Download PDF" button |
| `app/(app)/reports/page.tsx` | Modify | Replace CSV export with Excel (.xlsx) export |

---

## Task 1: Install Packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
cd /e/paynest && npm install @react-pdf/renderer xlsx
```

Expected output: `added N packages`

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add package.json package-lock.json && git commit -m "feat: add @react-pdf/renderer and xlsx packages"
```

---

## Task 2: Create PayslipPDF Component

**Files:**
- Create: `components/PayslipPDF.tsx`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import {
  Document, Page, Text, View, StyleSheet, PDFDownloadLink,
} from "@react-pdf/renderer";
import { Download } from "lucide-react";

const styles = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 10, padding: 40, color: "#1e293b" },
  header: { marginBottom: 20, borderBottom: "2px solid #2563eb", paddingBottom: 12 },
  brand: { fontSize: 22, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  subhead: { fontSize: 11, color: "#64748b", marginTop: 2 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#334155", borderBottom: "1px solid #e2e8f0", paddingBottom: 4, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  label: { color: "#64748b" },
  value: { fontFamily: "Helvetica-Bold", color: "#0f172a" },
  valueGreen: { fontFamily: "Helvetica-Bold", color: "#16a34a" },
  valueRed: { fontFamily: "Helvetica-Bold", color: "#dc2626" },
  valueBlue: { fontFamily: "Helvetica-Bold", color: "#2563eb" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "2px solid #2563eb" },
  totalLabel: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#1e293b" },
  totalValue: { fontSize: 12, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", fontSize: 8, color: "#94a3b8", borderTop: "1px solid #e2e8f0", paddingTop: 8 },
});

function fmt(val: unknown) {
  return (parseFloat(String(val)) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PayslipData {
  employeeName: string;
  employeeId: string;
  companyName: string;
  month: number;
  year: number;
  baseSalary: unknown;
  totalHours?: unknown;
  adjustment?: unknown;
  bonusTotal?: unknown;
  deductionTotal?: unknown;
  socialSecurityDeduct?: unknown;
  netSalary: unknown;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function PayslipDocument({ data }: { data: PayslipData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Pay<Text style={{ color: "#1e293b" }}>Nest</Text></Text>
          <Text style={styles.subhead}>Payslip — {MONTHS[data.month - 1]} {data.year}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>
          <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{data.employeeName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Employee ID</Text><Text style={styles.value}>{data.employeeId}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Company</Text><Text style={styles.value}>{data.companyName}</Text></View>
          <View style={styles.row}><Text style={styles.label}>Period</Text><Text style={styles.value}>{MONTHS[data.month - 1]} {data.year}</Text></View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.row}><Text style={styles.label}>Base Salary</Text><Text style={styles.value}>{fmt(data.baseSalary)}</Text></View>
          {data.totalHours !== undefined && (
            <View style={styles.row}><Text style={styles.label}>Total Hours</Text><Text style={styles.value}>{parseFloat(String(data.totalHours || 0)).toFixed(2)}</Text></View>
          )}
          {parseFloat(String(data.adjustment || 0)) !== 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Hour Adjustment</Text>
              <Text style={parseFloat(String(data.adjustment || 0)) >= 0 ? styles.valueGreen : styles.valueRed}>{fmt(data.adjustment)}</Text>
            </View>
          )}
          {parseFloat(String(data.bonusTotal || 0)) > 0 && (
            <View style={styles.row}><Text style={styles.label}>Bonuses</Text><Text style={styles.valueGreen}>{fmt(data.bonusTotal)}</Text></View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Deductions</Text>
          {parseFloat(String(data.deductionTotal || 0)) > 0 && (
            <View style={styles.row}><Text style={styles.label}>Deductions</Text><Text style={styles.valueRed}>-{fmt(data.deductionTotal)}</Text></View>
          )}
          {parseFloat(String(data.socialSecurityDeduct || 0)) > 0 && (
            <View style={styles.row}><Text style={styles.label}>Social Security</Text><Text style={styles.valueRed}>-{fmt(data.socialSecurityDeduct)}</Text></View>
          )}
          {parseFloat(String(data.deductionTotal || 0)) === 0 && parseFloat(String(data.socialSecurityDeduct || 0)) === 0 && (
            <View style={styles.row}><Text style={styles.label}>No deductions</Text><Text style={styles.value}>—</Text></View>
          )}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net Pay</Text>
          <Text style={styles.totalValue}>{fmt(data.netSalary)}</Text>
        </View>

        <Text style={styles.footer}>PayNest — HR & Payroll for MENA businesses · Generated {new Date().toLocaleDateString()}</Text>
      </Page>
    </Document>
  );
}

export function DownloadPayslipButton({ data, filename }: { data: PayslipData; filename: string }) {
  return (
    <PDFDownloadLink document={<PayslipDocument data={data} />} fileName={filename}>
      {({ loading }) => (
        <button
          className="btn btn-secondary gap-1.5 text-sm"
          disabled={loading}
        >
          <Download size={14} />
          {loading ? "Preparing…" : "Download PDF"}
        </button>
      )}
    </PDFDownloadLink>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd /e/paynest && git add components/PayslipPDF.tsx && git commit -m "feat: add PayslipPDF component with react-pdf/renderer"
```

---

## Task 3: Add PDF Download to Employee Portal

**Files:**
- Modify: `app/employee-portal/page.tsx`

- [ ] **Step 1: Read the payslip section of employee portal**

Run: `grep -n "payslip\|netSalary\|net_salary\|baseSalary\|periodMonth\|period_month" /e/paynest/app/employee-portal/page.tsx | head -30`

- [ ] **Step 2: Add the import at the top of the file**

Find the existing imports block (after `"use client";`) and add:
```typescript
import dynamic from "next/dynamic";

const DownloadPayslipButton = dynamic(
  () => import("@/components/PayslipPDF").then((m) => m.DownloadPayslipButton),
  { ssr: false }
);
```

- [ ] **Step 3: Find the payslip card in the render and add download button**

Search for the payroll section rendered in the employee portal (look for where `payroll.map` is used or where `net_salary`/`netSalary` is displayed). After the payslip summary row for each period, add:

```typescript
<DownloadPayslipButton
  data={{
    employeeName: employee?.name || "",
    employeeId: employeeId,
    companyName: typeof window !== "undefined" ? localStorage.getItem("companyName") || "PayNest" : "PayNest",
    month: p.periodMonth || p.period_month,
    year: p.periodYear || p.period_year,
    baseSalary: p.baseSalary || p.base_salary,
    totalHours: p.totalHours || p.total_hours,
    adjustment: p.adjustment,
    bonusTotal: p.bonusTotal || p.bonus_total,
    deductionTotal: p.deductionTotal || p.deduction_total,
    socialSecurityDeduct: p.socialSecurityDeduct || p.social_security_deduct,
    netSalary: p.netSalary || p.net_salary,
  }}
  filename={`payslip-${p.periodMonth || p.period_month}-${p.periodYear || p.period_year}-${employeeId}.pdf`}
/>
```

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add app/employee-portal/page.tsx && git commit -m "feat: add payslip PDF download to employee portal"
```

---

## Task 4: Add PDF Download to HR Payroll Page

**Files:**
- Modify: `app/(app)/payroll/page.tsx`

- [ ] **Step 1: Add dynamic import at top of file**

After the existing imports, add:
```typescript
import dynamic from "next/dynamic";

const DownloadPayslipButton = dynamic(
  () => import("@/components/PayslipPDF").then((m) => m.DownloadPayslipButton),
  { ssr: false }
);
```

Also read the current company name from localStorage. Near the top of the component, add:
```typescript
const companyName = typeof window !== "undefined" ? localStorage.getItem("companyName") || "PayNest" : "PayNest";
```

- [ ] **Step 2: Read the table rows in the payroll page**

Run: `grep -n "row\.\|expanded\|toggleExpand\|ChevronRight\|ChevronDown" /e/paynest/app/\(app\)/payroll/page.tsx | head -40`

- [ ] **Step 3: Add download button to each employee row**

In the table where each payroll row (`row`) is rendered, find the last `<td>` in each row and add a new `<td>` with the download button:

```typescript
<td>
  <DownloadPayslipButton
    data={{
      employeeName: row.name || row.employeeName || "",
      employeeId: row.employeeId || "",
      companyName,
      month: periodMonth,
      year: periodYear,
      baseSalary: row.baseSalary || row.base_salary,
      totalHours: row.totalHours || row.total_hours,
      adjustment: row.adjustment,
      bonusTotal: row.bonusTotal || row.bonus_total,
      deductionTotal: row.deductionTotal || row.deduction_total,
      socialSecurityDeduct: row.socialSecurityDeduct || row.social_security_deduct,
      netSalary: row.netSalary || row.net_salary,
    }}
    filename={`payslip-${periodMonth}-${periodYear}-${row.employeeId || "emp"}.pdf`}
  />
</td>
```

Also add a `<th>PDF</th>` to the header row.

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add "app/(app)/payroll/page.tsx" && git commit -m "feat: add per-employee payslip PDF download to payroll page"
```

---

## Task 5: Upgrade Reports Export to Excel

**Files:**
- Modify: `app/(app)/reports/page.tsx`

- [ ] **Step 1: Add xlsx import**

At the top of `app/(app)/reports/page.tsx`, add:
```typescript
import * as XLSX from "xlsx";
```

- [ ] **Step 2: Replace `downloadCSV` function with `downloadExcel`**

Find the existing `downloadCSV` function (lines ~12-19) and replace it:

```typescript
function downloadExcel(rows: any[], filename: string) {
  if (!rows.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payroll");
  XLSX.writeFile(wb, filename);
}
```

- [ ] **Step 3: Update the button call site**

Find the existing call to `downloadCSV(payroll, ...)` in the JSX and replace with:

```typescript
<button
  className="btn btn-secondary"
  onClick={() => downloadExcel(payroll, `payroll-${selected?.month}-${selected?.year}.xlsx`)}
>
  <Download size={15} /> Export Excel
</button>
```

Remove the `Download` icon import if it was unused (it's already imported).

- [ ] **Step 4: Commit**

```bash
cd /e/paynest && git add "app/(app)/reports/page.tsx" && git commit -m "feat: upgrade reports export from CSV to Excel (.xlsx)"
```
