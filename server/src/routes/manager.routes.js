import express from "express";
import {
  loginManager,
  resetPASS,
  sendOTP,
  verifyOTP,
} from "../controllers/manager.controller.js";
import checkAuth from "../middlewares/checkAuth.middleware.js";
import { getDashboardData } from "../controllers/currentUser.controller.js";
// import { loginManager } from "../controllers/manager.controller.js";

const managerRouter = express.Router();

managerRouter.post("/login", loginManager);
managerRouter.post("/forgot-manager", sendOTP);
managerRouter.post("/verify/:id", verifyOTP);
managerRouter.post("/reset/:id", resetPASS);

managerRouter.get("/dashboard", checkAuth, getDashboardData);

export default managerRouter;
