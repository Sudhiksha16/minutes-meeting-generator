import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC_ORG";
  dateTime: string;
  createdAt: string;
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

export default function MeetingsList() {
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

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await api.get<MeetingsResponse>("/meetings")).data,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Meetings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a meeting to view details, minutes, and PDF.
          </p>
        </div>

        <div className="flex w-full gap-2 sm:w-auto">
          <Button className="rounded-xl" onClick={() => nav("/meetings/new")}>
            Create Meeting
          </Button>
        </div>
      </div>

      {msg && (
        <div className="text-sm rounded-xl border bg-background/60 px-4 py-3">
          {msg}
        </div>
      )}

      <Card className="rounded-2xl border-white/40 bg-white/75 shadow-lg backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Meetings</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading && <div className="text-sm text-muted-foreground py-6">Loading…</div>}

          {isError && (
            <div className="text-sm text-red-600 py-6">
              Failed to load.{" "}
              <span className="text-muted-foreground">
                {(error as any)?.response?.data?.message ?? (error as any)?.message ?? ""}
              </span>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="overflow-hidden rounded-xl border border-white/40 bg-background/60">
              {meetings.map((m, idx) => {
                const dbCount = m.participants?.length ?? 0;
                const participantsCount = dbCount > 0 ? dbCount : countParticipantsFromNotes(m.notes);
                const isCreator = !!currentUserId && m.createdBy === currentUserId;

                return (
                  <div key={m.id}>
                    <button
                      onClick={() => nav(`/meetings/${m.id}`)}
                      className="w-full px-4 py-4 text-left transition hover:bg-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium truncate">{m.title}</div>
                            <Badge variant="secondary" className="shrink-0">
                              {m.visibility === "PUBLIC_ORG" ? "Org" : "Private"}
                            </Badge>
                          </div>

                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {m.description ?? "No description"}
                          </div>

                          <div className="text-xs text-muted-foreground break-words">
                            📅 {dayjs(m.dateTime).format("DD MMM YYYY, hh:mm A")} • 👥 {participantsCount}
                          </div>
                        </div>

                        {isCreator && (
                          <div className="flex w-full flex-wrap items-center justify-end gap-2 shrink-0 sm:w-auto">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
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
                              className="rounded-xl"
                              disabled={deletingId === m.id}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDelete(m.id);
                              }}
                            >
                              {deletingId === m.id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        )}
                      </div>
                    </button>

                    {idx !== meetings.length - 1 && <Separator />}
                  </div>
                );
              })}

              {!isLoading && meetings.length === 0 && (
                <div className="py-10 text-center">
                  <div className="text-sm text-muted-foreground">No meetings yet.</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
