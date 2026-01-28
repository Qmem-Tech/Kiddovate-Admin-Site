"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Filter, TrendingUp, Users } from "lucide-react";

type ContentTotal = {
  id: string; // doc id = contentKey (e.g. "game|gc_01")
  contentType: string;
  contentId: string;
  contentName: string;
  totalOpens: number;
  lastUpdated?: unknown;
};

type UserAnalyticsDoc = {
  id: string; // userId
  userId?: string;
  items?: Record<
    string,
    { count: number; contentName: string; contentType?: string; contentId?: string; lastAt?: unknown }
  >;
  updatedAt?: unknown;
};

const CONTENT_TYPES = [
  { value: "all", label: "All types" },
  { value: "game", label: "Games" },
  { value: "learning", label: "Learning" },
  { value: "sub_game", label: "Sub-games" },
  { value: "sub_learning", label: "Sub-learning" },
  { value: "drawing_canvas", label: "Drawing Canvas" },
  { value: "category", label: "Category (tabs)" },
] as const;

const SORT_OPTIONS = [
  { value: "totalOpens_desc", label: "Most opened" },
  { value: "totalOpens_asc", label: "Least opened" },
  { value: "contentName_asc", label: "Name A–Z" },
  { value: "contentName_desc", label: "Name Z–A" },
] as const;

function formatDate(ts: unknown): string {
  if (!ts) return "—";
  const d =
    ts && typeof ts === "object" && "toDate" in ts && typeof (ts as { toDate?: () => Date }).toDate === "function"
      ? (ts as { toDate: () => Date }).toDate()
      : new Date(ts as number | string | Date);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState<ContentTotal[]>([]);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsDoc[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("totalOpens_desc");
  const [view, setView] = useState<"totals" | "users">("totals");

  useEffect(() => {
    const unsubTotals = onSnapshot(
      collection(db, "analytics_totals"),
      (snap) => {
        const list: ContentTotal[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            contentType: (data?.contentType as string) ?? "",
            contentId: (data?.contentId as string) ?? "",
            contentName: (data?.contentName as string) ?? "",
            totalOpens: (data?.totalOpens as number) ?? 0,
            lastUpdated: data?.lastUpdated,
          });
        });
        setTotals(list);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading analytics_totals:", error);
        toast.error(`Failed to load analytics: ${error instanceof Error ? error.message : String(error)}`);
        setLoading(false);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, "user_analytics"),
      (snap) => {
        const list: UserAnalyticsDoc[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            userId: (data?.userId as string) ?? d.id,
            items: (data?.items as UserAnalyticsDoc["items"]) ?? {},
            updatedAt: data?.updatedAt,
          });
        });
        setUserAnalytics(list);
      },
      (error) => {
        console.error("Error loading user_analytics:", error);
      }
    );

    return () => {
      unsubTotals();
      unsubUsers();
    };
  }, []);

  const filteredAndSorted = useMemo(() => {
    let list = totals;
    if (contentTypeFilter !== "all") {
      list = list.filter((t) => t.contentType === contentTypeFilter);
    }
    const [field, dir] = sortBy.split("_") as [string, string];
    list = [...list].sort((a, b) => {
      if (field === "totalOpens") {
        const diff = (a.totalOpens ?? 0) - (b.totalOpens ?? 0);
        return dir === "desc" ? -diff : diff;
      }
      const an = (a.contentName ?? "").toLowerCase();
      const bn = (b.contentName ?? "").toLowerCase();
      const cmp = an.localeCompare(bn);
      return dir === "desc" ? -cmp : cmp;
    });
    return list;
  }, [totals, contentTypeFilter, sortBy]);

  const aggByType = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of totals) {
      const type = t.contentType || "other";
      map[type] = (map[type] ?? 0) + (t.totalOpens ?? 0);
    }
    return map;
  }, [totals]);

  const totalOpensAll = useMemo(() => totals.reduce((s, t) => s + (t.totalOpens ?? 0), 0), [totals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-gradient-to-r from-primary-600 via-primary-500 to-primary-600 p-8 text-white">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-white/80 text-lg">
          User interaction counts by content (games, learning, sub-games, sub-learning, drawing canvas).
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-kiddovate">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total opens</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOpensAll.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All content types</p>
          </CardContent>
        </Card>
        {(["game", "learning", "sub_game", "drawing_canvas"] as const).map((type) => (
          <Card key={type} className="border-0 shadow-kiddovate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {CONTENT_TYPES.find((c) => c.value === type)?.label ?? type}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-primary-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(aggByType[type] ?? 0).toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View toggle + filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">View:</span>
          <button
            type="button"
            onClick={() => setView("totals")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "totals" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            By content
          </button>
          <button
            type="button"
            onClick={() => setView("users")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              view === "users" ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Per user
          </button>
        </div>

        {view === "totals" && (
          <>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Content type:</span>
              <select
                value={contentTypeFilter}
                onChange={(e) => setContentTypeFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {CONTENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {view === "totals" && (
        <Card className="border-0 shadow-kiddovate">
          <CardHeader>
            <CardTitle>Opens by content</CardTitle>
            <CardDescription>
              Total number of opens or clicks per content item. Filter by type and sort by most/least opened or name.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAndSorted.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">
                No analytics data yet. Data appears once users open games, learning content, or the drawing canvas in the app.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold">Type</th>
                      <th className="text-left py-3 px-2 font-semibold">Content</th>
                      <th className="text-left py-3 px-2 font-semibold">ID</th>
                      <th className="text-right py-3 px-2 font-semibold">Total opens</th>
                      <th className="text-left py-3 px-2 font-semibold">Last updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSorted.map((row) => (
                      <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <span className="rounded-full bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-800">
                            {CONTENT_TYPES.find((c) => c.value === row.contentType)?.label ?? row.contentType}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-medium">{row.contentName || "—"}</td>
                        <td className="py-3 px-2 text-muted-foreground">{row.contentId || "—"}</td>
                        <td className="py-3 px-2 text-right font-semibold">{row.totalOpens.toLocaleString()}</td>
                        <td className="py-3 px-2 text-muted-foreground text-xs">{formatDate(row.lastUpdated)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {view === "users" && (
        <Card className="border-0 shadow-kiddovate">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary-600" />
              Per-user interactions
            </CardTitle>
            <CardDescription>
              For each user, content they opened and how many times. User ID &quot;anonymous&quot; is used when not signed in.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userAnalytics.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No per-user analytics yet.</p>
            ) : (
              <div className="space-y-6">
                {userAnalytics.map((u) => {
                  const items = u.items ?? {};
                  const entries = Object.entries(items).sort((_, __) => 0);
                  const sorted = [...entries].sort((a, b) => (b[1]?.count ?? 0) - (a[1]?.count ?? 0));
                  const totalUserOpens = sorted.reduce((s, [, v]) => s + (v?.count ?? 0), 0);
                  return (
                    <div key={u.id} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-sm font-medium">
                          {u.userId ?? u.id}
                          {u.id === "anonymous" && (
                            <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                              not signed in
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {totalUserOpens} total opens
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="text-left py-2 px-2 font-medium">Content</th>
                              <th className="text-left py-2 px-2 font-medium">Type</th>
                              <th className="text-right py-2 px-2 font-medium">Opens</th>
                              <th className="text-left py-2 px-2 font-medium">Last at</th>
                            </tr>
                          </thead>
                          <tbody>
                            {sorted.slice(0, 50).map(([key, val]) => (
                              <tr key={key} className="border-b border-gray-100">
                                <td className="py-2 px-2">{val?.contentName ?? key}</td>
                                <td className="py-2 px-2 text-muted-foreground">{val?.contentType ?? "—"}</td>
                                <td className="py-2 px-2 text-right font-medium">{val?.count ?? 0}</td>
                                <td className="py-2 px-2 text-muted-foreground text-xs">{formatDate(val?.lastAt)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {sorted.length > 50 && (
                          <p className="text-muted-foreground text-xs mt-2">
                            Showing first 50 of {sorted.length} items.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
