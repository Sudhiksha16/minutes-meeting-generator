import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC_ORG";
  dateTime: string; // ISO
  createdAt: string; // ISO
  createdBy: string;
  notes?: string | null;
  participants: { id: string; meetingId: string; userId: string }[];
};

type MeetingsResponse = { meetings: Meeting[] };

type TokenPayload = {
  userId: string;
  orgId: string;
  role: string;
  iat?: number;
  exp?: number;
};

function countParticipantsFromNotes(notes?: string | null) {
  if (!notes) return 0;
  const m = notes.match(/Participants:\s*(.*)/i);
  if (!m?.[1]) return 0;
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export default function MeetingsDashboard() {
  const nav = useNavigate();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode<TokenPayload>(token).userId ?? null;
    } catch {
      return null;
    }
  }, [token]);

  // ✅ NEW: role decode + admin check
  const currentRole = useMemo(() => {
    if (!token) return null;
    try {
      return jwtDecode<TokenPayload>(token).role ?? null;
    } catch {
      return null;
    }
  }, [token]);

  const isAdmin = currentRole === "ADMIN";

  const { data, isLoading, isError, refetch, error } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => {
      const res = await api.get<MeetingsResponse>("/meetings");
      return res.data;
    },
  });

  const meetings = data?.meetings ?? [];

  async function onDelete(meetingId: string) {
    const ok = window.confirm("Delete this meeting permanently?");
    if (!ok) return;

    setDeletingId(meetingId);
    setMsg(null);

    try {
      await api.delete(`/meetings/${meetingId}`);
      setMsg("Meeting deleted ✅");
      await refetch();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Delete failed ❌");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Meetings</h1>
          <p className="text-sm text-muted-foreground">
            Select a meeting to view notes, generate minutes, and download PDF.
          </p>
        </div>

        {/* ✅ NEW: Join Requests button only for ADMIN/HEAD */}
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => nav("/admin/requests")}>
              Join Requests
            </Button>
          )}

          
        </div>
      </div>

      {msg && <div className="text-sm">{msg}</div>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Meetings</CardTitle>
        </CardHeader>

        <CardContent>
          {isLoading && (
            <div className="text-sm text-muted-foreground">Loading meetings…</div>
          )}

          {isError && (
            <div className="text-sm text-red-600">
              Failed to load meetings.{" "}
              <span className="text-muted-foreground">
                {(error as any)?.response?.data?.message ??
                  (error as any)?.message ??
                  ""}
              </span>
            </div>
          )}

          <div className="divide-y">
            {meetings.map((m) => {
              const dbCount = m.participants?.length ?? 0;
              const participantsCount =
                dbCount > 0 ? dbCount : countParticipantsFromNotes(m.notes);

              const isCreator = !!currentUserId && m.createdBy === currentUserId;

              return (
                <button
                  key={m.id}
                  onClick={() => nav(`/meetings/${m.id}`)}
                  className="w-full text-left py-4 px-2 rounded-md transition hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{m.title}</div>

                      <div className="text-sm text-muted-foreground">
                        {m.description ?? "No description"}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        📅 {dayjs(m.dateTime).format("DD MMM YYYY, hh:mm A")}
                        {"  "}•{"  "}👥 {participantsCount}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {m.visibility === "PUBLIC_ORG" ? "Org" : "Private"}
                      </Badge>

                      {isCreator && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              nav(`/meetings/${m.id}/edit`);
                            }}
                          >
                            Edit
                          </Button>

                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === m.id}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onDelete(m.id);
                            }}
                          >
                            {deletingId === m.id ? "Deleting..." : "Delete"}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}

            {!isLoading && meetings.length === 0 && (
              <div className="py-8 text-sm text-muted-foreground">
                No meetings yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
