import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History — ResumeIQ" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const [items, setItems] = useState<any[]>([]);

  const load = async () => {
    const { data } = await supabase.from("analyses").select("*").order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, []);

  const del = async (id: string) => {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analysis History</h1>
        <p className="text-muted-foreground text-sm mt-1">All your past resume analyses.</p>
      </div>
      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id} className="glass p-5 shadow-soft flex flex-wrap items-center gap-4 justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shrink-0">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{a.parsed?.candidate_name || a.file_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()} · {a.file_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">ATS {a.ats_score}</Badge>
              <Badge variant="outline">Match {a.match_score}</Badge>
              <Badge variant={a.fake_risk > 50 ? "destructive" : "secondary"}>Fake risk {a.fake_risk}</Badge>
              <Button variant="ghost" size="icon" onClick={() => del(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p>No analyses yet.</p>
            <Link to="/dashboard" className="text-primary hover:underline">Run your first analysis →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
