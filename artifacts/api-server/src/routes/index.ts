import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import donationsRouter from "./donations";
import usersRouter from "./users";
import analyticsRouter from "./analytics";
import auditRouter from "./audit";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(donationsRouter);
router.use(usersRouter);
router.use(analyticsRouter);
router.use(auditRouter);

export default router;
