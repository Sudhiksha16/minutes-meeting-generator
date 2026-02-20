import { prisma } from "../utils/prisma";

export async function createMeeting(req: any, res: any) {
  try {
    const { title, description, visibility, dateTime, participantIds, notes } = req.body;

    if (!title || !visibility || !dateTime) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const orgId = req.user.orgId;
    const userId = req.user.userId;

    const meeting = await prisma.meeting.create({
      data: {
        orgId,
        createdBy: userId,
        title,
        description,
        visibility,
        dateTime: new Date(dateTime),

        // ✅ store notes directly on create
        notes: typeof notes === "string" ? notes : undefined,

        participants:
          visibility === "PRIVATE"
            ? {
                create: (participantIds ?? []).map((id: string) => ({
                  userId: id,
                })),
              }
            : undefined,
      },
      include: {
        participants: true,
      },
    });

    return res.status(201).json({ message: "Meeting created", meeting });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function listMeetings(req: any, res: any) {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.userId;

    const meetings = await prisma.meeting.findMany({
      where: {
        orgId,
        OR: [
          { visibility: "PUBLIC_ORG" },
          { visibility: "PRIVATE", createdBy: userId },
          {
            visibility: "PRIVATE",
            participants: {
              some: { userId },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        participants: true,
      },
    });

    return res.json({ meetings });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

/**
 * ✅ DELETE MEETING (Only creator can delete)
 * Deletes minutes + participants safely then meeting.
 */
export async function deleteMeeting(req: any, res: any) {
  try {
    const meetingId = req.params.meetingId as string;
    const orgId = req.user.orgId as string;
    const userId = req.user.userId as string;

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, orgId },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    if (meeting.createdBy !== userId) {
      return res.status(403).json({ message: "Not allowed to delete this meeting" });
    }

    // delete children first
    await prisma.meetingMinutes.deleteMany({ where: { meetingId } });
    await prisma.meetingParticipant.deleteMany({ where: { meetingId } });

    await prisma.meeting.delete({ where: { id: meetingId } });

    return res.json({ message: "Meeting deleted successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Failed to delete meeting" });
  }
}

export async function getMeeting(req: any, res: any) {
  try {
    const meetingId = req.params.meetingId as string;
    const orgId = req.user.orgId as string;
    const userId = req.user.userId as string;

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, orgId },
      include: { participants: true },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });

    // visibility rules: org meetings ok, private only creator/participant
    if (meeting.visibility !== "PUBLIC_ORG") {
      const isCreator = meeting.createdBy === userId;
      const isParticipant = (meeting.participants || []).some((p: any) => p.userId === userId);
      if (!isCreator && !isParticipant) {
        return res.status(403).json({ message: "Not allowed" });
      }
    }

    return res.json({ meeting });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

export async function updateMeeting(req: any, res: any) {
  try {
    const meetingId = req.params.meetingId as string;
    const orgId = req.user.orgId as string;
    const userId = req.user.userId as string;

    const meeting = await prisma.meeting.findFirst({
      where: { id: meetingId, orgId },
    });

    if (!meeting) return res.status(404).json({ message: "Meeting not found" });
    if (meeting.createdBy !== userId) {
      return res.status(403).json({ message: "Only creator can edit" });
    }

    const { title, description, visibility, dateTime, notes } = req.body;

    const updated = await prisma.meeting.update({
      where: { id: meetingId },
      data: {
        title: typeof title === "string" ? title : undefined,
        description: typeof description === "string" ? description : undefined,
        visibility: visibility === "PRIVATE" || visibility === "PUBLIC_ORG" ? visibility : undefined,
        dateTime: dateTime ? new Date(dateTime) : undefined,
        notes: typeof notes === "string" ? notes : undefined,
      },
      include: { participants: true },
    });

    return res.json({ message: "Meeting updated", meeting: updated });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || "Server error" });
  }
}

