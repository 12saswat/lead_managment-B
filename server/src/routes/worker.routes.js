import { Router } from "express";
import {
  loginWorker,
  registerWroker,
} from "../controllers/worker.controller.js";

const router = Router();

//Worker Auth operations

router.post("/register", registerWroker);
router.post("/login", loginWorker);

export default router;
