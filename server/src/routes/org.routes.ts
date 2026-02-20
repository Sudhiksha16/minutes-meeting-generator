import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  listPublicOrgs,
  joinOrg,
  getPendingMembers,
  approveMember,
  rejectMember,
} from "../controllers/org.controller";

const router = Router();

// public
router.get("/public", listPublicOrgs);

// join org
router.post("/:orgId/join", requireAuth, joinOrg);

// admin approval routes
router.get("/:orgId/pending", requireAuth, requireAdmin, getPendingMembers);
router.patch("/:orgId/approve/:userId", requireAuth, requireAdmin, approveMember);
router.patch("/:orgId/reject/:userId", requireAuth, requireAdmin, rejectMember);

export default router;
