import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";
import { FileText, Moon, PlusCircle, Settings, Sun, UserRound } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { SESSION_KEYS } from "@/lib/session";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type TokenPayload = {
  userId?: string;
  role: string;
  orgId?: string;
};

type MeetingListResponse = {
  meetings?: Array<{
    id: string;
    createdBy: string;
  }>;
};

type ThemeMode = "light" | "dark";

export default function DashboardHome() {
  const nav = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayName, setDisplayName] = useState("there");
  const [displayRole, setDisplayRole] = useState("");
  const [displayOrgName, setDisplayOrgName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [createdMeetingsCount, setCreatedMeetingsCount] = useState(0);
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");

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

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = jwtDecode<TokenPayload>(token);
        const userName = localStorage.getItem(SESSION_KEYS.userName)?.trim() ?? "";
        const emailFromStorage = localStorage.getItem(SESSION_KEYS.userEmail)?.trim() ?? "";
        const orgName = localStorage.getItem(SESSION_KEYS.orgName)?.trim() ?? "";
        const roleFromStorage = localStorage.getItem(SESSION_KEYS.userRole)?.trim() ?? "";
        const userId = decoded.userId ?? "";

        if (userName) setDisplayName(userName);
        if (orgName) setDisplayOrgName(orgName);
        if (emailFromStorage) setUserEmail(emailFromStorage);

        const role = roleFromStorage || decoded.role;
        if (role) setDisplayRole(role);
        const orgId = decoded.orgId;

        const admin = role === "ADMIN" || role === "HEAD" || role === "CEO";
        setIsAdmin(admin);

        if (admin && orgId) {
          const res = await api.get(`/orgs/${orgId}/pending`);
          setPendingCount((res.data?.users || []).length);
        }

        const meetingsRes = await api.get<MeetingListResponse>("/meetings");
        const createdCount =
          meetingsRes.data?.meetings?.filter((meeting) => meeting.createdBy === userId).length ?? 0;
        setCreatedMeetingsCount(createdCount);
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Welcome, <span className="text-primary">{displayName}</span>
          </h1>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Your dashboard and meeting tools are ready.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-xl"
            aria-label={themeMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => applyTheme(themeMode === "dark" ? "light" : "dark")}
          >
            {themeMode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-xl" aria-label="Open settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </DialogTitle>
                <DialogDescription>Profile, meeting files, and quick actions.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border/80 bg-background/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4" />
                    My Profile
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-slate-500 dark:text-slate-300">Name:</span> {displayName || "-"}</p>
                    <p><span className="text-slate-500 dark:text-slate-300">Role:</span> {displayRole || "-"}</p>
                    <p><span className="text-slate-500 dark:text-slate-300">Organization:</span> {displayOrgName || "-"}</p>
                    <p><span className="text-slate-500 dark:text-slate-300">Email:</span> {userEmail || "-"}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <FileText className="h-4 w-4" />
                    Meeting Files
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Created by you:
                    {" "}
                    <span className="font-semibold text-foreground">{createdMeetingsCount}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => nav("/meetings")}>
                      View Meetings
                    </Button>
                    <Button size="sm" onClick={() => nav("/meetings/new")}>
                      <PlusCircle className="mr-1.5 h-4 w-4" />
                      Create New
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-background/80 p-4 md:col-span-2">
                  <div className="mb-3 text-sm font-semibold">Quick Options</div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => nav("/meetings")}>
                      All Meetings
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => nav("/auth/org")}>
                      Organization
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => nav("/admin/requests")}>
                        Join Requests
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-white/85 p-4 shadow-sm dark:bg-slate-900/65 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
              {(displayName || "U").slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Profile Summary</p>
              <p className="mt-1 text-base font-semibold">{displayName || "-"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Role: {displayRole || "-"}</Badge>
            <Badge variant="secondary">Org: {displayOrgName || "-"}</Badge>
            <Badge variant="secondary">Files: {createdMeetingsCount}</Badge>
            {isAdmin && <Badge>Admin Access</Badge>}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group cursor-pointer border-border/70 bg-white/85 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg dark:bg-slate-900/65 dark:hover:bg-slate-900/80" onClick={() => nav("/meetings")}>
          <CardHeader>
            <CardTitle className="text-base">List of Meetings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            View meetings, notes, minutes and PDFs.
          </CardContent>
        </Card>

        <Card className="group cursor-pointer border-border/70 bg-white/85 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg dark:bg-slate-900/65 dark:hover:bg-slate-900/80" onClick={() => nav("/meetings/new")}>
          <CardHeader>
            <CardTitle className="text-base">Create MOM</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Schedule a meeting and start capturing notes.
          </CardContent>
        </Card>

        <Card className="group cursor-pointer border-border/70 bg-white/85 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg dark:bg-slate-900/65 dark:hover:bg-slate-900/80" onClick={() => nav("/auth/org")}>
          <CardHeader>
            <CardTitle className="text-base">Join / Create Org</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600 dark:text-slate-300">
            Create an org or submit join request.
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="group cursor-pointer border-border/70 bg-white/85 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg dark:bg-slate-900/65 dark:hover:bg-slate-900/80" onClick={() => nav("/admin/requests")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Join Requests</CardTitle>
              <Badge variant={pendingCount > 0 ? "default" : "secondary"}>
                {pendingCount} Pending
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-slate-600 dark:text-slate-300">
              Approve / Reject users who requested to join your org.
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => nav("/meetings")}>Go to Meetings</Button>
        <Button variant="outline" onClick={() => nav("/meetings/new")}>
          Create Meeting
        </Button>

        {isAdmin && (
          <Button variant="outline" onClick={() => nav("/admin/requests")}>
            View Join Requests
          </Button>
        )}
      </div>
    </div>
  );
}
