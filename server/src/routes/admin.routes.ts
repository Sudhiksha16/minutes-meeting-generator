import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  approveUser,
  listPendingUsers,
  rejectUser,
  resetUserPassword
} from "../controllers/admin.controller";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users/pending", listPendingUsers);
router.patch("/users/:userId/approve", approveUser);
router.patch("/users/:userId/reject", rejectUser);
router.patch("/users/:userId/reset-password", resetUserPassword);

export default router;
