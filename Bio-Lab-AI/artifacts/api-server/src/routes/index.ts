import { Router, type IRouter } from "express";
import healthRouter from "./health";
import experimentsRouter from "./experiments";
import geminiRouter from "./gemini";
import adminRouter from "./admin";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(healthRouter);
router.use(requireAuth);
router.use(experimentsRouter);
router.use(geminiRouter);
router.use(adminRouter);

export default router;
