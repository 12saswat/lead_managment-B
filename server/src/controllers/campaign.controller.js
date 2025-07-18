import mongoose from "mongoose";
import { Campaign } from "../models/campaign.model.js";
import Lead from "../models/lead.model.js";
import sendEmail from "../utils/mailer.js";
import { sendSMS } from "../utils/sms.js";
import { getEmailTemplate } from "../templates/emil.template.js";

const createCampaign = async (req, res) => {
  try {
    const { leadIds, title, description, type, catagory, subject } = req.body;

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "At least one lead ID must be provided" },
      });
    }

    for (const id of leadIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          error: { message: `Invalid lead ID: ${id}` },
        });
      }
    }

    if (!title || !type || !description) {
      return res.status(400).json({
        success: false,
        message: "Title ,type and description are required.",
      });
    }
    const leads = await Lead.find({ _id: { $in: leadIds }, isDeleted: false });

    if (!leads || leads.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No valid leads found.",
      });
    }

    const campaign = await Campaign.create({
      title,
      subject,
      description,
      type,
      sentTo: leads.map((l) => l._id),
      catagory,
      createdBy: req.user._id,
    });

    for (const lead of leads) {
      lead.campaignSent = lead.campaignSent || [];
      lead.campaignSent.push(campaign._id);
      await lead.save();

      if (type === "mail" && lead.email) {
        await sendEmail({
          to: lead.email,
          subject: subject || "",
          html: getEmailTemplate({
            subject,
            description,
            leadName: lead.name,
          }),
        });
      } else if (type === "sms" && lead.phoneNumber) {
        // Send SMS only if phoneNumber exists
        await sendSMS(lead.phoneNumber, `${title}: ${description}`);
        console.log(`SMS sent to ${lead.phoneNumber}`);
      } else {
        console.log(`Skipped lead ${lead._id}: missing contact info.`);
      }
    }

    return res.status(201).json({
      success: true,
      message: `Campaign created and messages sent.`,
      data: campaign,
    });
  } catch (error) {
    console.error("Error creating campaign for one lead:", error);
    return res
      .status(500)
      .json({ success: false, message: "Internal server error" });
  }
};

const getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .populate({
        path: "sentTo",
        select: "name email phoneNumber isEmailOpened",
      });

    const formattedCampaigns = campaigns.map((campaign) => {
      const leads = campaign.sentTo || [];

      const totalLeads = leads.length;

      return {
        _id: campaign._id,
        title: campaign.title,
        description: campaign.description,
        type: campaign.type,
        subject: campaign.subject,
        category: campaign.category,
        totalLeads,
        // openRate: openRate.toFixed(2) + "%",
        createdAt: campaign.createdAt,
        leads: leads.map((lead) => ({
          _id: lead._id,
          name: lead.name,
          email: lead.email,
          phoneNumber: lead.phoneNumber,
        })),
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedCampaigns,
    });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const getCampaignById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    const campaign = await Campaign.findById(id).populate("sentTo");
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    const leads = campaign.sentTo;
    const totalSent = leads.length;

    return res.status(200).json({
      success: true,
      message: "Campaign details fetched successfully",
      data: {
        _id: campaign._id,
        title: campaign.title,
        description: campaign.description,
        type: campaign.type,
        subject: campaign.subject,
        catagory: campaign.category,
        createdBy: campaign.createdBy,
        createdAt: campaign.createdAt,
        totalLeadsSent: totalSent,
        leads: leads.map((lead) => ({
          _id: lead._id,
          name: lead.name,
          email: lead.email,
          phoneNumber: lead.phoneNumber,
          isEmailOpened: lead.isEmailOpened || false,
          emailOpenedAt: lead.emailOpenedAt || null,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

const deleteCampaign = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid campaign ID",
      });
    }

    const campaign = await Campaign.findByIdAndDelete(id);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: "Campaign not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting campaign:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export { createCampaign, getAllCampaigns, getCampaignById, deleteCampaign };
