import express from "express";
import {
  createLead,
  getAllLeads,
  getLeadById,
  updateLeadById,
  deleteLead,
  bulkUploadLeads,
} from "../controllers/lead.controller.js";
import { assignedTo } from "../controllers/assignedTo.controller.js";
import checkAuth from "../middlewares/checkAuth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import { xlUpload } from "../middlewares/xlMulter.middleware.js";

const leadRouter = express.Router();

leadRouter.post(
  "/createlead",
  upload.array("documents", 5),
  checkAuth,
  createLead
);

leadRouter.get("/getalllead", checkAuth, getAllLeads);
leadRouter.get("/getlead/:id", checkAuth, getLeadById);
leadRouter.put(
  "/updateleads/:id",
  upload.array("documents", 5),
  checkAuth,
  updateLeadById
);
leadRouter.delete("/deletelead/:id", checkAuth, deleteLead);
leadRouter.post(
  "/:id/assign",
  checkAuth,
  authorizeRoles("manager"),
  assignedTo
);

leadRouter.post(
  "/bulk-upload",
  checkAuth,
  xlUpload.single("file"),
  bulkUploadLeads
);

export default leadRouter;
