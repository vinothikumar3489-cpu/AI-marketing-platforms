import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { collectEvidenceHandler, getEvidenceHandler } from "./evidence.controller.js";

const router = Router();

router.post("/:chatId/evidence/collect", requireAuth, collectEvidenceHandler);
router.get("/:chatId/evidence", requireAuth, getEvidenceHandler);

export { router as evidenceRouter };
