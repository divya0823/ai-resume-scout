import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge, MiniScore } from "@/components/ScoreGauge";
import { Leaderboard } from "@/components/Leaderboard";
import { extractText } from "@/lib/extract-text";
import { toast } from "sonner";
import {
  Upload, Loader2, Sparkles, Briefcase, GraduationCap, Award,
  Code, AlertTriangle, CheckCircle2, XCircle, TrendingUp, Download, Eye,
  Wrench, FileType, Link2, Star
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import jsPDF from "jspdf";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Analyze Resume — ResumeIQ" }] }),
  component: Dashboard,
});

interface JobProfile { id: string; title: string; description: string; required_skills: string[]; level: string; }

const MIN_WORDS = 50;

function Dashboard() {
  const [file, setFile] = useState<File | null>(null);
  const [gender, setGender] = useState("none");
  const [jobs, setJobs] = useState<JobProfile[]>([]);
  const [selectedJob, setSelectedJob] = useState<string>("none");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [feedback, setFeedback] = useState<any>(null);
  const [suggestions, setSuggestions] = useState<any>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [rawText, setRawText] = useState("");
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    supabase.from("job_profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data) setJobs(data as JobProfile[]);
    });
  }, []);

  const validateAndSet = (f: File | null) => {
    if (!f) return;
    const ok = f.type === "application/pdf" || f.type === "text/plain" || f.name.endsWith(".pdf") || f.name.endsWith(".txt");
    if (!ok) { toast.error("Only PDF and TXT files are supported."); return; }
    if (f.size > 5 * 1024 * 1024) { toast.error("Max file size is 5 MB."); return; }
    setFile(f);
    setAnalysis(null); setFeedback(null); setSuggestions(null); setAnalysisId(null);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    validateAndSet(e.dataTransfer.files?.[0] ?? null);
  }, []);

  const runAnalysis = async () => {
    if (!file) { toast.error("Upload a resume first."); return; }
    setAnalyzing(true);
    try {
      toast.info("Extracting text…");
      const text = await extractText(file);
      setRawText(text);

      const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
      // Flexible threshold: only block truly empty / unreadable files
      if (wordCount < MIN_WORDS) {
        if (wordCount < 10) throw new Error("Couldn't read enough text from the file. Make sure the PDF contains selectable text (not a scanned image).");
        toast.warning(`Low content detected (${wordCount} words) — analysis will continue with reduced accuracy.`);
      }

      const job = jobs.find((j) => j.id === selectedJob);
      toast.info("Running AI analysis…");
      const { data, error } = await supabase.functions.invoke("analyze-resume", {
        body: { text, jobDescription: job?.description, requiredSkills: job?.required_skills, genderPreference: gender }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const a = data.analysis;
      setAnalysis(a);

      const { data: saved, error: insErr } = await supabase.from("analyses").insert({
        user_id: (await supabase.auth.getUser()).data.user!.id,
        job_profile_id: job?.id ?? null,
        file_name: file.name,
        gender_preference: gender,
        ats_score: Math.round(a.ats_score || 0),
        match_score: Math.round(a.match_score || 0),
        fake_risk: Math.round(a.fake_risk || 0),
        overall_score: Math.round(a.overall_score || 0),
        skill_score: Math.round(a.skill_score || 0),
        experience_score: Math.round(a.experience_score || 0),
        education_score: Math.round(a.education_score || 0),
        project_score: Math.round(a.project_score || 0),
        low_content: !!a.low_content,
        word_count: a.word_count || wordCount,
        raw_text: text.slice(0, 30000),
        parsed: a,
      }).select().single();
      if (insErr) console.error(insErr);
      if (saved) setAnalysisId(saved.id);

      setLeaderboardKey((k) => k + 1);
      toast.success("Analysis complete!");
    } catch (e: any) {
      toast.error(e.message || "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const generateFeedback = async () => {
    if (!analysis) return;
    setFeedbackLoading(true);
    try {
      const job = jobs.find((j) => j.id === selectedJob);
      const { data, error } = await supabase.functions.invoke("recruiter-feedback", {
        body: { analysis, jobDescription: job?.description }
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setFeedback(data.feedback);
      if (analysisId) await supabase.from("analyses").update({ feedback: data.feedback }).eq("id", analysisId);
    } catch (e: any) { toast.error(e.message); }
    finally { setFeedbackLoading(false); }
  };

  const suggestJobs = async () => {
    if (!analysis) return;
    setSuggestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-jobs", { body: { analysis } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSuggestions(data);
      if (analysisId) await supabase.from("analyses").update({ job_suggestions: data }).eq("id", analysisId);
    } catch (e: any) { toast.error(e.message); }
    finally { setSuggestLoading(false); }
  };

  const exportPdf = () => {
    if (!analysis) return;
    const doc = new jsPDF();
    let y = 15;
    const line = (t: string, sz = 11, bold = false) => {
      doc.setFontSize(sz); doc.setFont("helvetica", bold ? "bold" : "normal");
      const lines = doc.splitTextToSize(t, 180);
      lines.forEach((l: string) => { if (y > 280) { doc.addPage(); y = 15; } doc.text(l, 15, y); y += sz * 0.55 + 2; });
    };
    line("Resume Analysis Report", 18, true); y += 2;
    line(`Candidate: ${analysis.candidate_name || "N/A"}`); line(`File: ${file?.name || ""}`);
    line(`Overall: ${analysis.overall_score}/100   ATS: ${analysis.ats_score}/100   Match: ${analysis.match_score}/100`);
    line(`Skills: ${analysis.skill_score}   Experience: ${analysis.experience_score}   Education: ${analysis.education_score}   Projects: ${analysis.project_score}`);
    y += 2; line("Skills", 13, true); line((analysis.skills || []).join(", ") || "—");
    if (analysis.missing_skills?.length) { line("Missing Skills", 13, true); line(analysis.missing_skills.join(", ")); }
    line("Experience", 13, true);
    if (analysis.is_fresher) line("Fresher candidate — no formal work experience.");
    (analysis.experience || []).forEach((e: any) => line(`• ${e.role} @ ${e.company} (${e.duration})`));
    line("Education", 13, true);
    (analysis.education || []).forEach((e: any) => line(`• ${e.degree} — ${e.institution}${e.year ? ` (${e.year})` : ""}`));
    if (feedback) {
      line("Recruiter Feedback", 13, true); line(`Verdict: ${feedback.verdict}`);
      line("Strengths:", 12, true); feedback.strengths.forEach((s: string) => line(`• ${s}`));
      line("Weaknesses:", 12, true); feedback.weaknesses.forEach((s: string) => line(`• ${s}`));
      line("Improvements:", 12, true); feedback.improvements.forEach((s: string) => line(`• ${s}`));
    }
    doc.save(`${(analysis.candidate_name || "resume").replace(/\s+/g, "_")}_report.pdf`);
  };

  const breakdown = analysis?.ats_breakdown
    ? Object.entries(analysis.ats_breakdown).map(([k, v]) => ({ name: k, value: Number(v) }))
    : [];

  const isFresher = !!analysis?.is_fresher || (analysis && (!analysis.experience || analysis.experience.length === 0));

  const improvementGroups: { key: string; label: string; icon: any; items: string[] }[] = analysis?.improvements
    ? [
        { key: "skills", label: "Skills", icon: Code, items: analysis.improvements.skills || [] },
        { key: "experience", label: "Experience", icon: Briefcase, items: analysis.improvements.experience || [] },
        { key: "formatting", label: "Formatting", icon: FileType, items: analysis.improvements.formatting || [] },
        { key: "links", label: "Links & Profiles", icon: Link2, items: analysis.improvements.links || [] },
      ].filter((g) => g.items.length > 0)
    : [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Analyze a Resume</h1>
        <p className="text-muted-foreground text-sm mt-1">Upload, score, and get AI insights in seconds.</p>
      </div>

      {/* Upload card */}
      <Card className="glass p-6 mb-6 shadow-soft">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${dragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
            >
              <Upload className="h-10 w-10 mx-auto mb-3 text-primary" />
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB · click to change</p>
                </div>
              ) : (
                <>
                  <p className="font-medium">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF or TXT · max 5MB</p>
                </>
              )}
              <input ref={inputRef} type="file" accept=".pdf,.txt" hidden onChange={(e) => validateAndSet(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Gender preference</label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No preference</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Target job</label>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific job</SelectItem>
                  {jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>)}
                </SelectContent>
              </Select>
              {jobs.length === 0 && (
                <Link to="/jobs" className="text-xs text-primary hover:underline mt-1 inline-block">+ Add job profile</Link>
              )}
            </div>
            <Button onClick={runAnalysis} disabled={!file || analyzing} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              {analyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing…</> : <><Sparkles className="mr-2 h-4 w-4" />Run AI Analysis</>}
            </Button>
          </div>
        </div>
      </Card>

      {/* Loading skeletons */}
      {analyzing && !analysis && (
        <div className="space-y-4 mb-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
          <Skeleton className="h-32 rounded-xl" />
        </div>
      )}

      {analysis && (
        <>
          {/* Low content warning */}
          {analysis.low_content && (
            <Card className="glass p-4 mb-6 border-warning/50 bg-warning/5 shadow-soft">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Low Content Resume <Badge variant="outline" className="ml-2 border-warning/50 text-warning">{analysis.word_count} words</Badge></p>
                  <p className="text-xs text-muted-foreground mt-1">Results may be less accurate. Consider expanding your resume with more detail in skills, experience, and projects.</p>
                </div>
              </div>
            </Card>
          )}

          {/* Multi-score dashboard */}
          <div className="grid gap-4 lg:grid-cols-3 mb-6">
            <Card className="glass p-6 flex flex-col items-center shadow-soft lg:row-span-2">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Overall Score</p>
              <ScoreGauge value={analysis.overall_score || 0} label="" size={200} />
              <Badge className="mt-3 bg-gradient-primary text-primary-foreground">{(analysis.overall_score || 0) >= 75 ? "Strong" : (analysis.overall_score || 0) >= 50 ? "Average" : "Needs Work"}</Badge>
            </Card>
            <Card className="glass p-5 shadow-soft">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Star className="h-4 w-4 text-primary" />Sub-Scores</h3>
              <div className="space-y-3">
                <MiniScore label="🎯 Skill Match" value={analysis.skill_score} />
                <MiniScore label="💼 Experience" value={analysis.experience_score} />
                <MiniScore label="📚 Education" value={analysis.education_score} />
                <MiniScore label="🚀 Projects" value={analysis.project_score} />
              </div>
            </Card>
            <Card className="glass p-5 shadow-soft">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Match & Trust</h3>
              <div className="space-y-3">
                <MiniScore label="📊 ATS Friendly" value={analysis.ats_score} />
                <MiniScore label="🎯 Job Match" value={analysis.match_score} />
                <MiniScore label="🛡 Authenticity" value={100 - (analysis.fake_risk || 0)} />
              </div>
            </Card>
            <Card className="glass p-5 shadow-soft lg:col-span-2">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />ATS Breakdown</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
                    <YAxis domain={[0, 100]} stroke="var(--color-muted-foreground)" fontSize={11} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                    <Bar dataKey="value" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Header info + actions */}
          <Card className="glass p-6 mb-6 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-xl font-bold">{analysis.candidate_name || "Candidate"}</h2>
                <p className="text-sm text-muted-foreground break-all">{analysis.email} {analysis.phone && `· ${analysis.phone}`}</p>
                {analysis.summary && <p className="text-sm mt-2 max-w-2xl">{analysis.summary}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {isFresher && <Badge variant="secondary" className="bg-primary/15 text-primary border-primary/30">🎓 Fresher Candidate</Badge>}
                  {gender !== "none" && analysis.detected_gender !== "unknown" && (
                    <Badge variant={analysis.detected_gender === gender ? "default" : "outline"}>
                      Gender: {analysis.detected_gender} {analysis.detected_gender === gender && "✓"}
                    </Badge>
                  )}
                  {analysis.fake_risk > 50 && <Badge variant="destructive">⚠ High fake risk</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(!previewOpen)}>
                  <Eye className="h-4 w-4 mr-1" />{previewOpen ? "Hide" : "Preview"}
                </Button>
                <Button variant="outline" size="sm" onClick={exportPdf}>
                  <Download className="h-4 w-4 mr-1" />PDF Report
                </Button>
              </div>
            </div>
            {previewOpen && (
              <div className="mt-4 max-h-64 overflow-auto rounded-lg bg-muted p-4 text-xs whitespace-pre-wrap font-mono">
                {rawText}
              </div>
            )}
          </Card>

          {/* Sections */}
          <Tabs defaultValue="skills" className="mb-6">
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
              <TabsTrigger value="skills">Skills</TabsTrigger>
              <TabsTrigger value="experience">Experience</TabsTrigger>
              <TabsTrigger value="education">Education</TabsTrigger>
              <TabsTrigger value="extras">Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="skills">
              <Card className="glass p-6 shadow-soft">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Code className="h-4 w-4 text-primary" />Detected Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {(analysis.skills || []).map((s: string, i: number) => (
                    <Badge key={i} variant="secondary" className="hover:scale-105 transition-transform">{s}</Badge>
                  ))}
                  {(!analysis.skills || analysis.skills.length === 0) && <p className="text-sm text-muted-foreground italic">Limited data detected.</p>}
                </div>
                {analysis.missing_skills?.length > 0 && (
                  <>
                    <h3 className="font-semibold mt-6 mb-3 flex items-center gap-2 text-warning"><AlertTriangle className="h-4 w-4" />Missing Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.missing_skills.map((s: string, i: number) => (
                        <Badge key={i} variant="outline" className="border-warning/40 text-warning">{s}</Badge>
                      ))}
                    </div>
                  </>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="experience">
              <Card className="glass p-6 shadow-soft">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />Work Experience</h3>
                {isFresher ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <p className="font-medium">🎓 Fresher Candidate</p>
                    <p className="text-sm text-muted-foreground mt-1">No formal work experience detected. Scoring focuses on Skills, Projects, Education, and Certifications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(analysis.experience || []).map((e: any, i: number) => (
                      <div key={i} className="rounded-lg border p-4 hover:border-primary/40 transition-colors">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="font-medium">{e.role}</p>
                            <p className="text-sm text-muted-foreground">{e.company}</p>
                          </div>
                          <Badge variant="outline">{e.duration}</Badge>
                        </div>
                        {e.highlights?.length > 0 && (
                          <ul className="mt-2 text-sm space-y-1 list-disc pl-5 text-muted-foreground">
                            {e.highlights.map((h: string, j: number) => <li key={j}>{h}</li>)}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="education">
              <Card className="glass p-6 shadow-soft">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-primary" />Education</h3>
                <div className="space-y-3">
                  {(analysis.education || []).map((e: any, i: number) => (
                    <div key={i} className="rounded-lg border p-4 flex justify-between flex-wrap gap-2 hover:border-primary/40 transition-colors">
                      <div>
                        <p className="font-medium">{e.degree}</p>
                        <p className="text-sm text-muted-foreground">{e.institution}</p>
                      </div>
                      {e.year && <Badge variant="outline">{e.year}</Badge>}
                    </div>
                  ))}
                  {(!analysis.education || analysis.education.length === 0) && <p className="text-sm text-muted-foreground italic">Limited data detected.</p>}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="extras">
              <Card className="glass p-6 shadow-soft space-y-6">
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Code className="h-4 w-4 text-primary" />Projects <Badge variant="secondary">{analysis.projects?.length || 0}</Badge>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.projects || []).map((p: string, i: number) => <Badge key={i} variant="secondary" className="hover:scale-105 transition-transform">{p}</Badge>)}
                    {(!analysis.projects || analysis.projects.length === 0) && <p className="text-sm text-muted-foreground italic">Limited data detected.</p>}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4 text-primary" />Certifications <Badge variant="secondary">{analysis.certifications?.length || 0}</Badge>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.certifications || []).map((p: string, i: number) => <Badge key={i} variant="secondary" className="hover:scale-105 transition-transform">{p}</Badge>)}
                    {(!analysis.certifications || analysis.certifications.length === 0) && <p className="text-sm text-muted-foreground italic">Limited data detected.</p>}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Smart improvement suggestions (categorized) */}
          {improvementGroups.length > 0 && (
            <Card className="glass p-6 mb-6 shadow-soft">
              <h3 className="font-semibold mb-4 flex items-center gap-2 text-lg">
                <Wrench className="h-5 w-5 text-primary" /> Smart Improvement Suggestions
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {improvementGroups.map((g) => (
                  <div key={g.key} className="rounded-lg border bg-card/50 p-4 hover:border-primary/40 transition-all hover:shadow-soft">
                    <p className="font-medium flex items-center gap-2 mb-2 text-sm">
                      <g.icon className="h-4 w-4 text-primary" />{g.label} Improvements
                    </p>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {g.items.map((it, i) => (
                        <li key={i} className="flex gap-2"><span className="text-primary mt-0.5">→</span><span>{it}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* AI Feedback + Job suggestions */}
          <div className="grid gap-6 lg:grid-cols-2 mb-6">
            <Card className="glass p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />AI Recruiter Feedback</h3>
                <Button size="sm" onClick={generateFeedback} disabled={feedbackLoading} variant="outline">
                  {feedbackLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate"}
                </Button>
              </div>
              {feedback ? (
                <div className="space-y-4 text-sm">
                  <p className="italic text-muted-foreground">"{feedback.verdict}"</p>
                  <div>
                    <p className="font-medium mb-1 flex items-center gap-1 text-success"><CheckCircle2 className="h-4 w-4" />Strengths</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{feedback.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />Weaknesses</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{feedback.weaknesses.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                  </div>
                  <div>
                    <p className="font-medium mb-1 flex items-center gap-1 text-primary"><TrendingUp className="h-4 w-4" />Improvements</p>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">{feedback.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}</ul>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click "Generate" for AI feedback.</p>
              )}
            </Card>

            <Card className="glass p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" />AI Job Matches</h3>
                <Button size="sm" onClick={suggestJobs} disabled={suggestLoading} variant="outline">
                  {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Suggest"}
                </Button>
              </div>
              {suggestions ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-success font-semibold mb-2 flex items-center gap-1">
                      <Star className="h-3 w-3" />Best Fit Roles
                    </p>
                    <div className="space-y-2">
                      {(suggestions.best_fit || []).map((j: any, i: number) => <JobRow key={i} j={j} accent />)}
                    </div>
                  </div>
                  {(suggestions.alternatives || []).length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Alternative Roles</p>
                      <div className="space-y-2">
                        {suggestions.alternatives.map((j: any, i: number) => <JobRow key={i} j={j} />)}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Click "Suggest" for AI job matches.</p>
              )}
            </Card>
          </div>
        </>
      )}

      {/* Global leaderboard + stats */}
      <div className="mt-10">
        <div className="mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">🏆 Global Leaderboard</h2>
          <p className="text-sm text-muted-foreground">Top candidates across all analyses on the platform.</p>
        </div>
        <Leaderboard refreshKey={leaderboardKey} />
      </div>
    </div>
  );
}

function JobRow({ j, accent }: { j: any; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 transition-all hover:scale-[1.01] ${accent ? "border-success/40 bg-success/5" : ""}`}>
      <div className="flex justify-between items-start gap-2 flex-wrap">
        <div>
          <p className="font-medium text-sm">{j.title}</p>
          <Badge variant="outline" className="mt-1">{j.level}</Badge>
        </div>
        <Badge className={accent ? "bg-success text-success-foreground" : "bg-gradient-primary text-primary-foreground"}>
          {j.match_percent}% match
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-2">{j.reason}</p>
      <div className="flex flex-wrap gap-1 mt-2">
        {j.matching_skills.map((s: string, k: number) => <Badge key={k} variant="secondary" className="text-[10px]">{s}</Badge>)}
      </div>
    </div>
  );
}
