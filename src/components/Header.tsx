import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Sun, FileText, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export function Header() {
  const { theme, toggle } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location } = useRouterState();

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <FileText className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="hidden sm:inline text-gradient">ResumeIQ</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1 text-sm">
          {user && (
            <>
              <Link to="/dashboard" className={`px-3 py-2 rounded-md hover:bg-accent ${location.pathname === "/dashboard" ? "text-primary font-medium" : ""}`}>Analyze</Link>
              <Link to="/jobs" className={`px-3 py-2 rounded-md hover:bg-accent ${location.pathname === "/jobs" ? "text-primary font-medium" : ""}`}>Jobs</Link>
              <Link to="/history" className={`px-3 py-2 rounded-md hover:bg-accent ${location.pathname === "/history" ? "text-primary font-medium" : ""}`}>History</Link>
            </>
          )}
          <Link to="/how-it-works" className={`px-3 py-2 rounded-md hover:bg-accent ${location.pathname === "/how-it-works" ? "text-primary font-medium" : ""}`}>How it works</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="max-w-[140px] truncate">{user.email}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button onClick={() => navigate({ to: "/auth" })} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              Get Started
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
