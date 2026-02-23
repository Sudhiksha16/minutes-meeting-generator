import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { SESSION_KEYS } from "@/lib/session";

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

export default function DashboardHome() {
  const nav = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayName, setDisplayName] = useState("there");
  const [displayRole, setDisplayRole] = useState("");
  const [displayOrgName, setDisplayOrgName] = useState("");
  const [createdMeetingsCount, setCreatedMeetingsCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = jwtDecode<TokenPayload>(token);
        const userName = localStorage.getItem(SESSION_KEYS.userName)?.trim() ?? "";
        const orgName = localStorage.getItem(SESSION_KEYS.orgName)?.trim() ?? "";
        const roleFromStorage = localStorage.getItem(SESSION_KEYS.userRole)?.trim() ?? "";
        const userId = decoded.userId ?? "";

        if (userName) setDisplayName(userName);
        if (orgName) setDisplayOrgName(orgName);

        const role = roleFromStorage || decoded.role;
        if (role) setDisplayRole(role);
        const orgId = decoded.orgId;

        const admin = role === "ADMIN";
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
      <div>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Welcome, <span className="text-primary">{displayName}</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your dashboard and meeting tools are ready.
        </p>
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
