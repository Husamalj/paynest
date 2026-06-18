/**
 * Excel/CSV parser — ported from backend/src/utils/excelParser.js
 */
import * as XLSX from "xlsx";

function normalizeHeader(v: unknown): string {
  return String(v || "").toLowerCase().trim();
}

function normalizeId(id: unknown): string {
  if (id == null || id === "") return "";
  if (typeof id === "number") return String(Math.trunc(id));
  const s = String(id).trim();
  if (!s) return "";
  const n = Number(s);
  if (!isNaN(n) && /^-?\d+(\.\d+)?$/.test(s)) return String(Math.trunc(n));
  return s;
}

function normalizeName(name: unknown): string {
  return String(name || "").trim().replace(/\s+/g, " ");
}

function findHeaderIndex(headers: string[], keys: string[]): number {
  for (const k of keys) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h && (h === k || h.includes(k))) return i;
    }
  }
  return -1;
}

function parseDateValue(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    const date = (XLSX.SSF as any).parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, "0");
      const d = String(date.d).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  }
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
  const slash = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (slash) {
    const a = parseInt(slash[1]);
    const b = parseInt(slash[2]);
    let y = parseInt(slash[3]);
    if (y < 100) y += 2000;
    return `${y}-${String(b).padStart(2, "0")}-${String(a).padStart(2, "0")}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return null;
}

function parseTimeValue(val: unknown): string | null {
  if (val == null || val === "") return null;
  if (typeof val === "number") {
    const frac = val % 1;
    const totalMinutes = Math.round(frac * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const str = String(val).trim();
  const m = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM|am|pm|ص|م))?/);
  if (m) {
    let h = parseInt(m[1]);
    const mm = parseInt(m[2]);
    const p = (m[3] || "").toUpperCase();
    if ((p === "PM" || p === "م") && h !== 12) h += 12;
    if ((p === "AM" || p === "ص") && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }
  return null;
}

function parseHoursValue(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") {
    if (v <= 0) return null;
    if (v < 1) return parseFloat((v * 24).toFixed(4));
    return parseFloat(v.toFixed(4));
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}/.test(s)) {
    const parts = s.split(":");
    const h = parseInt(parts[0]);
    const mm = parseInt(parts[1]);
    if (!isNaN(h) && !isNaN(mm)) return parseFloat((h + mm / 60).toFixed(4));
  }
  const n = parseFloat(s.replace(",", "."));
  if (!isNaN(n) && n > 0) return n;
  return null;
}

function calcHours(a: unknown, b: unknown): number {
  function toMin(s: unknown): number | null {
    if (!s) return null;
    const t = parseTimeValue(s);
    if (!t) return null;
    const [hh, mm] = t.split(":").map(Number);
    return hh * 60 + mm;
  }
  const i = toMin(a);
  const o = toMin(b);
  if (i == null || o == null) return 0;
  return parseFloat((((o - i + 1440) % 1440) / 60).toFixed(4));
}

function parseSalaryValue(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = String(v).replace(/[^\d.\-]/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function findAttendanceHeaderRow(rows: unknown[][]): number {
  const nameKeys = ["first name","last name","employee id","emp id","employee name","full name","staff name","name","اسم","الاسم","اسم الموظف","الموظف"];
  const timeKeys = ["clock in","clock out","check in","check out","work time","worked hours","total hours","regular","hours","duration","time","دخول","خروج","ساعات","وقت"];
  const dateKeys = ["date","work date","day","التاريخ","اليوم"];
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    if (!rows[i]) continue;
    const cells = rows[i].map(normalizeHeader);
    const nameHits = cells.filter((c) => nameKeys.some((k) => c.includes(k))).length;
    const timeHits = cells.filter((c) => timeKeys.some((k) => c.includes(k))).length;
    const dateHits = cells.filter((c) => dateKeys.some((k) => c.includes(k))).length;
    if (nameHits && (timeHits || dateHits)) return i;
  }
  return -1;
}

function findSalaryHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    if (!rows[i]) continue;
    const cells = rows[i].map(normalizeHeader);
    const hasSalary = cells.some((c) => c.includes("salary") || c.includes("basic") || c.includes("base") || c.includes("amount") || c.includes("راتب") || c.includes("الراتب") || c.includes("اجر") || c.includes("أجر"));
    const hasName = cells.some((c) => c.includes("name") || c.includes("اسم"));
    const hasId = cells.some((c) => c.includes("employee id") || c.includes("emp id") || c === "id" || c.includes("رقم"));
    if (hasSalary && (hasName || hasId)) return i;
  }
  return -1;
}

export interface AttendanceRecord {
  employee_id: string;
  employee_name: string;
  work_date: string;
  clock_in: string | null;
  clock_out: string | null;
  hours_worked: number;
  upload_batch: string;
}

export interface EmployeeRecord {
  employee_id: string;
  name: string;
  base_salary: number;
  social_security: boolean;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  join_date?: string | null;
  contract_end_date?: string | null;
}

/**
 * Detect the new SANA salary workbook (المصنف المحدث): header on row 1 with
 * "الرقم الوظيفي" + "تاريخ بدء العقد", data starting row 4. Columns by letter:
 *   B=id  C=name  D=contract start (join)  E=contract end (leave)
 *   M=email  N=department  O=base salary
 * Returns the 0-based header row index, or -1 if not this format.
 */
function findSalaryV2HeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    if (!rows[i]) continue;
    const cells = rows[i].map(normalizeHeader);
    const joined = cells.join("|");
    const hasId = joined.includes("الرقم الوظيفي") || joined.includes("الرقم الوظ");
    const hasContractStart = joined.includes("تاريخ بدء العقد") || joined.includes("بدء العقد");
    const hasEmail = joined.includes("البريد") || joined.includes("الالكتروني");
    if (hasId && hasContractStart && hasEmail) return i;
  }
  return -1;
}

export function parseAttendanceFile(buffer: Buffer, batchId: string): AttendanceRecord[] & { employeeCount?: number } {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, cellNF: false });
  const allRecords: AttendanceRecord[] = [];
  const seenEmployees = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
    if (!rows.length) continue;

    const headerRow = findAttendanceHeaderRow(rows);
    if (headerRow >= 0) {
      const headers = rows[headerRow].map(normalizeHeader);
      const iFirstName = findHeaderIndex(headers, ["first name","firstname","fname"]);
      const iLastName = findHeaderIndex(headers, ["last name","lastname","lname"]);
      let iName = findHeaderIndex(headers, ["employee name","full name","staff name","name","اسم","الاسم","اسم الموظف","الموظف"]);
      const iEmpID = findHeaderIndex(headers, ["employee id","emp id","id","رقم الموظف","رقم"]);
      const iWorked = findHeaderIndex(headers, ["worked hours","work hours","work time","worked time","duration","hours","ساعات","وقت العمل"]);
      const iTotalH = findHeaderIndex(headers, ["total hours","total time"]);
      const iRegular = findHeaderIndex(headers, ["regular","regular(h)"]);
      const iClockIn = findHeaderIndex(headers, ["clock in","check in","time in","in time","on duty","دخول","وقت الدخول"]);
      const iClockOut = findHeaderIndex(headers, ["clock out","check out","time out","out time","off duty","خروج","وقت الخروج"]);
      const iException = findHeaderIndex(headers, ["exception","status","الحالة"]);
      const iDate = findHeaderIndex(headers, ["date","work date","day","التاريخ","اليوم"]);
      if (iName < 0 && iFirstName < 0 && iEmpID < 0) iName = 0;
      const hoursIdx = iWorked >= 0 ? iWorked : iTotalH >= 0 ? iTotalH : iRegular;

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => c == null || c === "")) continue;
        let name = "";
        const empId = iEmpID >= 0 ? normalizeId(row[iEmpID]) : "";
        if (iFirstName >= 0 && row[iFirstName]) {
          name = normalizeName(row[iFirstName]);
          if (iLastName >= 0 && row[iLastName]) name += " " + normalizeName(row[iLastName]);
        } else if (iName >= 0 && row[iName]) {
          name = normalizeName(row[iName]);
        } else if (iEmpID >= 0 && row[iEmpID]) {
          name = String(row[iEmpID]).trim();
        }
        if (!name || name.toLowerCase() === "undefined") continue;
        const exceptVal = iException >= 0 ? String(row[iException] || "").toLowerCase().trim() : "";
        if (exceptVal === "absent" || exceptVal === "absence" || exceptVal === "غياب") continue;
        const clockInRaw = iClockIn >= 0 ? row[iClockIn] : null;
        const clockOutRaw = iClockOut >= 0 ? row[iClockOut] : null;
        const clockIn = parseTimeValue(clockInRaw);
        const clockOut = parseTimeValue(clockOutRaw);
        const clockInVal = clockInRaw != null ? String(clockInRaw).trim() : "";
        const hasRealClockIn = clockInVal && clockInVal !== "00:00" && clockInVal !== "00:00:00" && clockInVal !== "0:00" && clockInVal !== "0";
        let hours: number | null = null;
        if (hoursIdx >= 0 && hoursIdx !== iRegular) hours = parseHoursValue(row[hoursIdx]);
        if ((hours == null || hours <= 0) && clockIn && clockOut) hours = calcHours(clockInRaw, clockOutRaw);
        if ((hours == null || hours <= 0) && iRegular >= 0 && hasRealClockIn) hours = parseHoursValue(row[iRegular]);
        if (!hours || hours <= 0) continue;
        const date = iDate >= 0 ? parseDateValue(row[iDate]) : null;
        if (!date) continue;
        const employee_id = empId || name;
        seenEmployees.add(employee_id);
        allRecords.push({ employee_id, employee_name: name, work_date: date, clock_in: clockIn, clock_out: clockOut, hours_worked: parseFloat(hours.toFixed(4)), upload_batch: batchId });
      }
    }
  }

  (allRecords as any).employeeCount = seenEmployees.size;
  return allRecords as AttendanceRecord[] & { employeeCount?: number };
}

export function parseSalaryFile(buffer: Buffer): EmployeeRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
  if (!rows.length) return [];

  // ── New SANA workbook format (header row 1, data from row 4) ──────────────
  const v2HeaderRow = findSalaryV2HeaderRow(rows);
  if (v2HeaderRow >= 0) {
    return parseSalaryV2(rows, v2HeaderRow);
  }

  const headerRow = findSalaryHeaderRow(rows);
  const employees: EmployeeRecord[] = [];
  const seen = new Set<string>();

  if (headerRow >= 0) {
    const headers = rows[headerRow].map(normalizeHeader);
    const iId = findHeaderIndex(headers, ["employee id","emp id","id","رقم الموظف","رقم","code"]);
    const iFirstName = findHeaderIndex(headers, ["first name","firstname"]);
    const iLastName = findHeaderIndex(headers, ["last name","lastname"]);
    const iName = findHeaderIndex(headers, ["employee name","full name","name","اسم","الاسم","اسم الموظف","الموظف"]);
    const iSalary = findHeaderIndex(headers, ["basic salary","base salary","salary","basic","amount","الراتب","راتب","اجر","أجر"]);
    const iGuarantee = findHeaderIndex(headers, ["guarantee","ضمان","كفالة"]);

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c == null || c === "")) continue;
      const id = iId >= 0 ? normalizeId(row[iId]) : "";
      let name = "";
      if (iFirstName >= 0 && row[iFirstName]) {
        name = normalizeName(row[iFirstName]);
        if (iLastName >= 0 && row[iLastName]) name += " " + normalizeName(row[iLastName]);
      } else if (iName >= 0 && row[iName]) {
        name = normalizeName(row[iName]);
      }
      const salary = iSalary >= 0 ? parseSalaryValue(row[iSalary]) : 0;
      const guarantee = iGuarantee >= 0 && row[iGuarantee] ? /yes|y|yas|1|true|نعم/i.test(String(row[iGuarantee]).trim()) : false;
      if (!name) continue;
      const lower = name.toLowerCase();
      if (lower === "total" || lower.startsWith("الإجمالي") || lower.startsWith("المجموع")) continue;
      if (salary <= 0) continue;
      const employee_id = id || name;
      if (seen.has(employee_id)) continue;
      seen.add(employee_id);
      employees.push({ employee_id, name, base_salary: salary, social_security: guarantee });
    }
  }

  return employees;
}

/**
 * Parse the new SANA salary workbook. Header is on `headerRow` (row 1); the
 * key headers all live on that row, so we locate columns by header text and
 * read every following row that carries a real employee id.
 */
function parseSalaryV2(rows: unknown[][], headerRow: number): EmployeeRecord[] {
  const headers = rows[headerRow].map(normalizeHeader);
  const col = (...keys: string[]) => findHeaderIndex(headers, keys);

  const iId      = col("الرقم الوظيفي", "الرقم الوظ", "employee id", "id");
  const iName    = col("اسم الموظف", "الاسم", "اسم", "name");
  const iStart   = col("تاريخ بدء العقد", "بدء العقد");
  const iEnd     = col("تاريخ انتهاء العقد", "انتهاء العقد");
  const iEmail   = col("البريد الالكتروني", "البريد", "email");
  const iPhone   = col("رقم الهاتف", "الهاتف", "هاتف", "موبايل", "جوال", "phone", "mobile", "tel");
  const iDept    = col("القسم التابع له", "القسم", "department");
  const iSalary  = col("الراتب الأساسي", "الراتب الاساسي", "الراتب", "base salary", "basic salary");
  const iGuar    = col("راتب الضمان", "الضمان الاجتماعي", "نسبة الضمان");

  const employees: EmployeeRecord[] = [];
  const seen = new Set<string>();

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c == null || c === "")) continue;

    const id = iId >= 0 ? normalizeId(row[iId]) : "";
    const name = iName >= 0 ? normalizeName(row[iName]) : "";
    // Sub-header rows (2-3) and totals have no real id+name pair — skip them.
    if (!id && !name) continue;
    if (!name) continue;
    const lower = name.toLowerCase();
    if (lower === "total" || lower.startsWith("الإجمالي") || lower.startsWith("المجموع")) continue;

    const salary = iSalary >= 0 ? parseSalaryValue(row[iSalary]) : 0;
    const employee_id = id || name;
    if (seen.has(employee_id)) continue;
    seen.add(employee_id);

    const email = iEmail >= 0 ? String(row[iEmail] || "").trim() : "";
    const phone = iPhone >= 0 ? String(row[iPhone] || "").trim() : "";
    const department = iDept >= 0 ? String(row[iDept] || "").trim() : "";
    const join_date = iStart >= 0 ? parseDateValue(row[iStart]) : null;
    const contract_end_date = iEnd >= 0 ? parseDateValue(row[iEnd]) : null;
    const social_security =
      iGuar >= 0 && row[iGuar] != null && parseSalaryValue(row[iGuar]) > 0;

    employees.push({
      employee_id,
      name,
      base_salary: salary,
      social_security,
      email: email || null,
      phone: phone || null,
      department: department || null,
      join_date,
      contract_end_date,
    });
  }

  return employees;
}

/**
 * Detect whether an uploaded workbook looks like an attendance (time/hours)
 * file or a salary file — used to warn when a file is dropped in the wrong box.
 * Returns "attendance" | "salary" | "unknown".
 */
export function detectFileKind(buffer: Buffer): "attendance" | "salary" | "unknown" {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false, cellNF: false });
    for (const sheetName of workbook.SheetNames) {
      const ws = workbook.Sheets[sheetName];
      if (!ws) continue;
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: true });
      if (!rows.length) continue;
      if (findSalaryV2HeaderRow(rows) >= 0) return "salary";
      if (findAttendanceHeaderRow(rows) >= 0) return "attendance";
      if (findSalaryHeaderRow(rows) >= 0) return "salary";
    }
  } catch { /* ignore */ }
  return "unknown";
}
