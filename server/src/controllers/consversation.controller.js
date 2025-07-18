import Conversation from "../models/conversation.model.js";
import Lead from "../models/lead.model.js";
import mongoose from "mongoose";
import { Manager } from "../models/manager.model.js";
import { sendNotification } from "../utils/sendNotification.js";

const endConversation = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { notes, isProfitable } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lead ID" });
    }

    const updated = await Lead.findByIdAndUpdate(
      leadId,
      { notes, isProfitable },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    // Notify all managers
    // Fetch all managers
    const managers = await Manager.find({}, "_id");

    // Create a base notification payload
    const notificationPayload = {
      recipient: req.user._id,
      recipientType: req.user.role,
      title: "Conversation Ended",
      message: `A conversation has ended for lead "${updated.name}".`,
      type: "conversation_end",
      relatedTo: updated._id,
      relatedToType: "Lead",
    };

    // Send the same notification to all managers
    for (const manager of managers) {
      await sendNotification({
        ...notificationPayload,
        sentTo: manager._id,
      });
    }
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update Lead Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const createConversation = async (req, res) => {
  try {
    const { conclusion, isProfitable = null, followUpDate, date } = req.body;
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid lead ID" });
    }

    const conversation = new Conversation({
      lead: leadId,
      date: date ? new Date(date) : new Date(),
      addedBy: req.user._id,
      conclusion,
      isProfitable,
      followUpDate,
    });

    await conversation.save();

    await Lead.findByIdAndUpdate(leadId, {
      $push: {
        conversations: conversation._id,
        followUpDates: followUpDate,
      },
      $set: {
        lastContact: new Date(),
      },
    });

    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    console.error("Create Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllConversations = async (req, res) => {
  try {
    const user = req.user;
    const isManager = user?.role === "manager";

    const filter = {
      isDeleted: false,
    };

    if (!isManager) {
      filter.addedBy = user._id; // works if already ObjectId, which is usually true
    }

    const conversations = await Conversation.find(filter)
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error("Get All Conversations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getConversationsByLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(leadId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid lead ID",
      });
    }

    const lead = await Lead.findById(leadId).lean();
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found",
      });
    }

    const isManager = req.user?.role === "manager";

    const baseFilter = {
      _id: { $in: lead.conversations },
    };

    const workerFilter = {
      ...baseFilter,
      isDeleted: false,
      addedBy: req.user._id,
    };

    const finalFilter = isManager ? baseFilter : workerFilter;

    const conversations = await Conversation.find(finalFilter)
      .sort({ date: -1 })
      .lean();

    res.status(200).json({
      success: true,
      id: lead._id,
      followUpDates: lead.followUpDates,
      notes: lead.notes,
      data: conversations,
    });
  } catch (error) {
    console.error("Get Conversations Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

const getConversationsByWorker = async (req, res) => {
  try {
    const { workerId } = req.params;
    const loggedInUser = req.user;

    if (!mongoose.Types.ObjectId.isValid(workerId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid worker ID" });
    }

    const isManager = loggedInUser?.role === "manager";
    const isSelf = loggedInUser._id.toString() === workerId;

    // Only allow manager or the same worker
    if (!isManager && !isSelf) {
      return res
        .status(403)
        .json({ success: false, message: "Unauthorized access" });
    }

    const filter = {
      addedBy: workerId,
      isDeleted: false,
    };

    const conversations = await Conversation.find(filter)
      .sort({ date: -1 })
      .lean();

    res.status(200).json({ success: true, data: conversations });
  } catch (error) {
    console.error("Get Conversations By Worker Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { conclusion, isProfitable } = req.body;

    const updated = await Conversation.findByIdAndUpdate(
      id,
      { conclusion, isProfitable },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    // Fetch all managers
    const managers = await Manager.find({}, "_id");

    // Prepare base notification payload
    const notificationPayload = {
      recipient: req.user._id,
      recipientType: req.user.role,
      title: "Conversation Updated",
      message: `A conversation has been updated (ID: ${updated._id}).`,
      type: "update",
      relatedTo: updated._id,
      relatedToType: "Conversation",
    };

    // Send to each manager
    for (const manager of managers) {
      await sendNotification({
        ...notificationPayload,
        sentTo: manager._id,
      });
    }

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    const convo = await Conversation.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedBy: req.user._id },
      { new: true }
    );
    if (!convo) {
      return res
        .status(404)
        .json({ success: false, message: "Conversation not found" });
    }
    // Fetch all managers
    const managers = await Manager.find({}, "_id");

    // Prepare base notification payload
    const notificationPayload = {
      recipient: req.user._id,
      recipientType: req.user.role,
      title: "Conversation Updated",
      message: `A conversation has been deleted (ID: ${convo._id}).`,
      type: "delete",
      relatedTo: convo._id,
      relatedToType: "Conversation",
    };

    // Send to each manager
    for (const manager of managers) {
      await sendNotification({
        ...notificationPayload,
        sentTo: manager._id,
      });
    }
    res.status(200).json({ success: true, message: "Conversation deleted" });
  } catch (error) {
    console.error("Delete Conversation Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createConversation,
  getAllConversations,
  getConversationsByLead,
  getConversationsByWorker,
  endConversation,
  updateConversation,
  deleteConversation,
};
