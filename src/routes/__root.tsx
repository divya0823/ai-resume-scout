import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Header } from "@/components/Header";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 bg-gradient-hero">
      <div className="max-w-md text-center glass rounded-2xl p-10">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ResumeIQ — AI Resume Screening & ATS Analyzer" },
      { name: "description", content: "Upload a resume and get instant AI-powered ATS scoring, skill gaps, recruiter feedback, and matching job suggestions." },
      { property: "og:title", content: "ResumeIQ — AI Resume Screening & ATS Analyzer" },
      { name: "twitter:title", content: "ResumeIQ — AI Resume Screening & ATS Analyzer" },
      { property: "og:description", content: "Upload a resume and get instant AI-powered ATS scoring, skill gaps, recruiter feedback, and matching job suggestions." },
      { name: "twitter:description", content: "Upload a resume and get instant AI-powered ATS scoring, skill gaps, recruiter feedback, and matching job suggestions." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2cedcbd-70de-4321-88d1-ae03f6a37c58/id-preview-61a04ce7--c972230f-c8e9-4412-9967-4c4c417addfd.lovable.app-1776914165994.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/f2cedcbd-70de-4321-88d1-ae03f6a37c58/id-preview-61a04ce7--c972230f-c8e9-4412-9967-4c4c417addfd.lovable.app-1776914165994.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  // Prevent dark-mode flash
  const themeScript = `try { var t = localStorage.getItem('theme'); if (t === 'dark') document.documentElement.classList.add('dark'); } catch(e) {}`;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
