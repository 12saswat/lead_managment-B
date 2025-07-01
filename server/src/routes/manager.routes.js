import express from "express";
import { loginManager } from "../controllers/manager.controller.js";

const managerRouter = express.Router();

managerRouter.post("/login", loginManager);

export default managerRouter;
