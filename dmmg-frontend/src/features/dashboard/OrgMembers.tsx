import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "@/lib/api";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OrgMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
};

type Meeting = {
  id: string;
  title: string;
  dateTime: string;
  createdBy: string;
  visibility: "PRIVATE" | "PUBLIC_ORG";
  participants?: { userId: string }[];
};

type MemberWithStats = {
  member: OrgMember;
  createdCount: number;
  privateParticipantCount: number;
  totalMeetingCount: number;
  lastMeetingAt: string | null;
  lastMeetingTitle: string;
};

export default function OrgMembers() {
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setMsg(null);
      try {
        const [membersRes, meetingsRes] = await Promise.all([
          api.get<{ users: OrgMember[] }>("/orgs/my/members"),
          api.get<{ meetings: Meeting[] }>("/meetings"),
        ]);

        setMembers(membersRes.data?.users ?? []);
        setMeetings(meetingsRes.data?.meetings ?? []);
      } catch (e: any) {
        setMsg(e?.response?.data?.message ?? e?.message ?? "Failed to load org members");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const publicOrgMeetingCount = useMemo(() => {
    return meetings.filter((meeting) => meeting.visibility === "PUBLIC_ORG").length;
  }, [meetings]);

  const rows = useMemo<MemberWithStats[]>(() => {
    return members.map((member) => {
      const createdMeetings = meetings.filter((meeting) => meeting.createdBy === member.id);
      const privateParticipantMeetings = meetings.filter((meeting) => {
        if (meeting.visibility !== "PRIVATE") return false;
        return (meeting.participants ?? []).some((participant) => participant.userId === member.id);
      });

      const relatedMeetings = meetings.filter((meeting) => {
        if (meeting.visibility === "PUBLIC_ORG") return true;
        if (meeting.createdBy === member.id) return true;
        return (meeting.participants ?? []).some((participant) => participant.userId === member.id);
      });

      const latestMeeting = relatedMeetings
        .slice()
        .sort((a, b) => dayjs(b.dateTime).valueOf() - dayjs(a.dateTime).valueOf())[0];

      return {
        member,
        createdCount: createdMeetings.length,
        privateParticipantCount: privateParticipantMeetings.length,
        totalMeetingCount: relatedMeetings.length,
        lastMeetingAt: latestMeeting?.dateTime ?? null,
        lastMeetingTitle: latestMeeting?.title ?? "-",
      };
    });
  }, [members, meetings]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">Org Members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Member details with designation and meeting summary.
          </p>
        </div>
        <Badge variant="secondary">{members.length} Members</Badge>
      </div>

      <Card className="border-white/40 bg-white/75 shadow-lg backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-base">
            Members Overview
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Org Meetings: {publicOrgMeetingCount}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading...</div>
          ) : msg ? (
            <div className="text-sm text-red-600">{msg}</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">No members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[980px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>S.No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created Meetings</TableHead>
                    <TableHead>Private Joined</TableHead>
                    <TableHead>Total Meetings</TableHead>
                    <TableHead>Last Meeting</TableHead>
                    <TableHead>Last Meeting Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.member.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.member.name}</TableCell>
                      <TableCell className="text-muted-foreground">{row.member.email}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{row.member.role}</Badge>
                      </TableCell>
                      <TableCell>{row.member.status ?? "ACTIVE"}</TableCell>
                      <TableCell>{row.createdCount}</TableCell>
                      <TableCell>{row.privateParticipantCount}</TableCell>
                      <TableCell>{row.totalMeetingCount}</TableCell>
                      <TableCell className="max-w-[220px] truncate">{row.lastMeetingTitle}</TableCell>
                      <TableCell>
                        {row.lastMeetingAt
                          ? dayjs(row.lastMeetingAt).format("DD MMM YYYY, hh:mm A")
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
