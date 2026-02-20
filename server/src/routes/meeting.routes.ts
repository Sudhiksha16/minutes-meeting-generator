import { Router } from "express";
import { requireAuth } from "../middleware/auth";

import {
  createMeeting,
  listMeetings,
  deleteMeeting,
  getMeeting,
  updateMeeting,
} from "../controllers/meeting.controller";

import {
  generateAndSaveMinutes,
  getMinutes,
} from "../controllers/minutes.controller";

import { updateMeetingNotes } from "../controllers/meetingNotes.controller";
import { downloadMinutesPdf } from "../controllers/pdf.controller";
import { suggestMeetingMeta } from "../controllers/meetingAI.controller";

const router = Router();

// Meetings
router.post("/", requireAuth, createMeeting);
router.get("/", requireAuth, listMeetings);

// ✅ Single meeting fetch (for Edit page preload)
router.get("/:meetingId", requireAuth, getMeeting);

// ✅ Full update (for Edit page save)
router.patch("/:meetingId", requireAuth, updateMeeting);

// ✅ Delete meeting (only creator)
router.delete("/:meetingId", requireAuth, deleteMeeting);

// Notes (raw notes edit)
router.patch("/:meetingId/notes", requireAuth, updateMeetingNotes);

// Minutes
router.post("/:meetingId/minutes/generate", requireAuth, generateAndSaveMinutes);
router.get("/:meetingId/minutes", requireAuth, getMinutes);
router.get("/:meetingId/minutes/pdf", requireAuth, downloadMinutesPdf);
router.post("/ai/suggest", requireAuth, suggestMeetingMeta);

export default router;
