"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp } from "lucide-react";
import { AppNav } from "@/components/ui/app-nav";
import {
  ACCOUNTS_SEED,
  CATEGORY_OPTIONS,
  CITY_GROUPS,
  type AccountSeed,
  type BusinessCategory,
} from "@/lib/accounts-seed";
import { applyFlatMarkup, formatCurrency, DEFAULT_PRICING_CONFIG } from "@/lib/pricing";

const SUB_NETWORKS = [
  "northly", "waveroom", "bites", "nightout", "whats_the_plan",
  "must_be", "housing_watch", "got_deals", "extra_assets",
];

export default function AccountsPage() {
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState<string[]>([]);
  const [networkFilter, setNetworkFilter] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory | "">("");

  const filtered = useMemo(() => {
    return ACCOUNTS_SEED.filter((a) => {
      if (search && !a.handle.toLowerCase().includes(search.toLowerCase()) &&
          !a.marketLabel.toLowerCase().includes(search.toLowerCase())) return false;
      if (cityFilter.length) {
        const markets = cityFilter.flatMap((gk) => CITY_GROUPS.find((g) => g.key === gk)?.markets ?? [gk]);
        if (!markets.includes(a.market)) return false;
      }
      if (networkFilter.length && !networkFilter.includes(a.subNetwork)) return false;
      if (categoryFilter && !a.categories.includes(categoryFilter)) return false;
      return true;
    });
  }, [search, cityFilter, networkFilter, categoryFilter]);

  const toggleCity = (key: string) =>
    setCityFilter((f) => f.includes(key) ? f.filter((c) => c !== key) : [...f, key]);

  const toggleNetwork = (key: string) =>
    setNetworkFilter((f) => f.includes(key) ? f.filter((n) => n !== key) : [...f, key]);

  const totalFollowers = filtered.reduce((s, a) => s + a.followers, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppNav page="Accounts Directory" />

      <div className="mx-auto max-w-7xl px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#E8192C]" />
                <span className="text-sm text-muted-foreground">Accounts</span>
              </div>
              <div className="text-2xl font-bold mt-1">{filtered.length}</div>
              <div className="text-xs text-muted-foreground">of {ACCOUNTS_SEED.length} total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">Total Followers</span>
              </div>
              <div className="text-2xl font-bold mt-1">{(totalFollowers / 1000000).toFixed(1)}M</div>
              <div className="text-xs text-muted-foreground">in filtered view</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Markets</span>
              </div>
              <div className="text-2xl font-bold mt-1">
                {new Set(filtered.map((a) => a.market)).size}
              </div>
              <div className="text-xs text-muted-foreground">cities/regions</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Filters sidebar */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search handles..."
                className="pl-9"
              />
            </div>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">City / Market</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {CITY_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    onClick={() => toggleCity(g.key)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      cityFilter.includes(g.key)
                        ? "bg-[#E8192C] text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
                {cityFilter.length > 0 && (
                  <button onClick={() => setCityFilter([])} className="text-xs text-muted-foreground hover:text-foreground mt-1">
                    Clear
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sub-Network</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                {SUB_NETWORKS.map((n) => (
                  <button
                    key={n}
                    onClick={() => toggleNetwork(n)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors capitalize ${
                      networkFilter.includes(n)
                        ? "bg-slate-900 text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {n.replace(/_/g, " ")}
                  </button>
                ))}
                {networkFilter.length > 0 && (
                  <button onClick={() => setNetworkFilter([])} className="text-xs text-muted-foreground hover:text-foreground mt-1">
                    Clear
                  </button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category Fit</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-1">
                <button
                  onClick={() => setCategoryFilter("")}
                  className={`w-full text-left px-2 py-1.5 rounded-lg text-sm ${!categoryFilter ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
                >
                  All categories
                </button>
                {CATEGORY_OPTIONS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setCategoryFilter(c.value)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                      categoryFilter === c.value
                        ? "bg-[#E8192C] text-white"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Accounts table */}
          <Card className="rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Handle</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Network</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Market</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Followers</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">BA Feed Rate</th>
                    <th className="text-right px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Package Rate</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((account) => (
                    <AccountRow key={account.handle} account={account} />
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-muted-foreground">
                        No accounts match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function AccountRow({ account }: { account: AccountSeed }) {
  const packageRate = applyFlatMarkup(account.baseRate, DEFAULT_PRICING_CONFIG);

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-3">
        <span className="font-medium text-[#E8192C]">{account.handle}</span>
      </td>
      <td className="px-4 py-3 capitalize text-slate-600">
        {account.subNetwork.replace(/_/g, " ")}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <span>{account.marketLabel}</span>
          <span className="text-slate-400 text-xs">· {account.region}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-medium">
        {account.followers >= 1000000
          ? `${(account.followers / 1000000).toFixed(1)}M`
          : account.followers >= 1000
          ? `${(account.followers / 1000).toFixed(0)}K`
          : account.followers.toLocaleString()}
      </td>
      <td className="px-4 py-3 text-right text-slate-500">
        {formatCurrency(account.baseRate)}
      </td>
      <td className="px-4 py-3 text-right font-semibold">
        {formatCurrency(packageRate)}
      </td>
      <td className="px-4 py-3">
        <Badge
          variant={account.pricingStatus === "active" ? "default" : "secondary"}
          className={account.pricingStatus === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}
        >
          {account.pricingStatus === "active" ? "Active" : "Contact for Pricing"}
        </Badge>
      </td>
    </tr>
  );
}
