import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { SESSION_KEYS } from "@/lib/session";

type TokenPayload = {
  role: string;
  orgId?: string;
};

export default function DashboardHome() {
  const nav = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [displayName, setDisplayName] = useState("there");
  const [displayOrgName, setDisplayOrgName] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = jwtDecode<TokenPayload>(token);
        const userName = localStorage.getItem(SESSION_KEYS.userName)?.trim() ?? "";
        const orgName = localStorage.getItem(SESSION_KEYS.orgName)?.trim() ?? "";
        const roleFromStorage = localStorage.getItem(SESSION_KEYS.userRole)?.trim() ?? "";

        if (userName) setDisplayName(userName);
        if (orgName) setDisplayOrgName(orgName);

        const role = roleFromStorage || decoded.role;
        const orgId = decoded.orgId;

        const admin = role === "ADMIN" || role === "HEAD" || role === "CEO";
        setIsAdmin(admin);

        if (admin && orgId) {
          const res = await api.get(`/orgs/${orgId}/pending`);
          setPendingCount((res.data?.users || []).length);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>

        {isAdmin ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome admin of{" "}
            <span className="font-medium text-foreground">{displayOrgName || "your organization"}</span>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome, <span className="font-medium text-foreground">{displayName}</span>. Choose what you want to do.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="group cursor-pointer border-white/40 bg-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg" onClick={() => nav("/meetings")}>
          <CardHeader>
            <CardTitle className="text-base">List of Meetings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            View meetings, notes, minutes and PDFs.
          </CardContent>
        </Card>

        <Card className="group cursor-pointer border-white/40 bg-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg" onClick={() => nav("/meetings/new")}>
          <CardHeader>
            <CardTitle className="text-base">Create MOM</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Schedule a meeting and start capturing notes.
          </CardContent>
        </Card>

        <Card className="group cursor-pointer border-white/40 bg-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg" onClick={() => nav("/auth/org")}>
          <CardHeader>
            <CardTitle className="text-base">Join / Create Org</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create an org or submit join request.
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="group cursor-pointer border-white/40 bg-white/80 transition-all hover:-translate-y-0.5 hover:bg-white/95 hover:shadow-lg" onClick={() => nav("/admin/requests")}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Join Requests</CardTitle>
              <Badge variant={pendingCount > 0 ? "default" : "secondary"}>
                {pendingCount} Pending
              </Badge>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
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
