import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { getSessionToken } from "@/lib/session";
import { jwtDecode } from "jwt-decode";
import { CalendarDays, Users } from "lucide-react";

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

  const token = getSessionToken();
  const currentUser = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return { userId: decoded.userId ?? null, role: decoded.role ?? "" };
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Meetings</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
        <div className="rounded-xl border border-border/70 bg-white/80 px-4 py-3 text-sm text-slate-700 dark:bg-slate-900/60 dark:text-slate-200">
          {msg}
        </div>
      )}

      <Card className="rounded-2xl border-border/70 bg-white/85 shadow-lg backdrop-blur-sm dark:bg-slate-900/70">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Meetings</CardTitle>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading && <div className="py-6 text-sm text-slate-600 dark:text-slate-300">Loading...</div>}

          {isError && (
            <div className="text-sm text-red-600 py-6">
              Failed to load.{" "}
              <span className="text-slate-600 dark:text-slate-300">
                {(error as any)?.response?.data?.message ?? (error as any)?.message ?? ""}
              </span>
            </div>
          )}

          {!isLoading && !isError && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-background/70 dark:bg-slate-950/35">
              {meetings.map((m, idx) => {
                const dbCount = m.participants?.length ?? 0;
                const participantsCount = dbCount > 0 ? dbCount : countParticipantsFromNotes(m.notes);
                const isCreator = !!currentUser?.userId && m.createdBy === currentUser.userId;
                const isAdmin = currentUser?.role === "ADMIN";
                const canEditMeeting = isCreator || isAdmin;

                return (
                  <div key={m.id}>
                    <button
                      onClick={() => nav(`/meetings/${m.id}`)}
                      className="w-full px-4 py-4 text-left transition hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:hover:bg-slate-900/70"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate font-semibold text-foreground">{m.title}</div>
                            <Badge variant="secondary" className="shrink-0">
                              {m.visibility === "PUBLIC_ORG" ? "Org" : "Private"}
                            </Badge>
                          </div>

                          <div className="line-clamp-1 text-sm text-slate-600 dark:text-slate-300">
                            {m.description ?? "No description"}
                          </div>

                          <div className="flex items-center gap-3 break-words text-xs text-slate-600 dark:text-slate-300">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {dayjs(m.dateTime).format("DD MMM YYYY, hh:mm A")}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3.5 w-3.5" />
                              {participantsCount}
                            </span>
                          </div>
                        </div>

                        {canEditMeeting && (
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

                            {isCreator && (
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
                            )}
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
                  <div className="text-sm text-slate-600 dark:text-slate-300">No meetings yet.</div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
