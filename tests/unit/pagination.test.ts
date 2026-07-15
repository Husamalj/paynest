import { describe, expect, it } from "vitest";
import { paginationQuery, parsePagination, withPaginationHeaders } from "@/lib/pagination";

describe("pagination helpers", () => {
  it("stays disabled when page and limit are not explicitly requested", () => {
    const pagination = parsePagination(new URL("https://paynest.test/api/employees"));

    expect(pagination).toMatchObject({ page: 1, limit: 50, skip: 0, enabled: false });
    expect(paginationQuery(pagination)).toEqual({});
  });

  it("clamps limit and calculates skip when pagination is requested", () => {
    const pagination = parsePagination(new URL("https://paynest.test/api/employees?page=3&limit=999"), {
      limit: 100,
      max: 250,
    });

    expect(pagination).toMatchObject({ page: 3, limit: 250, skip: 500, enabled: true });
    expect(paginationQuery(pagination)).toEqual({ skip: 500, take: 250 });
  });

  it("adds pagination headers only for paginated responses", () => {
    const pagination = parsePagination(new URL("https://paynest.test/api/audit-log?page=2&limit=25"));
    const response = withPaginationHeaders([{ id: 1 }], pagination, 80);

    expect(response.headers.get("x-page")).toBe("2");
    expect(response.headers.get("x-limit")).toBe("25");
    expect(response.headers.get("x-total-count")).toBe("80");
  });
});
