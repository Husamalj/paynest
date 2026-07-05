import { normalizeHiddenPages } from "@/lib/pageRegistry";

export function readHiddenPages(source: any): string[] {
  const value = Array.isArray(source?.hiddenPages)
    ? source.hiddenPages
    : Array.isArray(source?.hidden_pages)
      ? source.hidden_pages
      : [];

  return normalizeHiddenPages(value);
}

export function hiddenPageAliases(source: any) {
  const hiddenPages = readHiddenPages(source);
  return {
    hiddenPages,
    hidden_pages: hiddenPages,
  };
}
