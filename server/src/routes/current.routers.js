import express from "express";
import checkAuth from "../middlewares/checkAuth.middleware.js";
import { userName } from "../controllers/currentUser.controller.js";

const router = express.Router();

router.get("/current", checkAuth, userName);

export default router;
