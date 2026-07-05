import { describe, expect, it } from "vitest";
import { calcDays, formatCurrency, formatDate } from "@/app/employee-portal/helpers";

describe("employee portal helpers", () => {
  it("formats currency with two decimal places", () => {
    expect(formatCurrency(1234.5)).toBe("1,234.50");
    expect(formatCurrency("bad-value")).toBe("0.00");
  });

  it("formats empty dates as a dash", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("")).toBe("-");
  });

  it("calculates inclusive date ranges", () => {
    expect(calcDays("2026-07-01", "2026-07-01")).toBe(1);
    expect(calcDays("2026-07-01", "2026-07-03")).toBe(3);
    expect(calcDays("", "2026-07-03")).toBe(0);
  });
});
