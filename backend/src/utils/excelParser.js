/**
 * Excel/CSV parser — mirrors the old client-side parser.js logic
 * Scans up to 50 rows looking for headers, handles ZKTeco multi-day-per-employee
 * format, and extracts (employee_id, name, hours, salary) flexibly.
 */
const XLSX = require('xlsx');

/* ===================== UTIL ===================== */

function normalizeHeader(v) {
  return String(v || '').toLowerCase().trim();
}

function normalizeId(id) {
  if (id == null || id === '') return '';
  if (typeof id === 'number') return String(Math.trunc(id));
  const s = String(id).trim();
  if (!s) return '';
  const n = Number(s);
  if (!isNaN(n) && /^-?\d+(\.\d+)?$/.test(s)) return String(Math.trunc(n));
  return s;
}

function normalizeName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

function findHeaderIndex(headers, keys) {
  for (const k of keys) {
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      if (h && (h === k || h.includes(k))) return i;
    }
  }
  return -1;
}

function parseDateValue(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) {
      const y = date.y;
      const m = String(date.m).padStart(2, '0');
      const d = String(date.d).padStart(2, '0');
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
    return `${y}-${String(b).padStart(2, '0')}-${String(a).padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().substring(0, 10);
  return null;
}

function parseTimeValue(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') {
    const frac = val % 1;
    const totalMinutes = Math.round(frac * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }
  const str = String(val).trim();
  const m = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?(?:\s*(AM|PM|am|pm|ص|م))?/);
  if (m) {
    let h = parseInt(m[1]);
    const mm = parseInt(m[2]);
    const p = (m[3] || '').toUpperCase();
    if ((p === 'PM' || p === 'م') && h !== 12) h += 12;
    if ((p === 'AM' || p === 'ص') && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }
  return null;
}

/** Parse "08:30" / 0.354 (excel fraction) / 8.5 → 8.5 hours */
function parseHoursValue(v) {
  if (v == null || v === '') return null;
  if (typeof v === 'number') {
    if (v <= 0) return null;
    if (v < 1) return parseFloat((v * 24).toFixed(4));
    return parseFloat(v.toFixed(4));
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}/.test(s)) {
    const parts = s.split(':');
    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    if (!isNaN(h) && !isNaN(m)) return parseFloat((h + m / 60).toFixed(4));
  }
  const n = parseFloat(s.replace(',', '.'));
  if (!isNaN(n) && n > 0) return n;
  return null;
}

function calcHours(a, b) {
  function toMin(s) {
    if (!s) return null;
    const t = parseTimeValue(s);
    if (!t) return null;
    const [hh, mm] = t.split(':').map(Number);
    return hh * 60 + mm;
  }
  const i = toMin(a);
  const o = toMin(b);
  if (i == null || o == null) return 0;
  return parseFloat((((o - i + 1440) % 1440) / 60).toFixed(4));
}

function parseSalaryValue(v) {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  const s = String(v).replace(/[^\d.\-]/g, '').trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/* ===================== HEADER ROW SCAN ===================== */

function findAttendanceHeaderRow(rows) {
  const nameKeys = ['first name', 'last name', 'employee id', 'emp id', 'employee name', 'full name', 'staff name', 'name', 'اسم', 'الاسم', 'اسم الموظف', 'الموظف'];
  const timeKeys = ['clock in', 'clock out', 'check in', 'check out', 'work time', 'worked hours', 'total hours', 'regular', 'hours', 'duration', 'time', 'دخول', 'خروج', 'ساعات', 'وقت'];
  const dateKeys = ['date', 'work date', 'day', 'التاريخ', 'اليوم'];
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

function findSalaryHeaderRow(rows) {
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    if (!rows[i]) continue;
    const cells = rows[i].map(normalizeHeader);
    const hasSalary = cells.some(
      (c) =>
        c.includes('salary') ||
        c.includes('basic') ||
        c.includes('base') ||
        c.includes('amount') ||
        c.includes('راتب') ||
        c.includes('الراتب') ||
        c.includes('اجر') ||
        c.includes('أجر')
    );
    const hasName = cells.some((c) => c.includes('name') || c.includes('اسم'));
    const hasId = cells.some(
      (c) => c.includes('employee id') || c.includes('emp id') || c === 'id' || c.includes('رقم')
    );
    if (hasSalary && (hasName || hasId)) return i;
  }
  return -1;
}

/* ===================== ATTENDANCE ===================== */

function parseAttendanceFile(buffer, batchId) {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false, cellNF: false });
  const allRecords = [];
  const seenEmployees = new Set();

  for (const sheetName of workbook.SheetNames) {
    const ws = workbook.Sheets[sheetName];
    if (!ws) continue;
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });
    if (!rows.length) continue;

    const headerRow = findAttendanceHeaderRow(rows);

    if (headerRow >= 0) {
      const headers = rows[headerRow].map(normalizeHeader);
      const iFirstName = findHeaderIndex(headers, ['first name', 'firstname', 'fname']);
      const iLastName = findHeaderIndex(headers, ['last name', 'lastname', 'lname']);
      let iName = findHeaderIndex(headers, [
        'employee name',
        'full name',
        'staff name',
        'name',
        'اسم',
        'الاسم',
        'اسم الموظف',
        'الموظف',
      ]);
      const iEmpID = findHeaderIndex(headers, [
        'employee id',
        'emp id',
        'id',
        'رقم الموظف',
        'رقم',
      ]);
      const iWorked = findHeaderIndex(headers, [
        'worked hours',
        'work hours',
        'work time',
        'worked time',
        'duration',
        'hours',
        'ساعات',
        'وقت العمل',
      ]);
      const iTotalH = findHeaderIndex(headers, ['total hours', 'total time']);
      const iRegular = findHeaderIndex(headers, ['regular', 'regular(h)']);
      const iClockIn = findHeaderIndex(headers, [
        'clock in',
        'check in',
        'time in',
        'in time',
        'on duty',
        'دخول',
        'وقت الدخول',
      ]);
      const iClockOut = findHeaderIndex(headers, [
        'clock out',
        'check out',
        'time out',
        'out time',
        'off duty',
        'خروج',
        'وقت الخروج',
      ]);
      const iException = findHeaderIndex(headers, ['exception', 'status', 'الحالة']);
      const iDate = findHeaderIndex(headers, [
        'date',
        'work date',
        'day',
        'التاريخ',
        'اليوم',
      ]);
      if (iName < 0 && iFirstName < 0 && iEmpID < 0) iName = 0;

      const hoursIdx = iWorked >= 0 ? iWorked : iTotalH >= 0 ? iTotalH : iRegular;

      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.every((c) => c == null || c === '')) continue;

        let name = '';
        const empId = iEmpID >= 0 ? normalizeId(row[iEmpID]) : '';
        if (iFirstName >= 0 && row[iFirstName]) {
          name = normalizeName(row[iFirstName]);
          if (iLastName >= 0 && row[iLastName]) name += ' ' + normalizeName(row[iLastName]);
        } else if (iName >= 0 && row[iName]) {
          name = normalizeName(row[iName]);
        } else if (iEmpID >= 0 && row[iEmpID]) {
          name = String(row[iEmpID]).trim();
        }
        if (!name || name.toLowerCase() === 'undefined') continue;

        // Skip explicit Absent rows
        const exceptVal = iException >= 0 ? String(row[iException] || '').toLowerCase().trim() : '';
        if (exceptVal === 'absent' || exceptVal === 'absence' || exceptVal === 'غياب') continue;

        const clockInRaw = iClockIn >= 0 ? row[iClockIn] : null;
        const clockOutRaw = iClockOut >= 0 ? row[iClockOut] : null;
        const clockIn = parseTimeValue(clockInRaw);
        const clockOut = parseTimeValue(clockOutRaw);
        const clockInVal = clockInRaw != null ? String(clockInRaw).trim() : '';
        const hasRealClockIn =
          clockInVal &&
          clockInVal !== '00:00' &&
          clockInVal !== '00:00:00' &&
          clockInVal !== '0:00' &&
          clockInVal !== '0';

        // Compute hours: explicit hours column → clock-in/out → regular column
        let hours = null;
        if (hoursIdx >= 0 && hoursIdx !== iRegular) hours = parseHoursValue(row[hoursIdx]);
        if ((hours == null || hours <= 0) && clockIn && clockOut) {
          hours = calcHours(clockInRaw, clockOutRaw);
        }
        if ((hours == null || hours <= 0) && iRegular >= 0 && hasRealClockIn) {
          hours = parseHoursValue(row[iRegular]);
        }
        if (!hours || hours <= 0) continue;

        const date = iDate >= 0 ? parseDateValue(row[iDate]) : null;
        if (!date) continue;

        // Use employee_id when present, else name as the stable key
        const employee_id = empId || name;
        seenEmployees.add(employee_id);

        allRecords.push({
          employee_id,
          employee_name: name,
          work_date: date,
          clock_in: clockIn,
          clock_out: clockOut,
          hours_worked: parseFloat(hours.toFixed(4)),
          upload_batch: batchId,
        });
      }
    } else {
      // Fallback: no header detected — scan columns by data type
      const sample = rows.slice(0, 50);
      const ncols = Math.max(0, ...sample.map((r) => (r ? r.length : 0)));
      const nameScores = Array(ncols).fill(0);
      const dateScores = Array(ncols).fill(0);
      const hourScores = Array(ncols).fill(0);
      sample.forEach((r) => {
        for (let c = 0; c < ncols; c++) {
          const v = r && r[c] != null ? r[c] : '';
          const s = String(v).trim();
          if (s && /[A-Za-z؀-ۿ]/.test(s) && !/^\d+:\d+/.test(s)) nameScores[c] += 1;
          if (parseDateValue(v)) dateScores[c] += 1;
          const h = parseHoursValue(v);
          if (h && h > 0 && h <= 24) hourScores[c] += 1;
        }
      });
      const nameCol = nameScores.indexOf(Math.max(...nameScores));
      const dateCol = dateScores.indexOf(Math.max(...dateScores));
      const hoursCol = hourScores.indexOf(Math.max(...hourScores));

      rows.forEach((row) => {
        if (!row) return;
        const name = nameCol >= 0 ? normalizeName(row[nameCol]) : '';
        const date = dateCol >= 0 ? parseDateValue(row[dateCol]) : null;
        const hours = hoursCol >= 0 ? parseHoursValue(row[hoursCol]) : null;
        if (!name || !date || !hours || hours <= 0) return;
        seenEmployees.add(name);
        allRecords.push({
          employee_id: name,
          employee_name: name,
          work_date: date,
          clock_in: null,
          clock_out: null,
          hours_worked: parseFloat(hours.toFixed(4)),
          upload_batch: batchId,
        });
      });
    }
  }

  // Attach employee_count metadata to the records array for the upload route
  allRecords.employeeCount = seenEmployees.size;
  return allRecords;
}

/* ===================== SALARY ===================== */

function parseSalaryFile(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rows.length) return [];

  const headerRow = findSalaryHeaderRow(rows);
  const employees = [];
  const seen = new Set();

  if (headerRow >= 0) {
    const headers = rows[headerRow].map(normalizeHeader);
    const iId = findHeaderIndex(headers, [
      'employee id',
      'emp id',
      'id',
      'رقم الموظف',
      'رقم',
      'code',
    ]);
    const iFirstName = findHeaderIndex(headers, ['first name', 'firstname']);
    const iLastName = findHeaderIndex(headers, ['last name', 'lastname']);
    const iName = findHeaderIndex(headers, [
      'employee name',
      'full name',
      'name',
      'اسم',
      'الاسم',
      'اسم الموظف',
      'الموظف',
    ]);
    const iSalary = findHeaderIndex(headers, [
      'basic salary',
      'base salary',
      'salary',
      'basic',
      'amount',
      'الراتب',
      'راتب',
      'اجر',
      'أجر',
    ]);
    const iGuarantee = findHeaderIndex(headers, ['guarantee', 'ضمان', 'كفالة']);

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.every((c) => c == null || c === '')) continue;

      const id = iId >= 0 ? normalizeId(row[iId]) : '';
      let name = '';
      if (iFirstName >= 0 && row[iFirstName]) {
        name = normalizeName(row[iFirstName]);
        if (iLastName >= 0 && row[iLastName]) name += ' ' + normalizeName(row[iLastName]);
      } else if (iName >= 0 && row[iName]) {
        name = normalizeName(row[iName]);
      }
      const salary = iSalary >= 0 ? parseSalaryValue(row[iSalary]) : 0;
      const guarantee = iGuarantee >= 0 && row[iGuarantee]
        ? /yes|y|yas|1|true|نعم/i.test(String(row[iGuarantee]).trim())
        : false;

      if (!name) continue;
      const lower = name.toLowerCase();
      if (lower === 'total' || lower.startsWith('الإجمالي') || lower.startsWith('المجموع')) continue;
      if (salary <= 0) continue;

      const employee_id = id || name;
      if (seen.has(employee_id)) continue;
      seen.add(employee_id);

      employees.push({ employee_id, name, base_salary: salary, social_security: guarantee });
    }
  } else {
    // Fallback: Column A = name, Column B = salary (old PayNest format)
    const sample = rows.slice(0, 30);
    const ncols = Math.max(0, ...sample.map((r) => (r ? r.length : 0)));
    const nameScores = Array(ncols).fill(0);
    const salaryScores = Array(ncols).fill(0);
    sample.forEach((r) => {
      for (let c = 0; c < ncols; c++) {
        const v = r && r[c] != null ? r[c] : '';
        const s = String(v).trim();
        if (s && /[A-Za-z؀-ۿ]/.test(s)) nameScores[c] += 1;
        const n = parseSalaryValue(v);
        if (n > 0) salaryScores[c] += 1;
      }
    });
    let nameCol = nameScores.indexOf(Math.max(...nameScores));
    let salaryCol = salaryScores.indexOf(Math.max(...salaryScores));
    if (nameCol < 0) nameCol = 0;
    if (salaryCol < 0 || salaryCol === nameCol) salaryCol = nameCol === 0 ? 1 : 0;

    rows.forEach((row) => {
      if (!row) return;
      const name = normalizeName(row[nameCol]);
      const salary = parseSalaryValue(row[salaryCol]);
      if (!name || salary <= 0) return;
      const lower = name.toLowerCase();
      if (lower === 'total' || lower.startsWith('الإجمالي') || lower.startsWith('المجموع')) return;
      if (seen.has(name)) return;
      seen.add(name);
      employees.push({
        employee_id: name,
        name,
        base_salary: salary,
        social_security: false,
      });
    });
  }

  return employees;
}

module.exports = { parseAttendanceFile, parseSalaryFile };
