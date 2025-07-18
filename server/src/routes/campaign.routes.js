import express from "express";
import checkAuth from "../middlewares/checkAuth.middleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.middleware.js";
import {
  createCampaign,
  deleteCampaign,
  getAllCampaigns,
  getCampaignById,
  sendCampaign,
  updateCampaign,
} from "../controllers/campaign.controller.js";

const campaignrouter = express.Router();

campaignrouter.post("/create", checkAuth, createCampaign);
campaignrouter.post("/send/:campaignId", checkAuth, sendCampaign);
campaignrouter.put("/update/:campaignId", checkAuth, updateCampaign);
campaignrouter.get("/all", checkAuth, getAllCampaigns);
campaignrouter.get("/:id", checkAuth, getCampaignById);
campaignrouter.delete("/delete/:id", checkAuth, deleteCampaign);

export default campaignrouter;
