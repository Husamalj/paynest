import { describe, expect, it } from "vitest";
import { buildLeaveMap } from "@/lib/payrollCalc";

describe("buildLeaveMap", () => {
  it("marks annual leave as paid until the configured balance is exhausted", () => {
    const map = buildLeaveMap(
      [
        { employee_id: "A001", leave_type: "annual", start_date: "2026-06-01", end_date: "2026-06-03" },
      ],
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      { A001: { annual_total: 2, sick_total: 14 } }
    );

    expect(map.A001["2026-06-01"]).toBe("paid");
    expect(map.A001["2026-06-02"]).toBe("paid");
    expect(map.A001["2026-06-03"]).toBe("unpaid");
  });

  it("lets unpaid leave override paid leave on the same date", () => {
    const map = buildLeaveMap(
      [
        { employee_id: "A001", leave_type: "unpaid", start_date: "2026-06-02", end_date: "2026-06-02" },
        { employee_id: "A001", leave_type: "annual", start_date: "2026-06-02", end_date: "2026-06-02" },
      ],
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      { A001: { annual_total: 14, sick_total: 14 } }
    );

    expect(map.A001["2026-06-02"]).toBe("unpaid");
  });

  it("counts balance used before the current period", () => {
    const map = buildLeaveMap(
      [
        { employee_id: "A001", leave_type: "annual", start_date: "2026-05-30", end_date: "2026-06-02" },
      ],
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      { A001: { annual_total: 2, sick_total: 14 } }
    );

    expect(map.A001["2026-06-01"]).toBe("unpaid");
    expect(map.A001["2026-06-02"]).toBe("unpaid");
  });

  it("marks approved online days distinctly from paid leave", () => {
    const map = buildLeaveMap(
      [
        { employee_id: "A001", leave_type: "online", start_date: "2026-06-04", end_date: "2026-06-04" },
      ],
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-06-30T00:00:00.000Z"),
      {}
    );

    expect(map.A001["2026-06-04"]).toBe("online");
  });
});
