import { NextResponse } from "next/server";

export type Pagination = {
  page: number;
  limit: number;
  skip: number;
  enabled: boolean;
};

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function parsePagination(url: URL, defaults?: { limit?: number; max?: number }): Pagination {
  const explicit = url.searchParams.has("page") || url.searchParams.has("limit");
  const max = defaults?.max ?? MAX_LIMIT;
  const page = toPositiveInt(url.searchParams.get("page"), 1);
  const rawLimit = toPositiveInt(url.searchParams.get("limit"), defaults?.limit ?? DEFAULT_LIMIT);
  const limit = Math.min(rawLimit, max);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    enabled: explicit,
  };
}

export function paginationQuery(pagination: Pagination): Record<string, number> {
  return pagination.enabled
    ? { skip: pagination.skip, take: pagination.limit }
    : {};
}

export function withPaginationHeaders<T>(
  data: T,
  pagination: Pagination,
  total?: number
) {
  const response = NextResponse.json(data);
  if (pagination.enabled) {
    response.headers.set("x-page", String(pagination.page));
    response.headers.set("x-limit", String(pagination.limit));
    if (typeof total === "number") response.headers.set("x-total-count", String(total));
  }
  return response;
}
