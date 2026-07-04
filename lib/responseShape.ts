export function readHiddenPages(source: any): string[] {
  const value = Array.isArray(source?.hiddenPages)
    ? source.hiddenPages
    : Array.isArray(source?.hidden_pages)
      ? source.hidden_pages
      : [];

  return value.filter((page: unknown): page is string => typeof page === "string");
}

export function hiddenPageAliases(source: any) {
  const hiddenPages = readHiddenPages(source);
  return {
    hiddenPages,
    hidden_pages: hiddenPages,
  };
}

