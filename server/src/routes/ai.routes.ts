import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateMinutesAI } from "../controllers/ai.controller";

const router = Router();

router.post("/minutes", requireAuth, generateMinutesAI);

export default router;
