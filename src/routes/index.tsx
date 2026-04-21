import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Upload, BarChart3, Sparkles, Briefcase, Shield, Zap, ArrowRight, FileSearch } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ResumeIQ — AI Resume Screening Platform" },
      { name: "description", content: "Smart ATS scoring, skill extraction, recruiter feedback and job matching, powered by AI." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl animate-float" />
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-glow/20 blur-3xl animate-float" />
        <div className="container relative mx-auto px-4 py-20 md:py-32 text-center">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Smarter resume screening<br />
            <span className="text-gradient">in seconds.</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-base md:text-lg text-muted-foreground">
            Upload a resume, get instant ATS scoring, skill extraction, recruiter-grade feedback, and AI job matches — all in one beautiful dashboard.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-elegant">
                Start Analyzing <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button size="lg" variant="outline" className="glass">How it works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold">Everything recruiters & students need</h2>
          <p className="mt-3 text-muted-foreground">From parsing to scoring to suggestions — automated end-to-end.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Upload, title: "Drag & Drop Upload", desc: "PDF or TXT, with validation and instant text extraction." },
            { icon: BarChart3, title: "ATS Score Dashboard", desc: "Animated gauge, breakdown charts, and clear status." },
            { icon: FileSearch, title: "Smart Parsing", desc: "Skills, experience, education, projects, certifications." },
            { icon: Sparkles, title: "AI Recruiter Feedback", desc: "Strengths, weaknesses, and concrete improvements." },
            { icon: Briefcase, title: "Job Suggestions", desc: "Match %, level, matching skills, and reasons." },
            { icon: Shield, title: "Fake Resume Detection", desc: "Flags inflated claims and inconsistencies." },
          ].map((f, i) => (
            <div key={i} className="glass rounded-2xl p-6 shadow-soft hover:shadow-elegant transition-all hover:-translate-y-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary mb-4">
                <f.icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-20">
        <div className="glass rounded-3xl p-10 md:p-16 text-center shadow-elegant bg-gradient-card">
          <Zap className="h-10 w-10 mx-auto text-primary mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Ready to screen smarter?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Create a free account and get your first AI analysis in under a minute.
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
