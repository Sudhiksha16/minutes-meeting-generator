import { Router } from "express";
import { createOrgAndAdmin, joinOrg, login } from "../controllers/auth.controller";

const router = Router();

router.post("/register/create-org", createOrgAndAdmin);
router.post("/register/join-org", joinOrg);
router.post("/login", login);

export default router;
