import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TokenPayload = {
  role: string;
  orgId?: string;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
};

export default function AdminRequests() {
  const [orgId, setOrgId] = useState<string>("");
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function loadPending(givenOrgId?: string) {
    try {
      setMsg("");
      setLoading(true);

      const oid = givenOrgId || orgId;
      if (!oid) {
        setPendingUsers([]);
        setMsg("orgId missing. Create org / join org first.");
        return;
      }

      const res = await api.get(`/orgs/${oid}/pending`);
      setPendingUsers(res.data?.users || []);
    } catch (err: any) {
      const status = err?.response?.status;
      const dataMsg = err?.response?.data?.message;
      const url = err?.config?.url;

      setMsg(
        `Failed to load requests. ${status ? `(${status})` : ""} ${
          dataMsg || ""
        } ${url ? `URL: ${url}` : ""}`
      );
    } finally {
      setLoading(false);
    }
  }

  async function approve(userId: string) {
    await api.patch(`/orgs/${orgId}/approve/${userId}`);
    loadPending();
  }

  async function reject(userId: string) {
    await api.patch(`/orgs/${orgId}/reject/${userId}`);
    loadPending();
  }

  useEffect(() => {
    const token = getSessionToken();
    if (!token) {
      setMsg("No token found. Please login again.");
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<TokenPayload>(token);
      const oid = decoded.orgId || "";
      setOrgId(oid);
      loadPending(oid);
    } catch {
      setMsg("Invalid token. Please login again.");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Join Requests</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Approve or reject users who requested to join your org.
          </p>
        </div>

        <Badge variant={pendingUsers.length > 0 ? "default" : "secondary"}>
          {pendingUsers.length} Pending
        </Badge>
      </div>

      {msg && <div className="text-sm text-red-500">{msg}</div>}

      <Card className="border-white/40 bg-white/75 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">Pending Users</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : pendingUsers.length === 0 ? (
            <div className="text-sm text-muted-foreground">No pending requests.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {pendingUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="break-all text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{u.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(u.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex flex-wrap justify-end gap-2">
                        <Button size="sm" onClick={() => approve(u.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => reject(u.id)}>
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
