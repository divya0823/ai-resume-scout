import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Users, Star } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from "recharts";

interface Row {
  id: string;
  candidate_name: string;
  overall_score: number;
  ats_score: number;
  match_score: number;
}

interface Stats {
  total_resumes: number;
  avg_overall: number;
  avg_ats: number;
  top_score: number;
  top_candidate: string;
}

const RANK_COLORS = ["var(--color-warning)", "color-mix(in oklab, var(--color-muted-foreground) 70%, transparent)", "color-mix(in oklab, var(--color-warning) 50%, transparent)"];

export function Leaderboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [{ data: lb }, { data: st }] = await Promise.all([
        supabase.rpc("get_leaderboard", { _limit: 10 }),
        supabase.rpc("get_global_stats"),
      ]);
      if (!active) return;
      setRows((lb as Row[]) || []);
      setStats(((st as Stats[]) || [])[0] || null);
    })();
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Total Resumes" value={stats?.total_resumes ?? "—"} />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="Avg Overall" value={stats ? `${stats.avg_overall}` : "—"} />
        <StatCard icon={<Star className="h-4 w-4" />} label="Top Score" value={stats?.top_score ?? "—"} accent />
        <StatCard icon={<Trophy className="h-4 w-4" />} label="Top Candidate" value={stats?.top_candidate ?? "—"} small />
      </div>

      {/* Leaderboard chart + table */}
      <Card className="glass p-6 shadow-soft">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="font-semibold flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-warning" /> Global Leaderboard
          </h3>
          <Badge variant="outline">Top {rows?.length ?? 0}</Badge>
        </div>

        {rows === null ? (
          <div className="space-y-3">
            <Skeleton className="h-56 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No analyses yet — be the first on the leaderboard!
          </p>
        ) : (
          <>
            <div className="h-64 -ml-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows.slice(0, 10).map((r, i) => ({
                  name: truncate(r.candidate_name, 12),
                  score: r.overall_score,
                  rank: i,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
                  <Tooltip
                    cursor={{ fill: "color-mix(in oklab, var(--color-primary) 8%, transparent)" }}
                    contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }}
                  />
                  <Bar dataKey="score" radius={[10, 10, 0, 0]}>
                    {rows.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={i < 3 ? RANK_COLORS[i] : "var(--color-primary)"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 space-y-2">
              {rows.slice(0, 10).map((r, i) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-lg p-3 transition-all hover:scale-[1.01] ${
                    i === 0 ? "bg-gradient-to-r from-warning/15 to-transparent border border-warning/30" :
                    i < 3 ? "bg-muted/50 border border-border" : "border border-transparent"
                  }`}
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-sm shrink-0 ${
                    i === 0 ? "bg-warning text-warning-foreground" :
                    i === 1 ? "bg-muted-foreground/30 text-foreground" :
                    i === 2 ? "bg-warning/40 text-warning-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{r.candidate_name}</p>
                    <p className="text-xs text-muted-foreground">ATS {r.ats_score} · Match {r.match_score}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{r.overall_score}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Overall</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, accent, small }: { icon: React.ReactNode; label: string; value: any; accent?: boolean; small?: boolean }) {
  return (
    <Card className={`glass p-4 shadow-soft transition-all hover:scale-[1.02] hover:shadow-elegant ${accent ? "border-warning/40" : ""}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
        <span className={accent ? "text-warning" : "text-primary"}>{icon}</span>
        {label}
      </div>
      <p className={`mt-2 font-bold ${small ? "text-base truncate" : "text-2xl"}`}>{value}</p>
    </Card>
  );
}

function truncate(s: string, n: number) {
  return !s ? "—" : s.length > n ? s.slice(0, n - 1) + "…" : s;
}
