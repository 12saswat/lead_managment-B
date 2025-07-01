import { Router } from "express";
import {
  loginWorker,
  registerWorker,
} from "../controllers/worker.controller.js";

const router = Router();

//Worker Auth operations

router.post("/register", registerWorker);
router.post("/login", loginWorker);

export default router;
