import { describe, expect, it } from "vitest";
import {
  calculateDailyPayroll,
  calculateHoursPayroll,
  getWorkdaysInMonth,
  hasValidClock,
  isRealClock,
} from "@/lib/payrollCalc";

const settings = {
  req_hours: 8,
  month_days: 26,
  late_tolerance: 0,
  deduction_rate: 1,
  extra_rate: 1.5,
  workdays: "Sun,Mon,Tue,Wed,Thu",
  holidays: [],
};

describe("payroll clock helpers", () => {
  it("treats zero clocks as missing and real times as valid", () => {
    expect(isRealClock("00:00")).toBe(false);
    expect(isRealClock("0")).toBe(false);
    expect(isRealClock("09:00")).toBe(true);
    expect(hasValidClock({ clock_in: "09:00" })).toBe(true);
    expect(hasValidClock({ clock_in: "00:00" })).toBe(false);
  });
});

describe("getWorkdaysInMonth", () => {
  it("returns only configured weekday dates", () => {
    const days = getWorkdaysInMonth(2026, 6, ["Sun", "Mon"]);
    expect(days).toContain("2026-06-01");
    expect(days).toContain("2026-06-07");
    expect(days).not.toContain("2026-06-06");
  });
});

describe("calculateDailyPayroll", () => {
  it("deducts short attendance and applies social security and bonuses", () => {
    const result = calculateDailyPayroll(
      [{ employee_id: "A001", name: "Alpha", base_salary: 2600, social_security: true }],
      {
        A001: {
          "2026-06-01": { clock_in: "09:00", clock_out: "17:00", hours_worked: 8 },
          "2026-06-02": { clock_in: "09:00", clock_out: "16:00", hours_worked: 7 },
        },
      },
      settings,
      { A001: [{ type: "bonus", amount: 100 }] },
      { month: 6, year: 2026 },
      {}
    )[0];

    expect(result.employee_id).toBe("A001");
    expect(result.total_hours).toBe(15);
    expect(result.social_security_deduct).toBe(195);
    expect(result.bonus_total).toBe(100);
    expect(result.status).toBe("Has Deductions");
    expect(result.net_salary).toBeLessThan(2600);
  });

  it("counts approved online work as a full present day", () => {
    const result = calculateDailyPayroll(
      [{ employee_id: "A001", name: "Alpha", base_salary: 2600, social_security: false }],
      {},
      settings,
      {},
      { month: 6, year: 2026 },
      { A001: { "2026-06-01": "online" } }
    )[0];

    const onlineDay = result.daily_breakdown.find((day: any) => day.date === "2026-06-01");
    expect(onlineDay.status).toBe("online");
    expect(onlineDay.hours_worked).toBe(8);
  });

  it("does not deduct fixed employees for missing clock records", () => {
    const result = calculateDailyPayroll(
      [{ employee_id: "A001", name: "Fixed", base_salary: 2600, social_security: false, work_type: "fixed" }],
      {},
      settings,
      {},
      { month: 6, year: 2026 },
      {}
    )[0];

    expect(result.adjustment).toBe(0);
    expect(result.net_salary).toBe(2600);
    expect(result.status).toBe("Full Attendance");
  });

  it("pays daily-wage employees only for attended days", () => {
    const result = calculateDailyPayroll(
      [{ employee_id: "D001", name: "Daily", base_salary: 50, social_security: true, work_type: "daily_wage" }],
      {
        D001: {
          "2026-06-01": { clock_in: "09:00", clock_out: "17:00", hours_worked: 8 },
          "2026-06-02": { clock_in: "00:00", clock_out: "00:00", hours_worked: 0 },
        },
      },
      settings,
      { D001: [{ type: "bonus", amount: 10 }, { type: "deduction", amount: 5 }] },
      { month: 6, year: 2026 },
      {}
    )[0];

    expect(result.base_salary).toBe(50);
    expect(result.social_security_deduct).toBe(0);
    expect(result.net_salary).toBe(55);
  });

  it("treats worked official holidays as overtime", () => {
    const result = calculateDailyPayroll(
      [{ employee_id: "A001", name: "Alpha", base_salary: 2600, social_security: false }],
      { A001: { "2026-06-07": { clock_in: "09:00", clock_out: "13:00", hours_worked: 4 } } },
      { ...settings, holidays: ["2026-06-07"] },
      {},
      { month: 6, year: 2026 },
      {}
    )[0];

    const holiday = result.daily_breakdown.find((day: any) => day.date === "2026-06-07");
    expect(holiday.status).toBe("holiday");
    expect(holiday.adjustment).toBeGreaterThan(0);
  });
});

describe("calculateHoursPayroll", () => {
  it("calculates hourly mode adjustment from monthly required hours", () => {
    const result = calculateHoursPayroll(
      [{ employee_id: "A001", name: "Alpha", base_salary: 1760, social_security: false }],
      { A001: { "2026-06-01": { clock_in: "09:00", clock_out: "17:00", hours_worked: 80 } } },
      { month_days: 176, deduction_rate: 1, extra_rate: 1 },
      {},
      {},
      { month: 6, year: 2026 }
    )[0];

    expect(result.required_hours).toBe(176);
    expect(result.hour_diff).toBe(-96);
    expect(result.adjustment).toBe(-960);
    expect(result.net_salary).toBe(800);
  });
});
