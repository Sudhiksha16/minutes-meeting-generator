import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { jwtDecode } from "jwt-decode";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

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

function extractMinutesText(payload: any): string {
  if (!payload) return "";
  if (typeof payload?.minutes?.mom === "string") return payload.minutes.mom;
  if (typeof payload?.mom === "string") return payload.mom;
  if (typeof payload?.minutes === "string") return payload.minutes;
  if (typeof payload?.content === "string") return payload.content;
  if (typeof payload?.text === "string") return payload.text;
  return "";
}

// ✅ NEW: compute count from notes line "Participants: A, B"
function countParticipantsFromNotes(notes?: string | null) {
  if (!notes) return 0;
  const m = notes.match(/Participants:\s*(.*)/i);
  if (!m?.[1]) return 0;
  return m[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

export default function MeetingDetails() {
  const { id } = useParams();
  const meetingId = useMemo(() => String(id ?? ""), [id]);

  const [notes, setNotes] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const nav = useNavigate();

  const token = localStorage.getItem("token");
  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const decoded = jwtDecode<TokenPayload>(token);
      return decoded.userId ?? null;
    } catch {
      return null;
    }
  }, [token]);

  const meetingsQ = useQuery({
    queryKey: ["meetings"],
    queryFn: async () => (await api.get<MeetingsResponse>("/meetings")).data,
  });

  const meeting: Meeting | undefined = (meetingsQ.data?.meetings ?? []).find(
    (m) => m.id === meetingId
  );

  const minutesQ = useQuery({
    queryKey: ["minutes", meetingId],
    enabled: !!meetingId,
    retry: false,
    queryFn: async () => {
      try {
        const res = await api.get(`/meetings/${meetingId}/minutes`);
        return res.data;
      } catch (e: any) {
        if (e?.response?.status === 404) return null;
        throw e;
      }
    },
  });

  useEffect(() => {
    if (!meeting) return;
    setNotes(meeting.notes ?? "");
    setEditMode(false);
  }, [meeting?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const canEditNotes =
    !!meeting && !!currentUserId && meeting.createdBy === currentUserId;

  const minutesAvailable = minutesQ.data != null;
  const minutesText = extractMinutesText(minutesQ.data);

  // ✅ NEW: correct participant count display
  const participantsCount = useMemo(() => {
  if (!meeting) return 0;

  const dbCount = meeting.participants?.length ?? 0;
  if (dbCount > 0) return dbCount;

  const fromNotes = countParticipantsFromNotes(meeting.notes);
  if (fromNotes > 0) return fromNotes;

  // ✅ Org meetings: participants list isn't stored, so don't show misleading 0
  if (meeting.visibility === "PUBLIC_ORG") return -1; // special flag

  return 0;
}, [meeting]);

  async function saveNotes() {
    setSavingNotes(true);
    setMsg(null);
    try {
      await api.patch(`/meetings/${meetingId}/notes`, { notes });
      setMsg("Notes saved ✅");
      setEditMode(false);
      await meetingsQ.refetch();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Save notes failed ❌");
    } finally {
      setSavingNotes(false);
    }
  }

  async function generateMinutes() {
    setGenerating(true);
    setMsg(null);
    try {
      await api.post(`/meetings/${meetingId}/minutes/generate`);
      setMsg("Minutes generated ✅");
      await minutesQ.refetch();
      await meetingsQ.refetch();
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Generate failed ❌");
    } finally {
      setGenerating(false);
    }
  }

  async function downloadPdf() {
    setDownloading(true);
    setMsg(null);
    try {
      const res = await api.get(`/meetings/${meetingId}/minutes/pdf`, {
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const contentDisposition = res.headers?.["content-disposition"] as string | undefined;
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/i);
      const serverFilename = filenameMatch?.[1] ?? `meeting-${meetingId}-minutes.pdf`;

      const a = document.createElement("a");
      a.href = url;
      a.download = serverFilename;
      a.click();

      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "PDF download failed ❌");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Meeting Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Raw Notes (manual) → Generate Minutes (AI) → Download PDF
        </p>
      </div>

      <Card className="border-white/40 bg-white/75 shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-base">
                {meeting
                  ? meeting.title
                  : meetingsQ.isLoading
                  ? "Loading…"
                  : "Meeting"}
              </CardTitle>

              {meeting && (
                <p className="text-sm text-muted-foreground">
                  {meeting.description ?? "No description"} • 📅{" "}
                  {dayjs(meeting.dateTime).format("DD MMM YYYY, hh:mm A")} • 👥{" "}
                  {participantsCount === -1 ? "Org" : participantsCount}
                </p>
              )}
            </div>

            {meeting && (
              <div className="flex flex-wrap items-center gap-2">
                {canEditNotes && (
                  <Button
                    variant="outline"
                    onClick={() => nav(`/meetings/${meetingId}/edit`)}
                  >
                    Edit
                  </Button>
                )}

                <Badge variant="secondary">
                  {meeting.visibility === "PUBLIC_ORG" ? "Org" : "Private"}
                </Badge>
              </div>
            )}
          </div>

          {meetingsQ.isError && (
            <div className="text-sm text-red-600">
              Failed to load meeting list.{" "}
              <span className="text-muted-foreground">
                {(meetingsQ.error as any)?.response?.data?.message ??
                  (meetingsQ.error as any)?.message ??
                  ""}
              </span>
            </div>
          )}

          {!meetingsQ.isLoading && !meeting && (
            <div className="text-sm text-red-600">
              Meeting not found in your org.
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          <Separator />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium">Raw Notes (Manual)</div>

            {canEditNotes ? (
              <div className="flex flex-wrap gap-2">
                {!editMode ? (
                  <Button variant="outline" onClick={() => setEditMode(true)}>
                    Edit Notes
                  </Button>
                ) : (
                  <>
                    <Button onClick={saveNotes} disabled={savingNotes}>
                      {savingNotes ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditMode(false);
                        setNotes(meeting?.notes ?? "");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Only the creator can edit notes.
              </div>
            )}
          </div>

          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            readOnly={!editMode}
            placeholder="No notes yet…"
            className="min-h-[160px]"
          />

          <div className="space-y-2">
            <div className="font-medium">Minutes (AI Generated)</div>

            {minutesQ.isLoading ? (
              <div className="text-sm text-muted-foreground">
                Checking minutes…
              </div>
            ) : minutesAvailable ? (
              <div className="text-sm text-muted-foreground">
                Minutes available ✅ (preview below)
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Minutes not generated yet.
              </div>
            )}

            {minutesQ.isError && (
              <div className="text-sm text-red-600">
                Failed to fetch minutes.{" "}
                <span className="text-muted-foreground">
                  {(minutesQ.error as any)?.response?.data?.message ??
                    (minutesQ.error as any)?.message ??
                    ""}
                </span>
              </div>
            )}
          </div>

          {minutesAvailable && (
            <Textarea
              readOnly
              className="min-h-[220px]"
              value={
                minutesText || "Minutes exist but text could not be extracted."
              }
            />
          )}

          {msg && <div className="text-sm">{msg}</div>}

          <div className="flex flex-wrap gap-3">
            <Button onClick={generateMinutes} disabled={generating || !meetingId}>
              {generating
                ? "Generating..."
                : minutesAvailable
                ? "Regenerate Minutes"
                : "Generate Minutes"}
            </Button>

            {minutesAvailable && (
              <Button
                variant="outline"
                onClick={downloadPdf}
                disabled={downloading || !meetingId}
              >
                {downloading ? "Downloading..." : "Download PDF"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Notes: PATCH /meetings/:id/notes • Generate: POST
            /meetings/:id/minutes/generate • PDF: GET
            /meetings/:id/minutes/pdf
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
