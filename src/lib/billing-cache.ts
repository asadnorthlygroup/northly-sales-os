const KEY = "northly_billing_cache";

export interface BillingCache {
  contactName: string;
  legalName: string;
  email: string;
  street: string;
  city: string;
  province: string;
  postal: string;
}

const EMPTY: BillingCache = {
  contactName: "",
  legalName: "",
  email: "",
  street: "",
  city: "",
  province: "ON",
  postal: "",
};

export function loadBillingCache(): BillingCache {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...(JSON.parse(raw) as Partial<BillingCache>) };
  } catch {
    return EMPTY;
  }
}

export function saveBillingCache(data: Partial<BillingCache>): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadBillingCache();
    localStorage.setItem(KEY, JSON.stringify({ ...current, ...data }));
  } catch {
    /* ignore */
  }
}
