import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Briefcase } from "lucide-react";

export const Route = createFileRoute("/_app/jobs")({
  head: () => ({ meta: [{ title: "Job Profiles — ResumeIQ" }] }),
  component: JobsPage,
});

interface Job { id: string; title: string; description: string; required_skills: string[]; level: string; }

function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [skills, setSkills] = useState("");
  const [level, setLevel] = useState("mid");

  const load = async () => {
    const { data } = await supabase.from("job_profiles").select("*").order("created_at", { ascending: false });
    if (data) setJobs(data as Job[]);
  };
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!title.trim() || !desc.trim()) { toast.error("Title and description required"); return; }
    const user = (await supabase.auth.getUser()).data.user!;
    const skillArr = skills.split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("job_profiles").insert({
      user_id: user.id, title, description: desc, required_skills: skillArr, level,
    });
    if (error) { toast.error(error.message); return; }
    setTitle(""); setDesc(""); setSkills(""); setLevel("mid");
    toast.success("Job profile added");
    load();
  };

  const del = async (id: string) => {
    const { error } = await supabase.from("job_profiles").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Job Profiles</h1>
        <p className="text-muted-foreground text-sm mt-1">Define roles to match resumes against.</p>
      </div>

      <Card className="glass p-6 mb-6 shadow-soft">
        <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" />New job profile</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineer" />
          </div>
          <div>
            <Label>Level</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="junior">Junior</SelectItem>
                <SelectItem value="mid">Mid</SelectItem>
                <SelectItem value="senior">Senior</SelectItem>
                <SelectItem value="lead">Lead</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label>Required skills (comma separated)</Label>
            <Input value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="React, TypeScript, Tailwind" />
          </div>
          <div className="md:col-span-2">
            <Label>Description</Label>
            <Textarea rows={4} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What the role involves, responsibilities, must-haves…" />
          </div>
        </div>
        <Button onClick={add} className="mt-4 bg-gradient-primary text-primary-foreground hover:opacity-90">Add Job</Button>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {jobs.map((j) => (
          <Card key={j.id} className="glass p-5 shadow-soft">
            <div className="flex justify-between items-start gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-primary" />
                <h3 className="font-semibold">{j.title}</h3>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(j.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            <Badge variant="outline" className="mb-2 capitalize">{j.level}</Badge>
            <p className="text-sm text-muted-foreground line-clamp-3">{j.description}</p>
            <div className="flex flex-wrap gap-1 mt-3">
              {j.required_skills.map((s, i) => <Badge key={i} variant="secondary" className="text-[10px]">{s}</Badge>)}
            </div>
          </Card>
        ))}
        {jobs.length === 0 && <p className="text-sm text-muted-foreground col-span-2 text-center py-12">No job profiles yet.</p>}
      </div>
    </div>
  );
}
