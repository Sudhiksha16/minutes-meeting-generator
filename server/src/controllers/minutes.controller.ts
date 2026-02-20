import { prisma } from "../utils/prisma";
import { smartFallback } from "../utils/aiMinutes";
import { generateMinutesOpenAI } from "../utils/aiMinutesOpenAI";

/**
 * Checks if user can view meeting based on:
 * - org isolation
 * - PUBLIC_ORG vs PRIVATE
 * - creator / participant visibility
 */
async function canViewMeeting(params: {
  meetingId: string;
  orgId: string;
  userId: string;
}) {
  const { meetingId, orgId, userId } = params;

  const meeting = await prisma.meeting.findFirst({
    where: { id: meetingId, orgId },
    include: {
      participants: {
        include: {
          user: true, // ✅ so we can get user name/email
        },
      },
    },
  });

  if (!meeting) return { ok: false, meeting: null as any };

  if (meeting.visibility === "PUBLIC_ORG") {
    return { ok: true, meeting };
  }

  const isCreator = meeting.createdBy === userId;
  const isParticipant = (meeting.participants || []).some(
    (p: any) => p.userId === userId
  );

  return { ok: isCreator || isParticipant, meeting };
}

function stripSectionsForKeyDiscussion(notes: string): string {
  let out = notes || "";

  // remove Decisions section (header + its lines) anywhere
  out = out.replace(/\n?\s*Decisions:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");

  // remove Action Items section (header + its lines) anywhere
  out = out.replace(/\n?\s*Action Items:\s*[\s\S]*?(?=\n\s*\n|$)/gi, "");

  return out.replace(/\n{3,}/g, "\n\n").trim();
}


/** ✅ Parse participants from notes line: "Participants: A, B" */
function extractParticipantsFromNotes(n: string): string[] {
  const m = (n || "").match(/Participants:\s*(.*)/i);
  if (!m?.[1]) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

/** ✅ Remove "Attendees:" line from MOM output (AI sometimes adds it) */
function stripAttendeesLine(mom: string) {
  return (mom || "")
    .replace(/^\s*Attendees:\s*.*\n?/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// POST /meetings/:meetingId/minutes/generate
export async function generateAndSaveMinutes(req: any, res: any) {
  try {
    const meetingId = req.params.meetingId as string;
    const orgId = req.user.orgId as string;
    const userId = req.user.userId as string;

    const access = await canViewMeeting({ meetingId, orgId, userId });

    if (!access.meeting)
      return res.status(404).json({ message: "Meeting not found" });
    if (!access.ok)
      return res
        .status(403)
        .json({ message: "Not allowed to access this meeting" });

    const meeting = access.meeting;

    // notes from meeting.notes or description
    const notes = meeting.notes || meeting.description || "";

    // ✅ participants from DB
    const participantsFromDb = (meeting.participants || []).map((p: any) => {
      return p.user?.name || p.user?.email || p.userId;
    });

    // ✅ if DB empty, fallback to notes "Participants:" line
    const participants = participantsFromDb.length
      ? participantsFromDb
      : extractParticipantsFromNotes(notes);

    let ai: any;

    try {
      // ✅ Real AI attempt first
      ai = await generateMinutesOpenAI({
        title: meeting.title,
        description: meeting.description || "",
        notes,
        participants,
      });
      ai.fallback = false;
      ai.note = "openai";
    } catch (e) {
      // ✅ If OpenAI fails, use smart fallback but STILL pass participants
      const fb = smartFallback(
        meeting.title,
        meeting.description || "",
        notes,
        participants
      );
      ai = { ...fb, fallback: true, note: "fallback-smart" };
    }

    // ✅ prevent duplicated sections: if fallback, make Key Discussion clean
    if (ai?.fallback && typeof ai?.mom === "string") {
      // rebuild ONLY the Key Discussion part cleanly (simple safe approach)
      const cleanedNotes = stripSectionsForKeyDiscussion(notes);

      ai.mom = ai.mom.replace(
        /Key Discussion:\s*[\s\S]*?\n\s*\nDecisions:/i,
        `Key Discussion:\n${cleanedNotes}\n\nDecisions:`
      );
    }

    // ✅ Always strip "Attendees:" before saving (AI may include it)
    ai.mom = stripAttendeesLine(ai.mom);

    const saved = await prisma.meetingMinutes.upsert({
      where: { meetingId },
      update: {
        orgId,
        generatedBy: userId,
        mom: ai.mom,
        decisions: ai.decisions,
        actionItems: ai.actionItems,
        tags: ai.tags,
        isSensitive: ai.isSensitive,
        sensitivityReason: ai.sensitivityReason,
      },
      create: {
        meetingId,
        orgId,
        generatedBy: userId,
        mom: ai.mom,
        decisions: ai.decisions,
        actionItems: ai.actionItems,
        tags: ai.tags,
        isSensitive: ai.isSensitive,
        sensitivityReason: ai.sensitivityReason,
      },
    });

    return res.json({
      message: "Minutes generated & saved",
      minutes: saved,
      aiMeta: { fallback: ai.fallback, note: ai.note },
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to generate minutes" });
  }
}

// GET /meetings/:meetingId/minutes
export async function getMinutes(req: any, res: any) {
  try {
    const meetingId = req.params.meetingId as string;
    const orgId = req.user.orgId as string;
    const userId = req.user.userId as string;

    const access = await canViewMeeting({ meetingId, orgId, userId });

    if (!access.meeting)
      return res.status(404).json({ message: "Meeting not found" });
    if (!access.ok)
      return res
        .status(403)
        .json({ message: "Not allowed to access this meeting" });

    const minutes = await prisma.meetingMinutes.findUnique({
      where: { meetingId },
    });
    if (!minutes)
      return res.status(404).json({ message: "Minutes not generated yet" });

    return res.json({ minutes });
  } catch (err: any) {
    return res
      .status(500)
      .json({ message: err.message || "Failed to fetch minutes" });
  }
}
