import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { clearSessionDetails } from "@/lib/session";

export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAuthenticated = !!localStorage.getItem("token");

  // ✅ DO NOT change routes; just make auth pages look clean without “app frame”
  const isAuthPage = pathname === "/" || pathname.startsWith("/auth");

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-background to-amber-50/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/40 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 select-none sm:h-9 sm:w-9"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
              role="button"
              aria-label="Home"
              title="Home"
            >
              <span className="text-sm font-semibold text-primary">DM</span>
            </div>

            <div
              className="min-w-0 cursor-pointer"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
            >
              {/* ✅ Keep heading text same */}
              <div className="truncate text-sm font-semibold leading-tight sm:text-base">
                Digital Meeting Minutes Generator
              </div>
              <div className="hidden text-xs text-muted-foreground leading-tight sm:block">
                Clean meetings dashboard • Minutes • PDF
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <Button
              variant="outline"
              className="h-9 shrink-0 rounded-xl px-3 text-xs sm:text-sm"
              onClick={() => {
                clearSessionDetails();
                navigate("/", { replace: true });
              }}
            >
              Logout
            </Button>
          ) : (
            <Button
              variant="outline"
              className="h-9 shrink-0 rounded-xl px-3 text-xs sm:text-sm"
              onClick={() => navigate("/")}
            >
              Login
            </Button>
          )}
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 sm:py-8">
        {isAuthPage ? (
          <div className="hero-fade-up">
            <Outlet />
          </div>
        ) : (
          <Card className="hero-fade-up rounded-2xl border-white/40 bg-background/75 shadow-lg backdrop-blur-sm">
            <div className="p-4 md:p-6">
              <Outlet />
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
