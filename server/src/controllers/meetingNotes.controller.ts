import { prisma } from "../utils/prisma";

// PATCH /meetings/:meetingId/notes
export async function updateMeetingNotes(req: any, res: any) {
  try {
    const meetingId = String(req.params.meetingId);
    const orgId = String(req.user.orgId);
    const userId = String(req.user.userId);
    const role = String(req.user.role ?? "");
    const isAdmin = role === "ADMIN";

    const notesRaw = req.body?.notes;
    if (typeof notesRaw !== "string" || notesRaw.trim().length === 0) {
      return res.status(400).json({ message: "notes is required (string)" });
    }

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, orgId },
      include: { participants: true },
    });

    if (!meeting) {
      return res.status(404).json({ message: "Meeting not found" });
    }

    const isCreator = meeting.createdBy === userId;
    const isParticipant = meeting.participants.some((p) => p.userId === userId);

    // Creator/participant/admin can update notes
    if (!isCreator && !isParticipant && !isAdmin) {
      return res.status(403).json({ message: "Not allowed to update notes for this meeting" });
    }

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: { notes: notesRaw },
      select: { id: true, title: true, notes: true },
    });

    return res.json({ message: "Notes updated", meeting: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err?.message || "Failed to update notes" });
  }
}
