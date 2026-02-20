import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";

type TokenPayload = {
  role: string;
  orgId?: string;
};

export default function DashboardHome() {
  const nav = useNavigate();

  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const decoded = jwtDecode<TokenPayload>(token);
        const role = decoded.role;
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
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Choose what you want to do.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/30" onClick={() => nav("/meetings")}>
          <CardHeader>
            <CardTitle className="text-base">Meetings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            View meetings, notes, minutes and PDFs.
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/30" onClick={() => nav("/meetings/new")}>
          <CardHeader>
            <CardTitle className="text-base">Create Meeting</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Schedule a meeting and start capturing notes.
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/30" onClick={() => nav("/auth/org")}>
          <CardHeader>
            <CardTitle className="text-base">Join / Create Org</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Create an org or submit join request.
          </CardContent>
        </Card>

        {/* ✅ ADMIN CARD */}
        {isAdmin && (
          <Card className="cursor-pointer hover:bg-muted/30" onClick={() => nav("/admin/requests")}>
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

      <div className="flex gap-3">
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
