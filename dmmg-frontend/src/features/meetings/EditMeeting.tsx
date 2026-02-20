import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Meeting = {
  id: string;
  title: string;
  description?: string | null;
  visibility: "PRIVATE" | "PUBLIC_ORG";
  dateTime: string;
  notes?: string | null;
};

export default function EditMeeting() {
  // ✅ IMPORTANT: your routes.tsx uses "/meetings/:id/edit"
  const { id } = useParams();
  const meetingId = useMemo(() => String(id ?? ""), [id]);

  const nav = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PRIVATE" | "PUBLIC_ORG">("PRIVATE");
  const [dateTime, setDateTime] = useState(""); // datetime-local value
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ Fetch meeting
  const meetingQ = useQuery({
    queryKey: ["meeting", meetingId],
    enabled: !!meetingId,
    retry: false,
    queryFn: async () => {
      const res = await api.get(`/meetings/${meetingId}`);
      return res.data.meeting as Meeting;
    },
  });

  // Prefill when data arrives
  useEffect(() => {
    if (!meetingQ.data) return;

    const m = meetingQ.data;
    setTitle(m.title ?? "");
    setDescription(m.description ?? "");
    setVisibility(m.visibility);
    setDateTime(dayjs(m.dateTime).format("YYYY-MM-DDTHH:mm"));
    setNotes(m.notes ?? "");
  }, [meetingQ.data]);

  async function onSave({ alsoGenerate }: { alsoGenerate: boolean }) {
    if (!meetingId) return;

    setLoading(true);
    setMsg(null);

    try {
      // ✅ Update meeting
      await api.patch(`/meetings/${meetingId}`, {
        title: title.trim(),
        description: description.trim(),
        visibility,
        dateTime: dateTime ? new Date(dateTime).toISOString() : undefined,
        notes,
      });

      // ✅ OPTIONAL: regenerate minutes right after saving (so minutes reflects edits)
      if (alsoGenerate) {
        await api.post(`/meetings/${meetingId}/minutes/generate`);
      }

      setMsg(alsoGenerate ? "Saved + Minutes regenerated ✅" : "Meeting updated ✅");

      // back to details
      setTimeout(() => {
        nav(`/meetings/${meetingId}`);
      }, 500);
    } catch (e: any) {
      setMsg(e?.response?.data?.message ?? e?.message ?? "Update failed ❌");
    } finally {
      setLoading(false);
    }
  }

  if (meetingQ.isLoading) return <div className="p-6">Loading meeting…</div>;

  if (meetingQ.isError) {
    return (
      <div className="p-6">
        <div className="text-red-600 font-medium">Failed to load meeting</div>
        <div className="text-sm text-muted-foreground">
          {(meetingQ.error as any)?.response?.data?.message ??
            (meetingQ.error as any)?.message ??
            ""}
        </div>
        <div className="mt-4">
          <Button variant="outline" onClick={() => nav(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid place-items-center py-10">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Edit Meeting</CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRIVATE">Private</SelectItem>
                <SelectItem value="PUBLIC_ORG">Org</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date & Time</Label>
            <Input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Raw Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[160px]"
            />
            <p className="text-xs text-muted-foreground">
              If you want minutes to reflect changes, click “Save + Regenerate Minutes”.
            </p>
          </div>

          {msg && (
            <div className={`text-sm ${msg.includes("❌") ? "text-red-600" : "text-green-600"}`}>
              {msg}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onSave({ alsoGenerate: false })} disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>

            <Button
              variant="secondary"
              onClick={() => onSave({ alsoGenerate: true })}
              disabled={loading}
            >
              {loading ? "Working..." : "Save + Regenerate Minutes"}
            </Button>

            <Button variant="outline" onClick={() => nav(-1)} disabled={loading}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
