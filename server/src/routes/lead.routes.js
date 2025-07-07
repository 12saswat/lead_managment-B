import express from "express";
import { createLead, getAllLeads,getLeadById,updateLeadById , deleteLead} from "../controllers/lead.controller.js";
import checkAuth  from "../middlewares/checkAuth.middleware.js";
import  authorizeRoles  from "../middlewares/authorizeRoles.middleware.js";
import {upload} from "../middlewares/multer.middleware.js";

const leadRouter = express.Router();


leadRouter.post("/createlead",upload.array("documents", 5),checkAuth, createLead);

leadRouter.get("/getalllead",checkAuth, getAllLeads);
leadRouter.get("/getlead/:id",checkAuth, getLeadById);
leadRouter.put("/updateleads/:id",checkAuth,authorizeRoles("manager"), updateLeadById); 
leadRouter.delete("/deletelead/:id",checkAuth,authorizeRoles("manager"), deleteLead); 

export default leadRouter ;