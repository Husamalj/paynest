import { prisma } from "@/lib/prisma";
import { normalizeHiddenPages, type HiddenPageKey } from "@/lib/pageRegistry";

type CompanyContext = {
  systemMode: string;
  calcMode: string;
  hiddenPages: HiddenPageKey[];
};

const CACHE_TTL_MS = 30_000;
const cache = new Map<number, { value: CompanyContext; expiresAt: number }>();

export function invalidateCompanyContext(companyId: number) {
  cache.delete(companyId);
}

export async function getCompanyContext(companyId: number): Promise<CompanyContext> {
  const now = Date.now();
  const cached = cache.get(companyId);
  if (cached && cached.expiresAt > now) return cached.value;

  const [settings, company] = await Promise.all([
    prisma.companySettings.findFirst({
      where: { companyId },
      select: { systemMode: true, calcMode: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { hiddenPages: true },
    }),
  ]);

  const value = {
    systemMode: settings?.systemMode ?? "daily",
    calcMode: settings?.calcMode ?? settings?.systemMode ?? "daily",
    hiddenPages: normalizeHiddenPages(company?.hiddenPages),
  };
  cache.set(companyId, { value, expiresAt: now + CACHE_TTL_MS });
  return value;
}

export async function getCompanySystemMode(companyId: number) {
  return (await getCompanyContext(companyId)).systemMode;
}
