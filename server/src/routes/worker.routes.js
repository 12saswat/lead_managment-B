import { Router } from "express";
import {
  loginWorker,
  registerWorker,
  resetPassword,
  sendOtp,
  verifyOtp,
  getWorkers,
} from "../controllers/worker.controller.js";
import checkAuth from "../middlewares/workerMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";

const router = Router();

//Worker Auth operations

router.post("/register", registerWorker);
router.post("/login", loginWorker);

// For forgot password
router.post("/forgot-password", sendOtp);
router.post("/verify-otp/:id", verifyOtp);
router.post("/reset-password/:id", resetPassword);
// get all workers
router.get("/get-all-workers", checkAuth, authorizeRoles("manager"), getWorkers);

export default router;
