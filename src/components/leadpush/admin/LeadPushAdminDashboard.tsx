import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Copy, AlertTriangle,
  Gauge, Activity, Clock, Search, TrendingUp, Trophy, Flame, Zap,
  Target, Sparkles, Ban, ChevronRight, CalendarRange,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface University {
  id: string;
  name: string;
  daily_lead_limit?: number | null;
  daily_pushed_count?: number;
  daily_count_reset_at?: string;
  status?: "live" | "disabled";
}

interface DailyStat {
  university_id: string;
  stat_date: string;
  source_label: string;
  pushed: number;
  success: number;
  failed: number;
  duplicate: number;
  other_error: number;
  dll_blocked: number;
}

interface CumStat {
  university_id: string;
  source_label: string;
  total_pushed: number;
  total_success: number;
  total_failed: number;
  total_duplicate: number;
  total_other_error: number;
  total_dll_blocked: number;
  first_pushed_at: string | null;
  last_pushed_at: string | null;
}

const todayStr = () => new Date().toISOString().slice(0, 10);

type Bucket = { pushed: number; success: number; failed: number; duplicate: number; other_error: number; dll_blocked: number };
const emptyBucket = (): Bucket => ({ pushed: 0, success: 0, failed: 0, duplicate: 0, other_error: 0, dll_blocked: 0 });

function aggregate(stats: DailyStat[]): Bucket {
  const acc = emptyBucket();
  for (const s of stats) {
    acc.pushed += s.pushed; acc.success += s.success; acc.failed += s.failed;
    acc.duplicate += s.duplicate; acc.other_error += s.other_error; acc.dll_blocked += s.dll_blocked;
  }
  return acc;
}

function tileStatus(uni: University, today: Bucket) {
  if (today.pushed === 0 && today.dll_blocked === 0)
    return { tone: "idle", label: "Idle", dot: "bg-muted-foreground/40", ring: "ring-border" };
  if (uni.daily_lead_limit && (uni.daily_pushed_count || 0) >= uni.daily_lead_limit)
    return { tone: "cap", label: "DLL Hit", dot: "bg-amber-500", ring: "ring-amber-500/50" };
  const errPct = today.pushed > 0 ? (today.failed + today.other_error) / today.pushed : 0;
  if (errPct >= 0.5) return { tone: "bad", label: "Errors", dot: "bg-destructive", ring: "ring-destructive/50" };
  if (errPct >= 0.2) return { tone: "warn", label: "Warning", dot: "bg-amber-500", ring: "ring-amber-500/40" };
  return { tone: "good", label: "Healthy", dot: "bg-emerald-500", ring: "ring-emerald-500/50" };
}

const CACHE_KEY = "lpAdminDashboardCache.v2";

type CacheShape = {
  universities: University[];
  daily: DailyStat[];
  cumulative: CumStat[];
  fetchedAt: number;
};

function readCache(): CacheShape | null {
  try { const raw = localStorage.getItem(CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function writeCache(c: CacheShape) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {} }

type RangeKey = "today" | "yesterday" | "7d" | "30d" | "all" | "custom";

const RANGE_LABEL: Record<RangeKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
  custom: "Custom",
};

function rangeToDates(r: RangeKey, customFrom?: string, customTo?: string): { from: string | null; to: string | null } {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  if (r === "today") return { from: fmt(today), to: fmt(today) };
  if (r === "yesterday") { const y = new Date(today); y.setDate(y.getDate() - 1); return { from: fmt(y), to: fmt(y) }; }
  if (r === "7d") { const s = new Date(today); s.setDate(s.getDate() - 6); return { from: fmt(s), to: fmt(today) }; }
  if (r === "30d") { const s = new Date(today); s.setDate(s.getDate() - 29); return { from: fmt(s), to: fmt(today) }; }
  if (r === "custom") return { from: customFrom || fmt(today), to: customTo || fmt(today) };
  return { from: null, to: null }; // all-time
}

export default function LeadPushAdminDashboard() {
  const navigate = useNavigate();
  const cached = useMemo(readCache, []);
  const [universities, setUniversities] = useState<University[]>(cached?.universities || []);
  const [daily, setDaily] = useState<DailyStat[]>(cached?.daily || []);
  const [cumulative, setCumulative] = useState<CumStat[]>(cached?.cumulative || []);
  const [loading, setLoading] = useState(!cached);
  const [fetchedAt, setFetchedAt] = useState<number | null>(cached?.fetchedAt || null);
  const [activeTab, setActiveTab] = useState<"range" | "all-time" | "sources">("range");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "healthy" | "warn" | "bad" | "idle" | "cap">("all");
  const [range, setRange] = useState<RangeKey>("7d");
  const [customFrom, setCustomFrom] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [customTo, setCustomTo] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [detailUni, setDetailUni] = useState<University | null>(null);
  const [detailRows, setDetailRows] = useState<DailyStat[]>([]);
  const [detailCum, setDetailCum] = useState<CumStat[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (uni: University) => {
    setDetailUni(uni);
    setDetailRows([]);
    setDetailCum([]);
    setDetailLoading(true);
    const [d, c] = await Promise.all([
      supabase.from("lead_push_daily_stats").select("*").eq("university_id", uni.id).order("stat_date", { ascending: false }),
      supabase.from("lead_push_cumulative_stats").select("*").eq("university_id", uni.id),
    ]);
    setDetailRows((d.data as DailyStat[]) || []);
    setDetailCum((c.data as CumStat[]) || []);
    setDetailLoading(false);
  };

  const load = async (rk: RangeKey = range, cf = customFrom, ct = customTo) => {
    setLoading(true);
    const { from, to } = rangeToDates(rk, cf, ct);
    let dailyQ = supabase.from("lead_push_daily_stats").select("*");
    if (from) dailyQ = dailyQ.gte("stat_date", from);
    if (to) dailyQ = dailyQ.lte("stat_date", to);
    const [u, d, c] = await Promise.all([
      supabase.from("universities").select("id, name, daily_lead_limit, daily_pushed_count, daily_count_reset_at, status").order("name"),
      dailyQ,
      supabase.from("lead_push_cumulative_stats").select("*"),
    ]);
    const nextU = (u.data as University[]) || [];
    const nextD = (d.data as DailyStat[]) || [];
    const nextC = (c.data as CumStat[]) || [];
    const stamp = Date.now();
    setUniversities(nextU); setDaily(nextD); setCumulative(nextC); setFetchedAt(stamp);
    writeCache({ universities: nextU, daily: nextD, cumulative: nextC, fetchedAt: stamp });
    setLoading(false);
  };

  useEffect(() => { if (!cached) load(); }, []);

  const onRangeChange = (rk: RangeKey) => {
    setRange(rk);
    if (rk !== "custom") load(rk);
  };
  const onApplyCustom = () => { setRange("custom"); load("custom", customFrom, customTo); };


  const totals = useMemo(() => aggregate(daily), [daily]);
  const successRate = totals.pushed > 0 ? Math.round((totals.success / totals.pushed) * 100) : 0;
  const errorRate = totals.pushed > 0 ? Math.round(((totals.failed + totals.other_error) / totals.pushed) * 100) : 0;
  const dupRate = totals.pushed > 0 ? Math.round((totals.duplicate / totals.pushed) * 100) : 0;

  // O(N+M) bucketed aggregation
  const perUniToday = useMemo(() => {
    const map = new Map<string, Bucket>();
    universities.forEach((u) => map.set(u.id, emptyBucket()));
    for (const s of daily) {
      const acc = map.get(s.university_id); if (!acc) continue;
      acc.pushed += s.pushed; acc.success += s.success; acc.failed += s.failed;
      acc.duplicate += s.duplicate; acc.other_error += s.other_error; acc.dll_blocked += s.dll_blocked;
    }
    return map;
  }, [universities, daily]);

  const perUniAllTime = useMemo(() => {
    const map = new Map<string, Bucket & { last: string | null }>();
    universities.forEach((u) => map.set(u.id, { ...emptyBucket(), last: null }));
    for (const r of cumulative) {
      const acc = map.get(r.university_id); if (!acc) continue;
      acc.pushed += +r.total_pushed; acc.success += +r.total_success; acc.failed += +r.total_failed;
      acc.duplicate += +r.total_duplicate; acc.other_error += +r.total_other_error; acc.dll_blocked += +r.total_dll_blocked;
      if (r.last_pushed_at && (!acc.last || r.last_pushed_at > acc.last)) acc.last = r.last_pushed_at;
    }
    return map;
  }, [universities, cumulative]);

  // Filter + status classify
  const filteredUnis = useMemo(() => {
    const q = search.toLowerCase();
    return universities.filter((u) => u.name.toLowerCase().includes(q));
  }, [universities, search]);

  const liveUnis = useMemo(() => filteredUnis.filter((u) => u.status !== "disabled"), [filteredUnis]);
  const disabledUnis = useMemo(() => filteredUnis.filter((u) => u.status === "disabled"), [filteredUnis]);

  const liveWithStatus = useMemo(() => {
    return liveUnis.map((u) => {
      const t = perUniToday.get(u.id) || emptyBucket();
      const st = tileStatus(u, t);
      return { uni: u, today: t, st };
    });
  }, [liveUnis, perUniToday]);

  const visibleUnis = useMemo(() => {
    if (statusFilter === "all") return liveWithStatus;
    return liveWithStatus.filter((x) => x.st.tone === statusFilter);
  }, [liveWithStatus, statusFilter]);

  // Top performers (today, by success count)
  const leaderboard = useMemo(() => {
    return [...liveWithStatus]
      .filter((x) => x.today.pushed > 0)
      .sort((a, b) => b.today.success - a.today.success)
      .slice(0, 5);
  }, [liveWithStatus]);

  // Status counts for filter chips
  const statusCounts = useMemo(() => {
    const c = { all: liveWithStatus.length, healthy: 0, warn: 0, bad: 0, idle: 0, cap: 0 } as Record<string, number>;
    liveWithStatus.forEach((x) => { c[x.st.tone] = (c[x.st.tone] || 0) + 1; });
    return c;
  }, [liveWithStatus]);

  // Sources view
  const sourceRows = useMemo(() => {
    const groups = new Map<string, { source: string; pushed: number; success: number; failed: number; duplicate: number; last: string | null; universities: Set<string> }>();
    cumulative.forEach((c) => {
      const src = c.source_label || "(no source)";
      const g = groups.get(src) || { source: src, pushed: 0, success: 0, failed: 0, duplicate: 0, last: null, universities: new Set() };
      g.pushed += +c.total_pushed; g.success += +c.total_success;
      g.failed += +c.total_failed + +c.total_other_error; g.duplicate += +c.total_duplicate;
      g.universities.add(c.university_id);
      if (c.last_pushed_at && (!g.last || c.last_pushed_at > g.last)) g.last = c.last_pushed_at;
      groups.set(src, g);
    });
    return Array.from(groups.values())
      .filter((g) => g.source.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (b.last || "").localeCompare(a.last || ""));
  }, [cumulative, search]);

  const liveAll = universities.filter((u) => u.status !== "disabled");
  const done = liveAll.filter((u) => {
    const t = perUniToday.get(u.id); if (!t) return false;
    return t.pushed > 0 || t.dll_blocked > 0;
  }).length;
  const totalLive = liveAll.length;
  const completionPct = totalLive > 0 ? Math.round((done / totalLive) * 100) : 0;
  const allDone = totalLive > 0 && done === totalLive;
  const noneDone = done === 0 && totalLive > 0;

  const heroEmoji = allDone ? "🎉" : completionPct >= 60 ? "😊" : completionPct >= 30 ? "🙂" : "✨";
  const heroMsg = allDone
    ? "All universities pushed today - amazing work!"
    : noneDone ? "Nothing pushed yet - let's get started!"
    : completionPct >= 60 ? "Great progress - almost there!"
    : "Good start - more to go!";

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/lead-push")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Lead Push Command Center
              </h1>
              <p className="text-sm text-muted-foreground">Snapshot view - refresh to pull the latest from the database.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fetchedAt && (
              <span className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Updated {new Date(fetchedAt).toLocaleTimeString()}
              </span>
            )}
            <Button onClick={() => load()} variant="default" size="sm" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {/* Hero completion + leaderboard */}
        <div className="grid gap-4 lg:grid-cols-3 mb-6">
          {/* Big completion card */}
          <Card className="lg:col-span-2 overflow-hidden border-2 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5 pointer-events-none" />
            <CardContent className="p-6 relative">
              <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                <div className="flex items-center gap-4">
                  <div className="text-5xl" aria-hidden>{heroEmoji}</div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{RANGE_LABEL[range]} Coverage</div>
                    <div className="text-xl font-bold">{heroMsg}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <span className="font-semibold text-foreground">{done}</span> of <span className="font-semibold text-foreground">{totalLive}</span> universities have pushed leads
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-extrabold tabular-nums bg-gradient-to-r from-emerald-500 to-green-400 bg-clip-text text-transparent">{completionPct}%</div>
                  <div className="text-xs text-muted-foreground">complete</div>
                </div>
              </div>

              <div className="relative h-6 rounded-full bg-destructive/10 overflow-hidden border border-border shadow-inner">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 via-emerald-500 to-green-400 transition-all duration-700 shadow-lg shadow-emerald-500/30"
                  style={{ width: `${completionPct}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-3 text-base pointer-events-none select-none">
                  <span aria-hidden className="drop-shadow">{completionPct > 8 ? "✅" : ""}</span>
                  <span aria-hidden className="drop-shadow">{completionPct < 92 ? "⏳" : ""}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs mt-2">
                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Done {done}
                </span>
                <span className="flex items-center gap-1 text-destructive font-medium">
                  <Target className="h-3 w-3" /> Pending {totalLive - done}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                Top Performers · {RANGE_LABEL[range]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {leaderboard.length === 0 && (
                <div className="text-xs text-muted-foreground italic py-3 text-center">No pushes yet today.</div>
              )}
              {leaderboard.map((x, i) => {
                const rank = i + 1;
                const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
                const sr = x.today.pushed > 0 ? Math.round((x.today.success / x.today.pushed) * 100) : 0;
                return (
                  <div key={x.uni.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                    <span className="text-base w-7 text-center shrink-0">{medal}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{x.uni.name}</div>
                      <div className="text-[10px] text-muted-foreground">{x.today.success} success · {sr}% rate</div>
                    </div>
                    <div className="text-sm font-bold tabular-nums text-emerald-600">{x.today.pushed}</div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* KPI strip with success rate gauge */}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Pushed · {RANGE_LABEL[range]}</span>
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <div className="text-3xl font-extrabold tabular-nums">{totals.pushed.toLocaleString()}</div>
              <div className="text-[11px] text-muted-foreground mt-1">across {liveAll.length} live universities</div>
            </CardContent>
          </Card>

          <Card className="border-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Success Rate</span>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-emerald-600">{successRate}%</div>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all" style={{ width: `${successRate}%` }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{totals.success.toLocaleString()} successful pushes</div>
            </CardContent>
          </Card>

          <Card className="border-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-destructive/10 blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Error Rate</span>
                <Flame className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-destructive">{errorRate}%</div>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-destructive to-red-500 transition-all" style={{ width: `${errorRate}%` }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{(totals.failed + totals.other_error).toLocaleString()} failed / errored</div>
            </CardContent>
          </Card>

          <Card className="border-2 relative overflow-hidden">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl" />
            <CardContent className="p-4 relative">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Duplicates</span>
                <Copy className="h-4 w-4 text-amber-600" />
              </div>
              <div className="text-3xl font-extrabold tabular-nums text-amber-600">{dupRate}%</div>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all" style={{ width: `${dupRate}%` }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{totals.duplicate.toLocaleString()} duplicate · {totals.dll_blocked} DLL blocked</div>
            </CardContent>
          </Card>
        </div>

        {/* Time range selector (2026-style segmented control + custom date range) */}
        <Card className="mb-4 border-2">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
                <CalendarRange className="h-3.5 w-3.5" /> Range
              </div>
              <div className="inline-flex flex-wrap rounded-lg border bg-muted/40 p-1 gap-0.5">
                {(["today", "yesterday", "7d", "30d", "all", "custom"] as RangeKey[]).map((rk) => (
                  <button
                    key={rk}
                    onClick={() => onRangeChange(rk)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                      range === rk
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-background"
                    )}
                  >
                    {RANGE_LABEL[rk]}
                  </button>
                ))}
              </div>
              {range === "custom" && (
                <div className="flex items-center gap-1.5 ml-1">
                  <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="h-8 w-[140px] text-xs" />
                  <span className="text-xs text-muted-foreground">→</span>
                  <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="h-8 w-[140px] text-xs" />
                  <Button size="sm" className="h-8" onClick={onApplyCustom} disabled={loading}>Apply</Button>
                </div>
              )}
              <div className="ml-auto text-[11px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{RANGE_LABEL[range]}</span>
                {range === "custom" && <> · {customFrom} → {customTo}</>} · cumulative totals always shown in All-time tab
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs + Search */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
            {(["range", "all-time", "sources"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
                  activeTab === t
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {t === "range" ? `${RANGE_LABEL[range]} by University` : t === "all-time" ? "All-time by University" : "Upload Sources"}
              </button>
            ))}
          </div>

          <div className="relative ml-auto w-64 max-w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search universities…" className="pl-8 h-9" />
          </div>
        </div>

        {/* Status filter chips */}
        {activeTab !== "sources" && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {([
              { k: "all", label: "All", color: "bg-foreground/10 text-foreground" },
              { k: "healthy", label: "Healthy", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
              { k: "warn", label: "Warning", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
              { k: "bad", label: "Errors", color: "bg-destructive/15 text-destructive" },
              { k: "cap", label: "DLL Hit", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
              { k: "idle", label: "Idle", color: "bg-muted text-muted-foreground" },
            ] as const).map((f) => (
              <button
                key={f.k}
                onClick={() => setStatusFilter(f.k)}
                className={cn(
                  "text-xs font-semibold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5",
                  statusFilter === f.k ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/40",
                  f.color
                )}
              >
                {f.label}
                <span className="bg-background/60 px-1.5 rounded-full tabular-nums">{statusCounts[f.k] || 0}</span>
              </button>
            ))}
          </div>
        )}

        {activeTab !== "sources" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleUnis.map(({ uni, today, st }) => {
                const all = perUniAllTime.get(uni.id) || { ...emptyBucket(), last: null };
                const view = activeTab === "range" ? today : all;
                const dllPct = uni.daily_lead_limit ? Math.min(100, Math.round(((uni.daily_pushed_count || 0) / uni.daily_lead_limit) * 100)) : 0;
                const successPct = view.pushed > 0 ? Math.round((view.success / view.pushed) * 100) : 0;
                const errPct = view.pushed > 0 ? ((view.failed + view.other_error) / view.pushed) * 100 : 0;
                const dPct = view.pushed > 0 ? (view.duplicate / view.pushed) * 100 : 0;
                const sPct = view.pushed > 0 ? (view.success / view.pushed) * 100 : 0;

                return (
                  <Card
                    key={uni.id}
                    onClick={() => openDetail(uni)}
                    className={cn(
                      "border-2 hover:shadow-lg transition-all hover:-translate-y-0.5 group relative overflow-hidden cursor-pointer",
                      st.tone === "good" && "border-emerald-500/30",
                      st.tone === "warn" && "border-amber-500/30",
                      st.tone === "bad" && "border-destructive/30",
                      st.tone === "cap" && "border-amber-500/30",
                      st.tone === "idle" && "border-border",
                    )}
                  >
                    {/* Tone accent stripe */}
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      st.tone === "good" && "bg-gradient-to-b from-emerald-500 to-green-400",
                      st.tone === "warn" && "bg-gradient-to-b from-amber-500 to-yellow-400",
                      st.tone === "bad" && "bg-gradient-to-b from-destructive to-red-500",
                      st.tone === "cap" && "bg-gradient-to-b from-amber-500 to-orange-400",
                      st.tone === "idle" && "bg-muted-foreground/20",
                    )} />
                    <CardHeader className="pb-2 pl-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={cn("relative flex h-2 w-2 shrink-0")}>
                            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", st.dot)} />
                            <span className={cn("relative inline-flex rounded-full h-2 w-2", st.dot)} />
                          </span>
                          <CardTitle className="text-sm font-semibold truncate">{uni.name}</CardTitle>
                        </div>
                        <span className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                          st.tone === "good" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          st.tone === "warn" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          st.tone === "bad" && "bg-destructive/15 text-destructive",
                          st.tone === "cap" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          st.tone === "idle" && "bg-muted text-muted-foreground",
                        )}>
                          {st.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0 pl-4">
                      {/* Big number */}
                      <div className="flex items-baseline justify-between">
                        <div>
                          <div className="text-3xl font-extrabold tabular-nums leading-none">{view.pushed.toLocaleString()}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">Pushed</div>
                        </div>
                        {view.pushed > 0 && (
                          <div className="text-right">
                            <div className={cn(
                              "text-xl font-bold tabular-nums",
                              successPct >= 80 ? "text-emerald-600" : successPct >= 50 ? "text-amber-600" : "text-destructive"
                            )}>{successPct}%</div>
                            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Success</div>
                          </div>
                        )}
                      </div>

                      {/* Mini chip grid */}
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="bg-emerald-500/10 rounded-md py-1">
                          <div className="text-sm font-bold text-emerald-600 tabular-nums">{view.success}</div>
                          <div className="text-[9px] uppercase text-muted-foreground">Success</div>
                        </div>
                        <div className="bg-destructive/10 rounded-md py-1">
                          <div className="text-sm font-bold text-destructive tabular-nums">{view.failed + view.other_error}</div>
                          <div className="text-[9px] uppercase text-muted-foreground">Failed</div>
                        </div>
                        <div className="bg-amber-500/10 rounded-md py-1">
                          <div className="text-sm font-bold text-amber-600 tabular-nums">{view.duplicate}</div>
                          <div className="text-[9px] uppercase text-muted-foreground">Dup</div>
                        </div>
                      </div>

                      {/* Quality bar */}
                      {view.pushed > 0 ? (
                        <div>
                          <div className="flex h-2 rounded-full overflow-hidden bg-muted shadow-inner" title={`✅ ${view.success} · ⚠️ ${view.duplicate} · ❌ ${view.failed + view.other_error}`}>
                            <div className="bg-gradient-to-r from-emerald-500 to-green-400 transition-all" style={{ width: `${sPct}%` }} />
                            <div className="bg-gradient-to-r from-amber-500 to-yellow-400 transition-all" style={{ width: `${dPct}%` }} />
                            <div className="bg-gradient-to-r from-destructive to-red-500 transition-all" style={{ width: `${errPct}%` }} />
                          </div>
                        </div>
                      ) : (
                        <div className="text-[11px] text-muted-foreground italic">No pushes yet {activeTab === "range" ? `in ${RANGE_LABEL[range].toLowerCase()}` : "recorded"}.</div>
                      )}

                      {/* DLL gauge */}
                      {uni.daily_lead_limit != null && (
                        <div>
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" /> DLL</span>
                            <span className="font-semibold tabular-nums">{uni.daily_pushed_count || 0}<span className="text-muted-foreground font-normal">/{uni.daily_lead_limit}</span></span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={cn(
                              "h-full transition-all",
                              dllPct >= 100 ? "bg-gradient-to-r from-destructive to-red-500" :
                              dllPct >= 80 ? "bg-gradient-to-r from-amber-500 to-yellow-400" :
                              "bg-gradient-to-r from-primary to-primary/70"
                            )} style={{ width: `${dllPct}%` }} />
                          </div>
                        </div>
                      )}

                      {activeTab === "all-time" && all.last && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 border-t border-border/50">
                          <Clock className="h-3 w-3" /> Last: {new Date(all.last).toLocaleString()}
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs font-semibold mt-1"
                        onClick={(e) => { e.stopPropagation(); openDetail(uni); }}
                      >
                        View Full History
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
              {visibleUnis.length === 0 && (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    No universities match your filters.
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Disabled universities */}
            {disabledUnis.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-bold uppercase tracking-wider text-destructive">
                    Disabled Universities
                  </h3>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">{disabledUnis.length}</span>
                  <span className="text-xs text-muted-foreground">- excluded from pushes &amp; completion %</span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {disabledUnis.map((uni) => (
                    <div key={uni.id} className="flex items-center gap-2 p-3 rounded-lg border-2 border-destructive/40 bg-destructive/5 hover:bg-destructive/10 transition-colors">
                      <div className="h-3 w-3 rounded-sm bg-destructive shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate text-destructive">{uni.name}</div>
                        <div className="text-[10px] text-muted-foreground">Push blocked · re-enable in settings</div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-destructive/60 shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "sources" && (
          <Card className="border-2">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold">Source</th>
                    <th className="px-4 py-3 text-right font-bold">Pushed</th>
                    <th className="px-4 py-3 text-right font-bold">Success</th>
                    <th className="px-4 py-3 text-right font-bold">Failed</th>
                    <th className="px-4 py-3 text-right font-bold">Duplicate</th>
                    <th className="px-4 py-3 text-right font-bold">Universities</th>
                    <th className="px-4 py-3 text-left font-bold">Last push</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceRows.map((r) => {
                    const sr = r.pushed > 0 ? Math.round((r.success / r.pushed) * 100) : 0;
                    return (
                      <tr key={r.source} className="border-t border-border hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-semibold">
                          <div className="flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-primary" />
                            {r.source}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">{r.pushed.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="text-emerald-600 font-semibold">{r.success.toLocaleString()}</span>
                          <span className="text-muted-foreground text-xs ml-1">({sr}%)</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-destructive font-semibold">{r.failed.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-600 font-semibold">{r.duplicate.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.universities.size}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.last ? new Date(r.last).toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })}
                  {sourceRows.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No source-of-data entries yet. They appear here after you push leads with a source label.
                    </td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!detailUni} onOpenChange={(o) => !o && setDetailUni(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              {detailUni?.name} - Push History
            </DialogTitle>
            <DialogDescription>
              Every push attempt rolled up by date and source-of-data. Updated on every API hit (upload, pause, stop, resume, manual, landing pages, webhooks).
            </DialogDescription>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
          ) : (
            <div className="space-y-6">
              {/* Cumulative summary */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Cumulative (all-time, by source)</h3>
                {detailCum.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-4 text-center border rounded-md">No cumulative data yet.</div>
                ) : (
                  <div className="overflow-x-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-xs uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Source of Data</th>
                          <th className="px-3 py-2 text-right">Pushed</th>
                          <th className="px-3 py-2 text-right">Success</th>
                          <th className="px-3 py-2 text-right">Failed</th>
                          <th className="px-3 py-2 text-right">Duplicate</th>
                          <th className="px-3 py-2 text-right">Other Err</th>
                          <th className="px-3 py-2 text-right">DLL Blocked</th>
                          <th className="px-3 py-2 text-left">First</th>
                          <th className="px-3 py-2 text-left">Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailCum.map((c, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 font-medium">{c.source_label || <span className="text-muted-foreground italic">(no source)</span>}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{(+c.total_pushed).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-600 font-semibold">{(+c.total_success).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-destructive font-semibold">{(+c.total_failed).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-amber-600">{(+c.total_duplicate).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{(+c.total_other_error).toLocaleString()}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{(+c.total_dll_blocked).toLocaleString()}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{c.first_pushed_at ? new Date(c.first_pushed_at).toLocaleString() : "-"}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{c.last_pushed_at ? new Date(c.last_pushed_at).toLocaleString() : "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Daily breakdown */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Daily breakdown ({detailRows.length} rows)</h3>
                {detailRows.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic py-4 text-center border rounded-md">No daily data yet.</div>
                ) : (
                  <div className="overflow-x-auto border rounded-md max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/60 text-xs uppercase sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Source of Data</th>
                          <th className="px-3 py-2 text-right">Pushed</th>
                          <th className="px-3 py-2 text-right">Success</th>
                          <th className="px-3 py-2 text-right">Failed</th>
                          <th className="px-3 py-2 text-right">Duplicate</th>
                          <th className="px-3 py-2 text-right">Other Err</th>
                          <th className="px-3 py-2 text-right">DLL Blocked</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRows.map((r, i) => (
                          <tr key={i} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs">{r.stat_date}</td>
                            <td className="px-3 py-2">{r.source_label || <span className="text-muted-foreground italic">(no source)</span>}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.pushed}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-emerald-600 font-semibold">{r.success}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-destructive font-semibold">{r.failed}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-amber-600">{r.duplicate}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.other_error}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{r.dll_blocked}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
