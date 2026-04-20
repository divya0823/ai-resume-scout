import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Upload, FileText, Cpu, BarChart3, Sparkles, Briefcase, ArrowRight,
  Code2, Database, Palette, LineChart, Brain, Target, Users, GraduationCap
} from "lucide-react";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How ResumeIQ Works — Architecture & Concepts" },
      { name: "description", content: "Inside ResumeIQ: how resumes are parsed, ATS scored, and how AI feedback and job suggestions are generated." },
    ],
  }),
  component: HowItWorks,
});

const steps = [
  { icon: Upload, title: "Upload", desc: "User drops a PDF/TXT resume. We validate type and size client-side." },
  { icon: FileText, title: "Text Extraction", desc: "PDF.js parses page-by-page in the browser to extract raw text." },
  { icon: Cpu, title: "AI Parsing", desc: "An edge function sends text to the Lovable AI Gateway with a structured tool schema." },
  { icon: BarChart3, title: "Scoring", desc: "The model returns ATS score, match score, fake risk, and a per-section breakdown." },
  { icon: Sparkles, title: "Feedback", desc: "A second AI call generates strengths, weaknesses, improvements via tool calling." },
  { icon: Briefcase, title: "Job Suggestions", desc: "A third AI call recommends 5 matching roles with match % and reasons." },
];

const tech = [
  { icon: Code2, title: "TanStack Start + React 19", desc: "File-based routing, SSR-ready, fully typed." },
  { icon: Palette, title: "Tailwind v4 + Design Tokens", desc: "OKLCH semantic theming, glassmorphism, dark mode." },
  { icon: LineChart, title: "Recharts", desc: "Animated bar/line charts for ATS breakdowns." },
  { icon: Database, title: "Lovable Cloud (Supabase)", desc: "Auth, Postgres with RLS, Edge Functions." },
  { icon: Brain, title: "Lovable AI Gateway", desc: "Gemini & GPT models via a unified API; structured outputs via tool calling." },
  { icon: FileText, title: "PDF.js + jsPDF", desc: "Client-side PDF parsing and report export." },
];

const concepts = [
  { icon: Brain, title: "NLP & Structured Output", desc: "Tool calling forces the LLM to return strict JSON — no parsing hacks." },
  { icon: Target, title: "ATS Scoring Logic", desc: "Weighted across skills match, experience, education, projects, and formatting." },
  { icon: Users, title: "Recruiter Heuristics", desc: "Fake-risk detection looks at vague claims, impossible timelines, buzzword density." },
  { icon: GraduationCap, title: "Skill-Gap Analysis", desc: "Compares parsed skills to job requirements to surface missing keywords." },
];

function HowItWorks() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold">How ResumeIQ <span className="text-gradient">Works</span></h1>
        <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
          A look under the hood — from raw PDF bytes to structured insights, scoring, and AI feedback.
        </p>
      </header>

      {/* Workflow */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">🔍 System Workflow</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {steps.map((s, i) => (
            <Card key={i} className="glass p-5 shadow-soft hover:shadow-elegant transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground font-bold">{i + 1}</div>
                <s.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6 glass rounded-xl p-4 text-center text-sm text-muted-foreground font-mono overflow-x-auto">
          User Upload → Text Extraction → AI Parsing → ATS Scoring → AI Feedback → Job Suggestions
        </div>
      </section>

      {/* Tech */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">🧱 Technologies Used</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tech.map((t, i) => (
            <Card key={i} className="glass p-5 shadow-soft">
              <t.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Concepts */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">🧠 Key Concepts</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {concepts.map((c, i) => (
            <Card key={i} className="glass p-5 shadow-soft">
              <c.icon className="h-6 w-6 text-primary mb-2" />
              <h3 className="font-semibold">{c.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Use cases */}
      <section className="mb-16">
        <h2 className="text-2xl font-bold mb-6">🌍 Real-World Use Cases</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { t: "Students", d: "Improve resumes with concrete AI feedback before applying." },
            { t: "Recruiters", d: "Quickly shortlist candidates by ATS and match scores." },
            { t: "Career Coaches", d: "Identify skill gaps and suggest realistic next roles." },
          ].map((x, i) => (
            <Card key={i} className="glass p-6 shadow-soft text-center">
              <h3 className="font-semibold text-lg">{x.t}</h3>
              <p className="text-sm text-muted-foreground mt-1">{x.d}</p>
            </Card>
          ))}
        </div>
      </section>

      <div className="text-center">
        <Link to="/dashboard">
          <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            Try it now <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
