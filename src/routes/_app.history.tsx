import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History — ResumeIQ" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);
  const [cityFilter, setCityFilter] = useState<string>("all");

  const load = async () => {
    const { data } = await supabase.from("analyses").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  const cities = useMemo(() => {
    const set = new Set<string>();
    items.forEach((a) => { if (a.city) set.add(a.city); });
    return Array.from(set).sort();
  }, [items]);

  const filtered = useMemo(() => {
    if (cityFilter === "all") return items;
    if (cityFilter === "__none__") return items.filter((a) => !a.city);
    return items.filter((a) => a.city === cityFilter);
  }, [items, cityFilter]);

  const statusFor = (a: any) => {
    const s = a.overall_score || 0;
    if (s >= 75) return { label: "Strong", className: "bg-success text-success-foreground" };
    if (s >= 50) return { label: "Average", className: "bg-warning text-warning-foreground" };
    return { label: "Needs Work", className: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Candidates</h1>
          <p className="text-muted-foreground text-sm mt-1">All your past resume analyses — filter by city.</p>
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
            <MapPin className="h-3 w-3" /> Filter by city
          </label>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              <SelectItem value="__none__">Location not available</SelectItem>
              {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="glass shadow-soft overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-center">Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => {
              const status = statusFor(a);
              const name = a.parsed?.candidate_name || a.file_name;
              return (
                <TableRow key={a.id}>
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                        <FileText className="h-4 w-4 text-primary-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground truncate">{new Date(a.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {a.city ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        {a.city}{a.state ? <span className="text-muted-foreground">, {a.state}</span> : null}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" /> City not detected
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="text-lg font-bold tabular-nums">{a.overall_score}</span>
                    <span className="text-xs text-muted-foreground">/100</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={status.className}>{status.label}</Badge>
                    {a.fake_risk > 50 && <Badge variant="destructive" className="ml-1">⚠ Fake</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => del(a.id)} aria-label="Delete">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <div className="text-center py-12 text-muted-foreground">
                    {items.length === 0 ? (
                      <>
                        <p>No analyses yet.</p>
                        <Link to="/dashboard" className="text-primary hover:underline">Run your first analysis →</Link>
                      </>
                    ) : (
                      <p>No candidates match this city filter.</p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
