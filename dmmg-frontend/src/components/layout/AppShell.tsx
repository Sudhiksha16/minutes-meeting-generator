import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Moon, Sun } from "lucide-react";

import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { clearSessionDetails, getSessionToken } from "@/lib/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ThemeMode = "light" | "dark";

export default function AppShell() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isAuthenticated = !!getSessionToken();
  const isAuthPage = pathname === "/" || pathname.startsWith("/auth");

  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const [leaveOrgOpen, setLeaveOrgOpen] = useState(false);

  function applyTheme(mode: ThemeMode) {
    document.documentElement.classList.toggle("dark", mode === "dark");
    localStorage.setItem("theme", mode);
    setThemeMode(mode);
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const preferredDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || savedTheme === "light") {
      applyTheme(savedTheme);
    } else {
      applyTheme(preferredDark ? "dark" : "light");
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50/70 via-background to-amber-50/30">
      <header className="sticky top-0 z-40 border-b border-white/40 bg-background/75 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <div
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 select-none sm:h-11 sm:w-11"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}
              role="button"
              aria-label="Home"
              title="Home"
            >
              <span className="text-base font-semibold text-primary">DM</span>
            </div>

            <div className="min-w-0 cursor-pointer" onClick={() => navigate(isAuthenticated ? "/dashboard" : "/")}>
              <div className="truncate text-sm font-semibold leading-tight sm:text-base">
                Digital Meeting Minutes Generator
              </div>
              <div className="hidden text-xs text-muted-foreground leading-tight sm:block">
                Clean meetings dashboard • Minutes • PDF
              </div>
            </div>
          </div>

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 rounded-2xl"
                aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                onClick={() => applyTheme(themeMode === "dark" ? "light" : "dark")}
              >
                {themeMode === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>

              <Button
                variant="destructive"
                className="h-9 shrink-0 rounded-xl px-3 text-xs sm:text-sm"
                onClick={() => setLeaveOrgOpen(true)}
              >
                Leave Org
              </Button>

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
            </div>
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

      <Dialog open={leaveOrgOpen} onOpenChange={setLeaveOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to leave your current organization? You will be redirected to organization setup.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLeaveOrgOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setLeaveOrgOpen(false);
                navigate("/auth/org");
              }}
            >
              Confirm Leave
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
