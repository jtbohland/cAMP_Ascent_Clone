import { useState, useMemo } from "react";
import PasswordGate from "@/components/PasswordGate";
import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function AnalyticsPage() {
  return (
    <PasswordGate>
      <AnalyticsContent />
    </PasswordGate>
  );
}

function AnalyticsContent() {
  const [activeTab, setActiveTab] = useState<"overview" | "viewers" | "roles">("overview");
  const { data, loading, fetching, isError, error } = useApiData("GetAnalyticsV2", {});

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load analytics: {error?.message ?? "Unknown error"}</p>
      </div>
    );
  }

  const { clipStats = [], viewerStats = [], roleStats = [] } = data ?? {};

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-1">
          {(["overview", "viewers", "roles"] as const).map((tab) => (
            <Button key={tab} variant={activeTab === tab ? "default" : "outline"} size="sm"
              onClick={() => setActiveTab(tab)}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {fetching && !loading && <div className="text-xs text-muted-foreground">Updating…</div>}

      <div className={fetching && !loading ? "opacity-70" : ""}>
        {activeTab === "overview" && <OverviewTab clipStats={clipStats} />}
        {activeTab === "viewers" && <ViewersTab viewerStats={viewerStats} />}
        {activeTab === "roles" && <RolesTab roleStats={roleStats} />}
      </div>
    </div>
  );
}

function OverviewTab({ clipStats }: { clipStats: any[] }) {
  const totalViewers = useMemo(() => {
    const set = new Set<number>();
    clipStats.forEach(c => set.add(c.totalViewers));
    return Math.max(...clipStats.map(c => c.totalViewers), 0);
  }, [clipStats]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">{clipStats.length}</div>
          <p className="text-xs text-muted-foreground">Live Clips</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">{totalViewers}</div>
          <p className="text-xs text-muted-foreground">Total Viewers</p>
        </Card>
        <Card className="p-4 text-center">
          <div className="text-3xl font-bold text-primary">
            {clipStats.length > 0
              ? Math.round(clipStats.reduce((sum, c) => sum + (c.avgScore ?? 0), 0) / clipStats.filter(c => c.avgScore != null).length || 0)
              : 0}%
          </div>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </Card>
      </div>

      {/* Per-clip breakdown */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Per-Clip Performance</h3>
        {clipStats.map((clip) => (
          <Card key={clip.clipId} className="p-3 flex items-center gap-4">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-muted text-xs font-bold">
              {clip.sortOrder}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{clip.title}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                <span>{clip.totalViewers} viewers</span>
                <span>{clip.completedViewers} completed</span>
                <span>Avg: {clip.avgScore != null ? `${clip.avgScore}%` : "N/A"}</span>
              </div>
            </div>
            <div className="w-24">
              <Progress value={clip.totalViewers > 0 ? (clip.completedViewers / clip.totalViewers) * 100 : 0} className="h-2" />
              <p className="text-[10px] text-muted-foreground text-center mt-0.5">
                {clip.totalViewers > 0 ? Math.round((clip.completedViewers / clip.totalViewers) * 100) : 0}% completion
              </p>
            </div>
          </Card>
        ))}
        {clipStats.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        )}
      </div>
    </div>
  );
}

function ViewersTab({ viewerStats }: { viewerStats: any[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return viewerStats;
    const q = search.toLowerCase();
    return viewerStats.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      v.role.toLowerCase().includes(q)
    );
  }, [viewerStats, search]);

  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <input
          className="flex h-9 w-64 rounded-md border border-input bg-background px-3 py-1 text-sm"
          placeholder="Search viewers..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
        />
        <span className="text-xs text-muted-foreground">{filtered.length} viewers</span>
      </div>

      <div className="space-y-1">
        {pageData.map((v) => (
          <Card key={v.viewerId} className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm font-medium">{v.name}</p>
                <p className="text-xs text-muted-foreground">{v.email}</p>
              </div>
              <Badge variant="outline">{v.role}</Badge>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span>{v.clipsCompleted} clips</span>
              <span className="font-bold">{v.avgScore != null ? `${v.avgScore}%` : "N/A"}</span>
              {v.lastActivity && (
                <span className="text-muted-foreground">
                  Last: {new Date(v.lastActivity).toLocaleDateString()}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-xs">Page {page + 1} of {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

function RolesTab({ roleStats }: { roleStats: any[] }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-sm">Performance by Role</h3>
      <div className="grid grid-cols-1 gap-3">
        {roleStats.map((r) => (
          <Card key={r.role} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-sm">{r.role}</h4>
                <p className="text-xs text-muted-foreground">{r.viewerCount} viewer{r.viewerCount !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-lg font-bold">{r.avgScore != null ? `${r.avgScore}%` : "N/A"}</div>
                  <p className="text-[10px] text-muted-foreground">Avg Score</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{r.avgCompletion != null ? r.avgCompletion : "N/A"}</div>
                  <p className="text-[10px] text-muted-foreground">Clips/Viewer</p>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold">{r.avgFocus != null ? `${r.avgFocus}%` : "N/A"}</div>
                  <p className="text-[10px] text-muted-foreground">Avg Focus</p>
                </div>
              </div>
            </div>
            {r.avgScore != null && (
              <Progress value={r.avgScore} className="mt-3 h-2" />
            )}
          </Card>
        ))}
        {roleStats.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
        )}
      </div>
    </div>
  );
}
