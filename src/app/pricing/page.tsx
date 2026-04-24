"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { AppNav } from "@/components/ui/app-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Save, RefreshCw, TrendingUp, TrendingDown, Minus, Loader2, CheckCircle,
} from "lucide-react";
import { ACCOUNTS_SEED, type AccountSeed } from "@/lib/accounts-seed";
import {
  computeAccountRates, formatCurrency, DEFAULT_PRICING_CONFIG, type PricingConfig,
} from "@/lib/pricing";

// ─── Sub-network grouping ───────────────────────────────────────────────────

const NETWORKS = [
  { key: "all",           label: "All Accounts" },
  { key: "northly",       label: "Northly" },
  { key: "waveroom",      label: "Waveroom" },
  { key: "bites",         label: "Bites" },
  { key: "nightout",      label: "Nightout" },
  { key: "whats_the_plan",label: "What's The Plan" },
  { key: "must_be",       label: "Must Be" },
  { key: "housing_watch", label: "Housing Watch" },
  { key: "got_deals",     label: "Got Deals" },
  { key: "extra_assets",  label: "Extra Assets" },
] as const;

// ─── Parameter definitions ──────────────────────────────────────────────────

interface ParamDef {
  key: keyof PricingConfig;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  dbKey: string;
}

const PARAMS: ParamDef[] = [
  { key: "cpm",               dbKey: "cpm",                label: "CPM",                description: "Single dial that moves all rates network-wide",    min: 5,    max: 20,   step: 0.5,  format: (v) => `$${v}` },
  { key: "followerExponent",  dbKey: "follower_exponent",  label: "Follower Exponent",  description: "Diminishing returns on follower count (0.3–0.7)",   min: 0.30, max: 0.70, step: 0.01, format: (v) => v.toFixed(3) },
  { key: "scaleConstant",     dbKey: "scale_constant",     label: "Scale Constant (k)", description: "Brand value multiplier for follower baseline",       min: 1.0,  max: 3.0,  step: 0.05, format: (v) => v.toFixed(2) },
  { key: "followersWeight",   dbKey: "followers_weight",   label: "Follower Weight",    description: "Formula blend — impressions weight = 1 − this",     min: 0.50, max: 0.95, step: 0.05, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: "bundleMinMultiplier",dbKey:"bundle_min_multiplier",label:"Bundle Min %",      description: "Absolute minimum as % of BA rate (bundles)",        min: 0.25, max: 0.60, step: 0.05, format: (v) => `${(v * 100).toFixed(0)}%` },
  { key: "ocReelUplift",      dbKey: "oc_reel_uplift",     label: "OC Reel Uplift",     description: "Fixed $ added on top of BA for OC Reel format",     min: 500,  max: 2000, step: 50,   format: (v) => `$${v}` },
  { key: "talkingHeadUplift", dbKey: "talking_head_uplift",label: "Talking Head Uplift",description: "Fixed $ added on top of BA for Talking Head format", min: 200,  max: 800,  step: 50,   format: (v) => `$${v}` },
];

// ─── Helper ─────────────────────────────────────────────────────────────────

function delta(proposed: number, current: number) {
  const diff = proposed - current;
  const pct = current > 0 ? (diff / current) * 100 : 0;
  return { diff, pct };
}

function DeltaBadge({ proposed, current }: { proposed: number; current: number }) {
  const { diff, pct } = delta(proposed, current);
  if (Math.abs(diff) < 1) return <Minus className="h-3 w-3 text-slate-300 mx-auto" />;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

// ─── Param slider row ────────────────────────────────────────────────────────

function ParamControl({
  param, value, onChange,
}: { param: ParamDef; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-slate-800">{param.label}</span>
          <span className="text-xs text-muted-foreground ml-2">{param.description}</span>
        </div>
        <span className="text-sm font-bold text-slate-900 tabular-nums w-16 text-right">
          {param.format(value)}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-1.5 appearance-none bg-slate-200 rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#E8192C] [&::-webkit-slider-thumb]:cursor-pointer accent-[#E8192C]"
        />
        <input
          type="number"
          min={param.min}
          max={param.max}
          step={param.step}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= param.min && v <= param.max) onChange(v);
          }}
          className="w-20 text-sm text-center border rounded-lg px-2 py-1 tabular-nums"
        />
      </div>
    </div>
  );
}

// ─── Account row ─────────────────────────────────────────────────────────────

function AccountRow({ account, draftConfig }: { account: AccountSeed; draftConfig: PricingConfig }) {
  const proposed = computeAccountRates(account.followers, account.avgImpressions, draftConfig);
  const current = {
    baFeed: account.baseRate,
    story: account.storyRate,
    gaFeed: account.gaRate,
    ocReel: account.ocRate,
    talkingHead: account.talkingHeadRate,
  };

  return (
    <tr className="hover:bg-slate-50 transition-colors text-sm">
      <td className="px-3 py-2.5">
        <div className="font-medium text-[#E8192C]">{account.handle}</div>
        <div className="text-xs text-muted-foreground capitalize">{account.subNetwork.replace(/_/g, " ")} · {account.marketLabel}</div>
      </td>
      <td className="px-3 py-2.5 text-right text-slate-500 tabular-nums">
        {account.followers >= 1_000_000
          ? `${(account.followers / 1_000_000).toFixed(1)}M`
          : `${(account.followers / 1000).toFixed(0)}K`}
      </td>
      {/* BA Feed */}
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(current.baFeed)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(proposed.baFeed)}</td>
      <td className="px-3 py-2.5 text-center"><DeltaBadge proposed={proposed.baFeed} current={current.baFeed} /></td>
      {/* Story */}
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(current.story)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(proposed.story)}</td>
      {/* GA */}
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(current.gaFeed)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(proposed.gaFeed)}</td>
      {/* OC Reel */}
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(current.ocReel)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(proposed.ocReel)}</td>
      {/* Talking Head */}
      <td className="px-3 py-2.5 text-right tabular-nums text-slate-500">{formatCurrency(current.talkingHead)}</td>
      <td className="px-3 py-2.5 text-right tabular-nums font-semibold">{formatCurrency(proposed.talkingHead)}</td>
    </tr>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const [liveConfig, setLiveConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [draftConfig, setDraftConfig] = useState<PricingConfig>(DEFAULT_PRICING_CONFIG);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [networkTab, setNetworkTab] = useState<string>("all");

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((d: { config: Record<string, number> }) => {
        if (!d.config) return;
        const c = d.config;
        const loaded: PricingConfig = {
          cpm:                c.cpm                 ?? DEFAULT_PRICING_CONFIG.cpm,
          impressionsWeight:  c.impressions_weight  ?? DEFAULT_PRICING_CONFIG.impressionsWeight,
          followersWeight:    c.followers_weight    ?? DEFAULT_PRICING_CONFIG.followersWeight,
          scaleConstant:      c.scale_constant      ?? DEFAULT_PRICING_CONFIG.scaleConstant,
          followerExponent:   c.follower_exponent   ?? DEFAULT_PRICING_CONFIG.followerExponent,
          bundleMinMultiplier:c.bundle_min_multiplier ?? DEFAULT_PRICING_CONFIG.bundleMinMultiplier,
          ocReelUplift:       c.oc_reel_uplift      ?? DEFAULT_PRICING_CONFIG.ocReelUplift,
          ocReelBundleUplift: c.oc_reel_bundle_uplift ?? DEFAULT_PRICING_CONFIG.ocReelBundleUplift,
          talkingHeadUplift:  c.talking_head_uplift ?? DEFAULT_PRICING_CONFIG.talkingHeadUplift,
          flatMarkup:         c.flat_markup         ?? DEFAULT_PRICING_CONFIG.flatMarkup,
          percentageMarkup:   c.percentage_markup   ?? DEFAULT_PRICING_CONFIG.percentageMarkup,
        };
        setLiveConfig(loaded);
        setDraftConfig(loaded);
      })
      .finally(() => setLoadingConfig(false));
  }, []);

  const setParam = useCallback((key: keyof PricingConfig, value: number) => {
    setDraftConfig((prev) => {
      const next = { ...prev, [key]: value };
      // Keep impressions + followers weights summing to 1
      if (key === "followersWeight") next.impressionsWeight = Math.round((1 - value) * 100) / 100;
      if (key === "impressionsWeight") next.followersWeight = Math.round((1 - value) * 100) / 100;
      return next;
    });
  }, []);

  const resetToLive = useCallback(() => setDraftConfig(liveConfig), [liveConfig]);

  const pushToSalesOS = useCallback(async () => {
    setSaving(true);
    const payload: Record<string, number> = {};
    for (const p of PARAMS) payload[p.dbKey] = draftConfig[p.key] as number;
    // Also persist implied impressions_weight
    payload["impressions_weight"] = draftConfig.impressionsWeight;

    await fetch("/api/pricing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setLiveConfig(draftConfig);
    setSavedAt(new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" }));
    setSaving(false);
  }, [draftConfig]);

  const isDirty = PARAMS.some((p) => Math.abs((draftConfig[p.key] as number) - (liveConfig[p.key] as number)) > 0.0001);

  const visibleAccounts = useMemo(() => {
    if (networkTab === "all") return ACCOUNTS_SEED.filter((a) => a.pricingStatus === "active");
    return ACCOUNTS_SEED.filter((a) => a.subNetwork === networkTab && a.pricingStatus === "active");
  }, [networkTab]);

  // Network-level summary
  const summary = useMemo(() => {
    const active = ACCOUNTS_SEED.filter((a) => a.pricingStatus === "active");
    const currentTotal = active.reduce((s, a) => s + a.baseRate, 0);
    const proposedTotal = active.reduce((s, a) => s + computeAccountRates(a.followers, a.avgImpressions, draftConfig).baFeed, 0);
    return { currentTotal, proposedTotal, count: active.length };
  }, [draftConfig]);

  return (
    <main className="min-h-screen bg-slate-50">
      <AppNav page="Pricing Lab" />

      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">

        {/* Summary bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardContent className="pt-5 pb-4">
              <div className="text-3xl font-bold">{summary.count}</div>
              <div className="text-sm font-medium mt-1">Active Accounts</div>
              <div className="text-xs text-muted-foreground">with active pricing</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold">{formatCurrency(summary.currentTotal)}</div>
              <div className="text-sm font-medium mt-1">Current BA Sum</div>
              <div className="text-xs text-muted-foreground">seed / rate sheet values</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-5 pb-4">
              <div className={`text-2xl font-bold ${summary.proposedTotal > summary.currentTotal ? "text-green-600" : summary.proposedTotal < summary.currentTotal ? "text-red-500" : ""}`}>
                {formatCurrency(summary.proposedTotal)}
              </div>
              <div className="text-sm font-medium mt-1">Formula BA Sum</div>
              <div className="text-xs text-muted-foreground">at current slider settings</div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl">
            <CardContent className="pt-5 pb-4">
              <div className={`text-2xl font-bold ${summary.proposedTotal > summary.currentTotal ? "text-green-600" : "text-red-500"}`}>
                {summary.currentTotal > 0
                  ? `${((summary.proposedTotal - summary.currentTotal) / summary.currentTotal * 100).toFixed(1)}%`
                  : "—"}
              </div>
              <div className="text-sm font-medium mt-1">Network Δ</div>
              <div className="text-xs text-muted-foreground">vs current rate sheet</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6 items-start">

          {/* ── Parameters panel ── */}
          <div className="space-y-4">
            <Card className="rounded-2xl">
              <CardContent className="pt-5 pb-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-base">Formula Parameters</h2>
                  {isDirty && (
                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-700">Unsaved changes</Badge>
                  )}
                </div>

                {loadingConfig ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
                  </div>
                ) : (
                  <div className="space-y-5">
                    {PARAMS.map((p) => (
                      <ParamControl
                        key={p.key}
                        param={p}
                        value={draftConfig[p.key] as number}
                        onChange={(v) => setParam(p.key, v)}
                      />
                    ))}
                  </div>
                )}

                <div className="pt-2 space-y-2 border-t">
                  <div className="text-xs text-muted-foreground">
                    Changes are previewed live in the table. Push to apply across the entire Sales OS.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetToLive}
                      disabled={!isDirty || saving}
                      className="flex-1"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={pushToSalesOS}
                      disabled={!isDirty || saving}
                      className="flex-1 bg-[#E8192C] hover:bg-[#c0141f]"
                    >
                      {saving ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Push Live
                    </Button>
                  </div>
                  {savedAt && !isDirty && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" /> Pushed at {savedAt} — all proposals now use these rates
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Formula reference */}
            <Card className="rounded-2xl bg-slate-900 text-white">
              <CardContent className="pt-4 pb-4">
                <div className="text-xs font-mono text-slate-300 space-y-1">
                  <div className="text-slate-400 text-xs mb-2 font-sans font-medium">BA Feed Formula</div>
                  <div>EXP(</div>
                  <div className="pl-3 text-green-400">{(draftConfig.impressionsWeight * 100).toFixed(0)}% × LN( impressions/1000 × CPM )</div>
                  <div className="pl-3 text-blue-400">+ {(draftConfig.followersWeight * 100).toFixed(0)}% × LN( {draftConfig.scaleConstant.toFixed(2)} × followers^{draftConfig.followerExponent.toFixed(3)} )</div>
                  <div>)</div>
                  <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400 space-y-0.5">
                    <div>Story = BA × 50%</div>
                    <div>GA = BA × 120%</div>
                    <div>OC Reel = BA + ${draftConfig.ocReelUplift.toFixed(0)}</div>
                    <div>Talking Head = BA + ${draftConfig.talkingHeadUplift.toFixed(0)}</div>
                    <div>Bundle Min = BA × {(draftConfig.bundleMinMultiplier * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Rate table ── */}
          <div className="space-y-4">
            {/* Network tabs */}
            <div className="flex flex-wrap gap-2">
              {NETWORKS.map((n) => {
                const count = n.key === "all"
                  ? ACCOUNTS_SEED.filter((a) => a.pricingStatus === "active").length
                  : ACCOUNTS_SEED.filter((a) => a.subNetwork === n.key && a.pricingStatus === "active").length;
                if (count === 0 && n.key !== "all") return null;
                return (
                  <button
                    key={n.key}
                    onClick={() => setNetworkTab(n.key)}
                    className={`px-3 py-1.5 rounded-xl border text-sm transition-all ${
                      networkTab === n.key
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white hover:bg-slate-50 border-slate-200"
                    }`}
                  >
                    {n.label} {count > 0 ? `(${count})` : ""}
                  </button>
                );
              })}
            </div>

            <Card className="rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-3 py-3 text-left font-medium text-slate-600 whitespace-nowrap">Account</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-600 whitespace-nowrap">Followers</th>
                      {/* BA */}
                      <th className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap text-xs">BA Current</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">BA Formula</th>
                      <th className="px-3 py-3 text-center font-medium text-slate-600 whitespace-nowrap">Δ</th>
                      {/* Story */}
                      <th className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap text-xs">Story Cur.</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">Story New</th>
                      {/* GA */}
                      <th className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap text-xs">GA Cur.</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">GA New</th>
                      {/* OC */}
                      <th className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap text-xs">OC Cur.</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">OC New</th>
                      {/* TH */}
                      <th className="px-3 py-3 text-right font-medium text-slate-500 whitespace-nowrap text-xs">TH Cur.</th>
                      <th className="px-3 py-3 text-right font-medium text-slate-800 whitespace-nowrap">TH New</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {visibleAccounts.map((account) => (
                      <AccountRow key={account.handle} account={account} draftConfig={draftConfig} />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
